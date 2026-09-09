import hashlib
import re
from dataclasses import dataclass

from core.config import settings

try:
    import tiktoken

    _ENC = tiktoken.get_encoding("cl100k_base")
except Exception:  # pragma: no cover - falls back to word-based splitting
    _ENC = None


@dataclass
class RawChunk:
    text: str
    section: str | None
    hash: str


def _split_by_tokens(text: str, size: int, overlap: int) -> list[str]:
    step = max(size - overlap, 1)

    if _ENC:
        tokens = _ENC.encode(text)
        chunks = []
        for start in range(0, len(tokens), step):
            piece = tokens[start : start + size]
            if not piece:
                break
            chunks.append(_ENC.decode(piece))
            if start + size >= len(tokens):
                break
        return chunks

    words = text.split()
    chunks = []
    for start in range(0, len(words), step):
        piece = words[start : start + size]
        if not piece:
            break
        chunks.append(" ".join(piece))
        if start + size >= len(words):
            break
    return chunks


# Matches markdown headings (# / ## / ###) or short Title Case / ALLCAPS lines
# ending in a colon, used as a lightweight heuristic for section boundaries.
_HEADER_RE = re.compile(r"^(#{1,3}\s+.*|[A-Z][A-Za-z0-9 /&-]{3,60}:?)$", re.MULTILINE)


def _detect_sections(text: str) -> list[tuple[str | None, str]]:
    matches = list(_HEADER_RE.finditer(text))
    if not matches:
        return [(None, text)]

    sections = []
    for i, match in enumerate(matches):
        title = match.group().strip("# ").strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        if body:
            sections.append((title, body))
    return sections or [(None, text)]


def chunk_document(text: str, doc_id: str) -> list[RawChunk]:
    """Splits document text into overlapping token-bounded chunks, tagging
    each with its detected section title and a content hash used for the
    embedding cache."""
    size = settings.chunk_size_tokens
    overlap = settings.chunk_overlap_tokens
    raw_chunks: list[RawChunk] = []

    for section_title, body in _detect_sections(text):
        for piece in _split_by_tokens(body, size, overlap):
            piece = piece.strip()
            if not piece:
                continue
            digest = hashlib.sha256(piece.encode("utf-8")).hexdigest()
            raw_chunks.append(RawChunk(text=piece, section=section_title, hash=digest))

    return raw_chunks