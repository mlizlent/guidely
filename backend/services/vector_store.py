import json
from threading import Lock

import faiss
import numpy as np

from core.config import settings
from services.chunker import RawChunk
from services.embedder import embed_texts

_lock = Lock()

_index: faiss.Index | None = None
_metadata: dict[str, dict] = {}   # chunk_id -> chunk record
_id_order: list[str] = []          # faiss row index -> chunk_id
_EMBEDDING_DIM = 1536               # matches text-embedding-3-small


def _load() -> None:
    global _index, _metadata, _id_order

    if settings.faiss_index_path.exists():
        _index = faiss.read_index(str(settings.faiss_index_path))
    else:
        _index = faiss.IndexFlatIP(_EMBEDDING_DIM)

    if settings.metadata_path.exists():
        with open(settings.metadata_path, "r", encoding="utf-8") as f:
            saved = json.load(f)
        _metadata = saved.get("chunks", {})
        _id_order = saved.get("id_order", [])
    else:
        _metadata = {}
        _id_order = []


def _persist() -> None:
    faiss.write_index(_index, str(settings.faiss_index_path))
    with open(settings.metadata_path, "w", encoding="utf-8") as f:
        json.dump({"chunks": _metadata, "id_order": _id_order}, f, indent=2, default=str)


def _ensure_loaded() -> None:
    if _index is None:
        _load()


def _normalize(vectors: list[list[float]]) -> np.ndarray:
    arr = np.array(vectors, dtype="float32")
    faiss.normalize_L2(arr)
    return arr


def existing_hashes_for_doc(doc_id: str) -> set[str]:
    _ensure_loaded()
    return {c["hash"] for c in _metadata.values() if c["doc_id"] == doc_id}


def index_document(doc_id: str, file_name: str, raw_chunks: list[RawChunk]) -> tuple[int, int]:
    """Embeds and stores only chunks whose hash isn't already present for this
    document, and removes stale chunks that no longer appear in the new text.
    Returns (chunks_embedded, chunks_reused)."""
    _ensure_loaded()
    with _lock:
        existing = existing_hashes_for_doc(doc_id)

        new_hashes = {c.hash for c in raw_chunks}
        stale_ids = [
            cid for cid, c in _metadata.items()
            if c["doc_id"] == doc_id and c["hash"] not in new_hashes
        ]
        for cid in stale_ids:
            del _metadata[cid]
            if cid in _id_order:
                _id_order.remove(cid)
        if stale_ids:
            _rebuild_index_locked()

        to_embed = [c for c in raw_chunks if c.hash not in existing]
        reused = len(raw_chunks) - len(to_embed)

        if to_embed:
            vectors = embed_texts([c.text for c in to_embed])
            arr = _normalize(vectors)
            _index.add(arr)
            for chunk in to_embed:
                chunk_id = f"{doc_id}_{chunk.hash[:10]}"
                _metadata[chunk_id] = {
                    "chunk_id": chunk_id,
                    "doc_id": doc_id,
                    "file_name": file_name,
                    "section": chunk.section,
                    "text": chunk.text,
                    "hash": chunk.hash,
                }
                _id_order.append(chunk_id)

        _persist()
        return len(to_embed), reused


def _rebuild_index_locked() -> None:
    """FAISS flat indexes don't support row deletion, so removals trigger a
    full re-embed + rebuild. Fine at dev/demo scale; swap for IVF + delete
    support if the corpus grows large."""
    global _index
    _index = faiss.IndexFlatIP(_EMBEDDING_DIM)
    if not _id_order:
        return
    texts = [_metadata[cid]["text"] for cid in _id_order]
    vectors = embed_texts(texts)
    _index.add(_normalize(vectors))


def search(query_vector: list[float], top_k: int) -> list[tuple[dict, float]]:
    _ensure_loaded()
    if _index.ntotal == 0:
        return []
    arr = _normalize([query_vector])
    scores, indices = _index.search(arr, min(top_k, _index.ntotal))
    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(_id_order):
            continue
        chunk_id = _id_order[idx]
        results.append((_metadata[chunk_id], float(score)))
    return results


def delete_document(doc_id: str) -> None:
    _ensure_loaded()
    with _lock:
        ids = [cid for cid, c in _metadata.items() if c["doc_id"] == doc_id]
        for cid in ids:
            del _metadata[cid]
            if cid in _id_order:
                _id_order.remove(cid)
        _rebuild_index_locked()
        _persist()


def list_documents() -> dict[str, dict]:
    _ensure_loaded()
    docs: dict[str, dict] = {}
    for c in _metadata.values():
        doc = docs.setdefault(
            c["doc_id"], {"doc_id": c["doc_id"], "file_name": c["file_name"], "chunk_count": 0}
        )
        doc["chunk_count"] += 1
    return docs


def get_chunks_for_doc(doc_id: str) -> list[dict]:
    _ensure_loaded()
    return [c for c in _metadata.values() if c["doc_id"] == doc_id]


def stats() -> dict:
    _ensure_loaded()
    return {"documents": len(list_documents()), "chunks": len(_metadata)}