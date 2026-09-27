"""In-memory document indexing status registry.

Indexing is asynchronous, so the upload endpoint can return immediately while
a background job parses, chunks, and embeds the document. Statuses are kept in
memory (consistent with the in-memory FAISS vector store) and surfaced through
the documents list endpoint.

Each document tracks a *generation* counter. Re-uploading the same filename
bumps the generation so a stale background job from a previous upload cannot
flip the status back to ``indexed`` after a newer upload has started.
"""

from pathlib import Path
from threading import RLock

_lock = RLock()
_statuses: dict[str, str] = {}
_errors: dict[str, str] = {}
_paths: dict[str, Path] = {}
_sizes: dict[str, int] = {}
_generations: dict[str, int] = {}
_system: set[str] = set()

DEFAULT_STATUS = "uploaded"

VALID_STATUSES = {"uploaded", "indexing", "indexed", "failed"}


def register(doc_id: str, file_name: str, path: Path, *, system: bool = False) -> int:
    """Record a freshly uploaded document and return its generation number.

    The returned generation is captured by the background worker; if the
    document is re-uploaded before the worker finishes, the stale worker
    sees a mismatched generation and aborts.
    """

    with _lock:
        generation = _generations.get(doc_id, 0) + 1
        _generations[doc_id] = generation
        _statuses[doc_id] = "uploaded"
        _paths[doc_id] = Path(path)
        _errors.pop(doc_id, None)
        if system:
            _system.add(doc_id)
        else:
            _system.discard(doc_id)
        return generation


def set_path(doc_id: str, path: Path) -> None:
    """Record the on-disk path of a document after it has been written."""

    with _lock:
        _paths[doc_id] = Path(path)
        try:
            _sizes[doc_id] = int(path.stat().st_size)
        except OSError:
            _sizes[doc_id] = 0


def get_size(doc_id: str) -> int:
    with _lock:
        return int(_sizes.get(doc_id, 0))


def set_status(doc_id: str, status: str, error: str | None = None, generation: int | None = None) -> bool:
    """Set a status, optionally guarding against a stale generation.

    Returns ``True`` when the status was applied. When ``generation`` is
    supplied and does not match the current generation (i.e. a newer upload
    superseded this worker), the update is rejected.
    """

    if status not in VALID_STATUSES:
        raise ValueError(f"unknown status: {status!r}")
    with _lock:
        if generation is not None and _generations.get(doc_id) != generation:
            return False
        _statuses[doc_id] = status
        if error is None:
            _errors.pop(doc_id, None)
        else:
            _errors[doc_id] = error
        return True


def get_status(doc_id: str) -> str:
    with _lock:
        return _statuses.get(doc_id, DEFAULT_STATUS)


def get_error(doc_id: str) -> str | None:
    with _lock:
        return _errors.get(doc_id)


def get_path(doc_id: str) -> Path | None:
    with _lock:
        return _paths.get(doc_id)


def all_statuses() -> dict[str, str]:
    with _lock:
        return dict(_statuses)


def all_sizes() -> dict[str, int]:
    with _lock:
        return dict(_sizes)


def is_system(doc_id: str) -> bool:
    with _lock:
        return doc_id in _system


def remove(doc_id: str) -> None:
    with _lock:
        _statuses.pop(doc_id, None)
        _errors.pop(doc_id, None)
        _paths.pop(doc_id, None)
        _sizes.pop(doc_id, None)
        _generations.pop(doc_id, None)
        _system.discard(doc_id)


def reset() -> None:
    with _lock:
        _statuses.clear()
        _errors.clear()
        _paths.clear()
        _sizes.clear()
        _generations.clear()
        _system.clear()