import hashlib
import shutil

from fastapi import APIRouter, File, UploadFile

from core.config import settings
from core.errors import DocumentNotFoundError
from models.record import DocumentMeta, ReindexResponse, UploadResponse
from services import vector_store
from services.chunker import chunk_document
from services.parser import parse_file

router = APIRouter(prefix="/documents", tags=["documents"])

_UPLOAD_DIR = settings.data_dir / "uploads"
_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _doc_id_for(file_name: str) -> str:
    return hashlib.sha1(file_name.encode("utf-8")).hexdigest()[:12]


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)) -> UploadResponse:
    dest = _UPLOAD_DIR / file.filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    doc_id = _doc_id_for(file.filename)
    text = parse_file(dest)
    raw_chunks = chunk_document(text, doc_id)
    created, reused = vector_store.index_document(doc_id, file.filename, raw_chunks)

    return UploadResponse(
        doc_id=doc_id, file_name=file.filename, chunks_created=created, chunks_reused=reused
    )


@router.put("/{doc_id}", response_model=UploadResponse)
async def edit_document(doc_id: str, file: UploadFile = File(...)) -> UploadResponse:
    if doc_id not in vector_store.list_documents():
        raise DocumentNotFoundError(doc_id)

    dest = _UPLOAD_DIR / file.filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    text = parse_file(dest)
    raw_chunks = chunk_document(text, doc_id)
    created, reused = vector_store.index_document(doc_id, file.filename, raw_chunks)

    return UploadResponse(
        doc_id=doc_id, file_name=file.filename, chunks_created=created, chunks_reused=reused
    )


@router.post("/reindex", response_model=ReindexResponse)
async def reindex_all() -> ReindexResponse:
    """Re-parses and re-chunks every file in the uploads directory; the
    vector store's hash-based cache ensures unchanged chunks are skipped."""
    total_created = 0
    total_reused = 0
    doc_count = 0

    for path in _UPLOAD_DIR.glob("*"):
        if not path.is_file():
            continue
        doc_id = _doc_id_for(path.name)
        text = parse_file(path)
        raw_chunks = chunk_document(text, doc_id)
        created, reused = vector_store.index_document(doc_id, path.name, raw_chunks)
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


@router.get("", response_model=list[DocumentMeta])
async def list_documents() -> list[DocumentMeta]:
    docs = vector_store.list_documents()
    return [
        DocumentMeta(doc_id=d["doc_id"], file_name=d["file_name"], chunk_count=d["chunk_count"])
        for d in docs.values()
    ]


@router.delete("/{doc_id}")
async def delete_document(doc_id: str) -> dict:
    if doc_id not in vector_store.list_documents():
        raise DocumentNotFoundError(doc_id)
    vector_store.delete_document(doc_id)
    return {"deleted": doc_id}