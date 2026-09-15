import re
from typing import Any

from core.config import settings


_BOUNDARY_RE = re.compile(r"[\n.!?:;)]")


def _window_size() -> int:
    """Return a safe character window in the requested 500-1000 range."""

    configured = getattr(settings, "chunk_size_chars", None)
    if configured is None:  # pragma: no cover - compatibility with older config
        configured = getattr(settings, "chunk_size_tokens", 800)
    try:
        return max(500, min(1000, int(configured)))
    except (TypeError, ValueError):
        return 800


def _overlap_size(window_size: int) -> int:
    configured = getattr(settings, "chunk_overlap_chars", None)
    if configured is None:  # pragma: no cover - compatibility with older config
        configured = getattr(settings, "chunk_overlap_tokens", 100)
    try:
        return max(0, min(int(configured), window_size // 2))
    except (TypeError, ValueError):
        return min(100, window_size // 2)


def _find_boundary(text: str, start: int, preferred_end: int) -> int:
    """Choose a readable boundary near the end of a window."""

    search_start = start + max(1, (preferred_end - start) // 2)
    candidates = [
        match.end()
        for match in _BOUNDARY_RE.finditer(text, search_start, preferred_end + 1)
    ]
    if candidates:
        return candidates[-1]

    whitespace_positions = [
        match.end()
        for match in re.finditer(r"\s+", text[search_start:preferred_end])
    ]
    if whitespace_positions:
        return search_start + whitespace_positions[-1]
    return preferred_end


def chunk_document(text: str, doc_id: str) -> list[dict[str, Any]]:
    """Split text into overlapping, readable character windows.

    Chunk identifiers are stable within a document version and deliberately
    contain no content hash: the vector store computes and owns content hashes
    for cache/reindex decisions.
    """

    if not isinstance(text, str):
        raise TypeError("text must be a string")
    if not isinstance(doc_id, str) or not doc_id:
        raise ValueError("doc_id must be a non-empty string")

    normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return []

    window_size = _window_size()
    overlap = _overlap_size(window_size)
    chunks: list[dict[str, Any]] = []
    start = 0
    index = 0

    while start < len(normalized):
        preferred_end = min(start + window_size, len(normalized))
        end = preferred_end
        if preferred_end < len(normalized):
            end = _find_boundary(normalized, start, preferred_end)

        snippet = normalized[start:end].strip()
        if snippet:
            chunks.append(
                {
                    "chunk_id": f"{doc_id}_{index}",
                    "doc_id": doc_id,
                    "text": snippet,
                    "section": "General",
                }
            )
            index += 1

        if end <= start:
            # A non-breaking or pathological input must never cause a loop.
            end = min(start + 1, len(normalized))
        next_start = end - overlap if end < len(normalized) else len(normalized)
        if next_start <= start:
            next_start = end
        start = next_start

    return chunks
