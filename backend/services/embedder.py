import hashlib
import logging
from threading import Lock
from typing import Any

import numpy as np

from core.config import settings


logger = logging.getLogger("guidely.embedder")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False

try:
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover - dependency is declared in requirements.txt
    SentenceTransformer = None  # type: ignore[assignment]


_embedding_cache: dict[str, np.ndarray] = {}
_model: Any | None = None
_model_lock = Lock()
_encode_lock = Lock()
_cache_lock = Lock()


def hash_text(text: str) -> str:
    """Return the stable SHA-256 key used by the embedding cache."""

    return hashlib.sha256(str(text).encode("utf-8")).hexdigest()


def _get_model() -> Any:
    global _model

    if _model is None:
        with _model_lock:
            if _model is None:
                if SentenceTransformer is None:
                    raise RuntimeError(
                        "sentence-transformers is required for local embeddings; "
                        "install backend/requirements.txt"
                    )
                _model = SentenceTransformer(settings.embedding_model)
    return _model


def _matrix(vectors: Any, expected_rows: int) -> np.ndarray:
    array = np.asarray(vectors, dtype=np.float32)
    if array.ndim == 1:
        array = array.reshape(1, -1)
    if array.ndim != 2 or array.shape[0] != expected_rows:
        raise ValueError("embedding model returned an unexpected vector shape")
    if array.shape[1] == 0:
        raise ValueError("embedding model returned empty vectors")
    return array


def embed_texts_with_cache_status(
    texts: list[str],
) -> tuple[list[list[float]], list[bool]]:
    """Embed texts in order and report whether each vector came from cache.

    Duplicate texts in one batch share one model call. Vectors are normalized
    by the model where supported so they can be used directly with FAISS inner
    product search.
    """

    normalized_texts = [str(text) for text in texts]
    if not normalized_texts:
        return [], []

    hashes = [hash_text(text) for text in normalized_texts]
    with _cache_lock:
        cached = {text_hash: _embedding_cache.get(text_hash) for text_hash in hashes}

    missing_hashes = []
    seen_missing: set[str] = set()
    for text_hash in hashes:
        if cached[text_hash] is None and text_hash not in seen_missing:
            missing_hashes.append(text_hash)
            seen_missing.add(text_hash)

    if missing_hashes:
        missing_texts = [
            normalized_texts[hashes.index(text_hash)] for text_hash in missing_hashes
        ]
        model = _get_model()
        try:
            with _encode_lock:
                try:
                    encoded = model.encode(
                        missing_texts,
                        batch_size=64,
                        convert_to_numpy=True,
                        normalize_embeddings=True,
                        show_progress_bar=False,
                    )
                except TypeError:
                    # Lightweight test doubles and older model versions may not
                    # accept all encode options.
                    encoded = model.encode(missing_texts)
        except Exception as exc:
            raise RuntimeError("local embedding model failed") from exc

        matrix = _matrix(encoded, len(missing_texts))
        with _cache_lock:
            for text_hash, vector in zip(missing_hashes, matrix):
                _embedding_cache.setdefault(text_hash, vector.copy())

    with _cache_lock:
        vectors = [_embedding_cache[text_hash].copy() for text_hash in hashes]

    cache_statuses = [cached[text_hash] is not None for text_hash in hashes]
    miss_count = len(missing_hashes)
    if miss_count:
        logger.info("embedding_cache_miss count=%d model=%s", miss_count, settings.embedding_model)
    if cache_statuses and all(cache_statuses):
        logger.info("embedding_cache_hit count=%d", len(cache_statuses))

    return ([vector.tolist() for vector in vectors], cache_statuses)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Return embeddings for a batch of texts, reusing cached vectors."""

    vectors, _ = embed_texts_with_cache_status(texts)
    return vectors


def embed_query(query: str) -> list[float]:
    """Return one normalized query embedding."""

    return embed_texts([query])[0]


def get_cached_vector(text_or_hash: str) -> list[float] | None:
    """Return a cached vector by text or SHA-256 hash, if present."""

    key = text_or_hash if len(text_or_hash) == 64 else hash_text(text_or_hash)
    with _cache_lock:
        vector = _embedding_cache.get(key)
        return None if vector is None else vector.copy().tolist()


def is_cached(text_or_hash: str) -> bool:
    key = text_or_hash if len(text_or_hash) == 64 else hash_text(text_or_hash)
    with _cache_lock:
        return key in _embedding_cache


def clear_cache() -> None:
    """Clear cached embeddings; primarily useful for tests and maintenance."""

    with _cache_lock:
        _embedding_cache.clear()


def cache_stats() -> dict[str, int]:
    with _cache_lock:
        return {"entries": len(_embedding_cache)}
