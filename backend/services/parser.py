import re
from pathlib import Path

from core.errors import CorruptedFileError, UnsupportedFileError


SUPPORTED_EXTENSIONS = {".txt", ".md", ".markdown", ".pdf", ".docx"}
_BOM_ENCODINGS = (
    (b"\xff\xfe\x00\x00", "utf-32-le"),
    (b"\x00\x00\xfe\xff", "utf-32-be"),
    (b"\xef\xbb\xbf", "utf-8-sig"),
    (b"\xff\xfe", "utf-16-le"),
    (b"\xfe\xff", "utf-16-be"),
)
_FALLBACK_ENCODINGS = ("utf-8", "cp1252", "latin-1")
_WHITESPACE_RE = re.compile(r"[ \t\f\v]+")
_BLANK_LINE_RE = re.compile(r"\n{3,}")


def parse_file(path: Path) -> str:
    """Read a supported local document and return clean, searchable text.

    Plain-text files are decoded using a sequence of common encodings. PDF and
    DOCX files are parsed with their respective libraries, then pass through
    the same whitespace normalizer so downstream chunking is deterministic.
    """

    file_path = Path(path)
    extension = file_path.suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFileError(file_path.name)

    try:
        if extension in {".txt", ".md", ".markdown"}:
            text = _read_text_fallback(file_path)
        elif extension == ".pdf":
            text = _parse_pdf(file_path)
        elif extension == ".docx":
            text = _parse_docx(file_path)
        else:  # pragma: no cover - extension set is exhaustive
            raise UnsupportedFileError(file_path.name)
    except UnsupportedFileError:
        raise
    except Exception as exc:
        raise CorruptedFileError(file_path.name) from exc

    return _clean_text(text)


def _read_text_fallback(file_path: Path) -> str:
    raw = file_path.read_bytes()
    if not raw:
        return ""

    # A BOM gives an unambiguous signal for UTF encodings. Try those before
    # generic single-byte fallbacks so UTF-16 text is not misread as NUL-heavy
    # UTF-8.
    for _bom, encoding in _BOM_ENCODINGS:
        try:
            decoded = raw.decode(encoding)
        except UnicodeDecodeError:
            continue
        if encoding == "utf-8-sig" or "\x00" not in decoded:
            return decoded

    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        pass

    for encoding in _FALLBACK_ENCODINGS[1:]:
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue

    return raw.decode("latin-1", errors="replace")


def _parse_pdf(file_path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(file_path))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages)


def _parse_docx(file_path: Path) -> str:
    from docx import Document

    document = Document(str(file_path))
    blocks: list[str] = []
    blocks.extend(paragraph.text for paragraph in document.paragraphs if paragraph.text)

    # Tables often contain the substantive policy/procedure content. Include
    # cells in document order without duplicating paragraphs already captured.
    for table in document.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            if any(cells):
                blocks.append(" | ".join(cells))

    return "\n\n".join(blocks)


def _clean_text(text: str) -> str:
    """Normalize whitespace while retaining useful paragraph boundaries."""

    if not text:
        return ""

    # Remove a byte-order mark and normalize line endings before collapsing
    # horizontal whitespace. Keeping one blank line preserves section breaks.
    text = str(text).replace("\r\n", "\n").replace("\r", "\n")
    text = text.lstrip("\ufeff")
    lines = [_WHITESPACE_RE.sub(" ", line).strip() for line in text.split("\n")]
    text = "\n".join(lines)
    text = _BLANK_LINE_RE.sub("\n\n", text)
    return text.strip()
