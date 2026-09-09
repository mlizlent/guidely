from pathlib import Path

from core.errors import CorruptedFileError, UnsupportedFileError

SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf", ".docx"}


def parse_file(file_path: Path) -> str:
    """Convert a supported file to raw text. Raises UnsupportedFileError for
    unknown extensions and CorruptedFileError if reading/parsing fails."""
    ext = file_path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFileError(file_path.name)

    try:
        if ext in (".txt", ".md"):
            return file_path.read_text(encoding="utf-8")
        if ext == ".pdf":
            return _parse_pdf(file_path)
        if ext == ".docx":
            return _parse_docx(file_path)
    except UnsupportedFileError:
        raise
    except Exception as exc:
        raise CorruptedFileError(file_path.name) from exc

    raise UnsupportedFileError(file_path.name)


def _parse_pdf(file_path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(file_path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _parse_docx(file_path: Path) -> str:
    import docx

    document = docx.Document(str(file_path))
    return "\n".join(p.text for p in document.paragraphs)