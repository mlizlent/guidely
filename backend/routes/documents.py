import hashlib
import shutil
import threading

from fastapi import APIRouter, File, UploadFile

from core.config import settings
from core.errors import DocumentNotFoundError
from models.record import DocumentMeta, ReindexResponse, UploadResponse
from services import index_status, vector_store
from services.chunker import chunk_document
from services.parser import parse_file

router = APIRouter(prefix="/documents", tags=["documents"])

_UPLOAD_DIR = settings.data_dir / "uploads"
_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _doc_id_for(file_name: str) -> str:
    return hashlib.sha1(file_name.encode("utf-8")).hexdigest()[:12]


def _index_one(doc_id: str, file_name: str, path, generation: int) -> None:
    """Parse, chunk, and embed a document in a background thread.

    Failures are captured and surfaced as a ``failed`` status rather than
    raised, so the upload request itself never blocks on a bad file. The
    generation guard lets a re-upload supersede a still-running worker.
    """

    try:
        index_status.set_status(doc_id, "indexing", generation=generation)
        text = parse_file(path)
        raw_chunks = chunk_document(text, doc_id)
        vector_store.index_document(doc_id, file_name, raw_chunks)
        index_status.set_status(doc_id, "indexed", generation=generation)
    except Exception as exc:  # noqa: BLE001 - surface any parse/embed failure
        index_status.set_status(doc_id, "failed", str(exc), generation=generation)


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)) -> UploadResponse:
    """Upload a document and start asynchronous indexing.

    The endpoint streams the file to disk (fast I/O) and returns immediately,
    then a background thread parses, chunks, and embeds the document. For
    large files the caller never waits on CPU-bound work; poll the documents
    list to watch the status move from ``uploaded`` to ``indexed``.
    """

    doc_id = _doc_id_for(file.filename)
    dest = _UPLOAD_DIR / file.filename
    generation = index_status.register(doc_id, file.filename, dest)

    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    thread = threading.Thread(
        target=_index_one,
        args=(doc_id, file.filename, dest, generation),
        daemon=True,
        name=f"index-{doc_id}",
    )
    thread.start()

    return UploadResponse(
        doc_id=doc_id, file_name=file.filename, chunks_created=0, chunks_reused=0
    )


@router.put("/{doc_id}", response_model=UploadResponse)
async def edit_document(doc_id: str, file: UploadFile = File(...)) -> UploadResponse:
    if doc_id not in vector_store.list_documents():
        raise DocumentNotFoundError(doc_id)

    dest = _UPLOAD_DIR / file.filename
    generation = index_status.register(doc_id, file.filename, dest)

    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    thread = threading.Thread(
        target=_index_one,
        args=(doc_id, file.filename, dest, generation),
        daemon=True,
        name=f"index-{doc_id}",
    )
    thread.start()

    return UploadResponse(
        doc_id=doc_id, file_name=file.filename, chunks_created=0, chunks_reused=0
    )


@router.post("/reindex", response_model=ReindexResponse)
async def reindex_all() -> ReindexResponse:
    """Re-parse and re-chunk every file in the uploads directory.

    The vector store's hash-based cache skips unchanged chunks, so reindexing
    is cheap for already-indexed documents. Each file is indexed synchronously
    here; callers wanting non-blocking behavior should use ``/upload``.
    """

    total_created = 0
    total_reused = 0
    doc_count = 0

    for path in _UPLOAD_DIR.glob("*"):
        if not path.is_file():
            continue
        doc_id = _doc_id_for(path.name)
        index_status.set_status(doc_id, "indexing")
        try:
            text = parse_file(path)
            raw_chunks = chunk_document(text, doc_id)
            created, reused = vector_store.index_document(doc_id, path.name, raw_chunks)
            index_status.set_status(doc_id, "indexed")
        except Exception as exc:  # noqa: BLE001
            index_status.set_status(doc_id, "failed", str(exc))
            continue
        total_created += created
        total_reused += reused
        doc_count += 1

    return ReindexResponse(
        documents_processed=doc_count, chunks_reused=total_reused, chunks_reembedded=total_created
    )


@router.get("/{doc_id}/embeddings")
async def get_document_embeddings(doc_id: str) -> dict:
    chunks = vector_store.get_chunks_for_doc(doc_id)
    if not chunks:
        raise DocumentNotFoundError(doc_id)
    return {"doc_id": doc_id, "chunk_count": len(chunks), "chunks": chunks}


@router.get("/{doc_id}/status")
async def get_document_status(doc_id: str) -> dict:
    """Return the current indexing status for a single document.

    A document is registered in the status registry on upload, before any
    indexing happens, so this endpoint is usable even while the background
    worker is still running.
    """

    return {
        "doc_id": doc_id,
        "status": index_status.get_status(doc_id),
        "error": index_status.get_error(doc_id),
    }


@router.get("", response_model=list[DocumentMeta])
async def list_documents() -> list[DocumentMeta]:
    """Return user-uploaded documents, hiding system/sample documents.

    System documents remain indexed and searchable; they just don't appear in
    the manage UI.
    """

    docs = vector_store.list_documents()
    statuses = index_status.all_statuses()
    return [
        DocumentMeta(
            doc_id=d["doc_id"],
            file_name=d["file_name"],
            chunk_count=d["chunk_count"],
            status=statuses.get(d["doc_id"], "uploaded"),
            error=index_status.get_error(d["doc_id"]),
            system=index_status.is_system(d["doc_id"]),
        )
        for d in docs.values()
        if not index_status.is_system(d["doc_id"])
    ]


@router.delete("/{doc_id}")
async def delete_document(doc_id: str) -> dict:
    if doc_id not in vector_store.list_documents():
        raise DocumentNotFoundError(doc_id)
    vector_store.delete_document(doc_id)
    index_status.remove(doc_id)
    return {"deleted": doc_id}