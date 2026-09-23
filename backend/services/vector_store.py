import hashlib
from threading import RLock
from typing import Any, Iterable

import faiss
import numpy as np

from services import embedder


_lock = RLock()
_index: faiss.IndexFlatIP | None = None
_metadata: dict[str, dict[str, Any]] = {}
_vectors: dict[str, np.ndarray] = {}
_id_order: list[str] = []
_embedding_dim: int | None = None


def _value(chunk: Any, key: str, default: Any = None) -> Any:
    if isinstance(chunk, dict):
        return chunk.get(key, default)
    return getattr(chunk, key, default)


def _chunk_text(chunk: Any) -> str:
    text = str(_value(chunk, "text", "") or "").strip()
    if not text:
        raise ValueError("chunks must contain non-empty text")
    return text


def _chunk_id(chunk: Any, doc_id: str, position: int) -> str:
    supplied = _value(chunk, "chunk_id")
    if supplied:
        return str(supplied)
    return f"{doc_id}_{position}"


def _normalize_vectors(vectors: Iterable[Any]) -> np.ndarray:
    matrix = np.asarray(list(vectors), dtype=np.float32)
    if matrix.ndim == 1:
        matrix = matrix.reshape(1, -1)
    if matrix.ndim != 2 or matrix.shape[0] == 0 or matrix.shape[1] == 0:
        raise ValueError("embedding vectors must be a non-empty two-dimensional matrix")
    faiss.normalize_L2(matrix)
    return matrix


def _ensure_index_locked(dimension: int) -> None:
    global _index, _embedding_dim

    if _embedding_dim is None:
        _embedding_dim = dimension
    elif _embedding_dim != dimension:
        raise ValueError(
            f"embedding dimension changed from {_embedding_dim} to {dimension}; "
            "the in-memory index must be reset"
        )

    if _index is None:
        _index = faiss.IndexFlatIP(_embedding_dim)


def _rebuild_index_locked() -> None:
    """Recreate the flat index from retained in-memory vectors after deletes."""

    global _index

    if _embedding_dim is None:
        _index = None
        return

    _index = faiss.IndexFlatIP(_embedding_dim)
    if not _id_order:
        return
    vectors = [_vectors[chunk_id] for chunk_id in _id_order]
    _index.add(_normalize_vectors(vectors))


def _remove_ids_locked(chunk_ids: Iterable[str]) -> None:
    remove_set = set(chunk_ids)
    if not remove_set:
        return
    for chunk_id in remove_set:
        _metadata.pop(chunk_id, None)
        _vectors.pop(chunk_id, None)
    _id_order[:] = [chunk_id for chunk_id in _id_order if chunk_id not in remove_set]


def existing_hashes_for_doc(doc_id: str) -> set[str]:
    """Return content hashes currently indexed for a document."""

    with _lock:
        return {
            str(record["hash"])
            for record in _metadata.values()
            if record.get("doc_id") == doc_id
        }


def _unique_chunk_id(base_id: str, protected_ids: set[str]) -> str:
    """Return an ID that cannot overwrite another retained chunk."""

    candidate = base_id
    suffix = 1
    while candidate in protected_ids:
        candidate = f"{base_id}_{suffix}"
        suffix += 1
    protected_ids.add(candidate)
    return candidate


def index_document(
    doc_id: str,
    file_name: str,
    chunks: list[dict[str, Any]],
) -> tuple[int, int]:
    """Index a document and return ``(new_chunks, reused_chunks)``.

    Chunks are matched by SHA-256 content hash. Unchanged chunks retain their
    vectors and metadata; stale chunks are removed and the FAISS index is
    rebuilt from vectors already held in memory. Embedding happens before any
    state mutation so a failed model call cannot leave a partial document.
    """

    if not doc_id:
        raise ValueError("doc_id must be non-empty")
    if not file_name:
        raise ValueError("file_name must be non-empty")

    prepared: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for position, chunk in enumerate(chunks):
        text = _chunk_text(chunk)
        base_id = _chunk_id(chunk, doc_id, position)
        candidate = base_id
        suffix = 1
        while candidate in seen_ids:
            candidate = f"{base_id}_{suffix}"
            suffix += 1
        seen_ids.add(candidate)
        prepared.append(
            {
                "chunk_id": candidate,
                "doc_id": doc_id,
                "file_name": file_name,
                "section": _value(chunk, "section", "General") or "General",
                "text": text,
                "hash": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            }
        )

    with _lock:
        existing = [
            record.copy()
            for record in _metadata.values()
            if record.get("doc_id") == doc_id
        ]
        existing_by_hash: dict[str, list[dict[str, Any]]] = {}
        for record in existing:
            hash_value = str(record.get("hash", ""))
            if hash_value:
                existing_by_hash.setdefault(hash_value, []).append(record)

        reused_matches: list[tuple[dict[str, Any], dict[str, Any]]] = []
        new_chunks: list[dict[str, Any]] = []
        for item in prepared:
            candidates = existing_by_hash.get(str(item["hash"]), [])
            if candidates:
                reused_matches.append((item, candidates.pop(0)))
            else:
                new_chunks.append(item)

        reused_old_ids = {
            str(old_record["chunk_id"]) for _, old_record in reused_matches
        }
        stale_ids = [
            str(record["chunk_id"])
            for record in existing
            if str(record["chunk_id"]) not in reused_old_ids
        ]

        protected_ids = set(_metadata) - set(stale_ids)
        for item in new_chunks:
            item["chunk_id"] = _unique_chunk_id(str(item["chunk_id"]), protected_ids)

    # Embed new vectors outside the lock to avoid blocking other
    # operations during model inference.
    matrix: np.ndarray | None = None
    if new_chunks:
        vectors = embedder.embed_texts([item["text"] for item in new_chunks])
        matrix = _normalize_vectors(vectors)

    with _lock:
        # Ensure index exists with correct dimension (fast, no model I/O).
        if matrix is not None:
            _ensure_index_locked(int(matrix.shape[1]))

        # Remove stale rows only after embedding and dimension checks succeed.
        _remove_ids_locked(stale_ids)

        for item, old_record in reused_matches:
            old_id = str(old_record["chunk_id"])
            old_record.update(
                {
                    "doc_id": doc_id,
                    "file_name": file_name,
                    "section": item["section"],
                    "text": item["text"],
                    "hash": item["hash"],
                }
            )
            _metadata[old_id] = old_record
            if old_id not in _id_order:
                _id_order.append(old_id)

        created_count = 0
        if matrix is not None:
            assert _index is not None
            _index.add(matrix)
            for item, vector in zip(new_chunks, matrix):
                chunk_id = str(item["chunk_id"])
                _vectors[chunk_id] = vector.copy()
                _metadata[chunk_id] = item.copy()
                _id_order.append(chunk_id)
                created_count += 1

        if stale_ids or (not prepared and existing):
            _rebuild_index_locked()

        return created_count, len(reused_matches)


def search(query_vector: list[float], top_k: int = 3) -> list[tuple[dict[str, Any], float]]:
    """Return the most similar indexed chunks and inner-product scores."""

    if top_k <= 0:
        return []

    with _lock:
        if _index is None or _index.ntotal == 0:
            return []
        if _embedding_dim is not None and len(query_vector) != _embedding_dim:
            raise ValueError(
                f"query embedding dimension {len(query_vector)} does not match "
                f"index dimension {_embedding_dim}"
            )

        query = _normalize_vectors([query_vector])
        scores, indices = _index.search(query, min(max(int(top_k), 1), _index.ntotal))
        results: list[tuple[dict[str, Any], float]] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(_id_order):
                continue
            chunk_id = _id_order[int(idx)]
            results.append((_metadata[chunk_id].copy(), float(score)))
        return results


def list_documents() -> dict[str, dict[str, Any]]:
    """Return document metadata keyed by document ID."""

    with _lock:
        documents: dict[str, dict[str, Any]] = {}
        for record in _metadata.values():
            doc_id = str(record["doc_id"])
            document = documents.setdefault(
                doc_id,
                {
                    "doc_id": doc_id,
                    "file_name": str(record["file_name"]),
                    "chunk_count": 0,
                },
            )
            document["chunk_count"] += 1
        return documents


def delete_document(doc_id: str) -> None:
    """Remove all chunks belonging to a document and rebuild the index."""

    with _lock:
        ids = [
            chunk_id
            for chunk_id, record in _metadata.items()
            if record.get("doc_id") == doc_id
        ]
        _remove_ids_locked(ids)
        _rebuild_index_locked()


def get_chunks_for_doc(doc_id: str) -> list[dict[str, Any]]:
    """Return metadata for all chunks belonging to a document."""

    with _lock:
        return [
            record.copy()
            for record in _metadata.values()
            if record.get("doc_id") == doc_id
        ]


def stats() -> dict[str, int]:
    """Return current catalog and active FAISS row counts."""

    with _lock:
        documents = list_documents()
        return {
            "documents": len(documents),
            "chunks": len(_metadata),
            "active_chunks": len(_metadata),
            "total_documents": len(documents),
        }


def reset() -> None:
    """Clear all in-memory index state; intended for tests and maintenance."""

    global _index, _embedding_dim

    with _lock:
        _metadata.clear()
        _vectors.clear()
        _id_order.clear()
        _index = None
        _embedding_dim = None
