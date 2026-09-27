from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.errors import GuidelyError, guidely_error_handler, unhandled_error_handler
from core.logging import get_metrics_snapshot
from routes import documents, search
from services import embedder, index_status, vector_store


_SAMPLE_DOCS_DIR = Path(__file__).parent / "data" / "sample-docs"


def _warmup_model() -> None:
    """Load the embedding model into memory before serving requests."""
    try:
        embedder.embed_texts(["warmup"])
    except Exception:
        pass


def _preindex_sample_docs() -> None:
    """Index sample documents at startup so the cache is warm.

    Sample documents are marked as system documents: they stay indexed and
    searchable but are hidden from the document management UI.
    """

    if not _SAMPLE_DOCS_DIR.exists():
        return
    from services.parser import parse_file
    from services.chunker import chunk_document
    from routes.documents import _doc_id_for

    for path in sorted(_SAMPLE_DOCS_DIR.iterdir()):
        if not path.is_file():
            continue
        try:
            doc_id = _doc_id_for(path.name)
            text = parse_file(path)
            chunks = chunk_document(text, doc_id)
            vector_store.index_document(doc_id, path.name, chunks)
            index_status.register(doc_id, path.name, path, system=True)
            index_status.set_path(doc_id, path)
            index_status.set_status(doc_id, "indexed")
        except Exception:
            continue


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Create runtime directories before the first request is accepted."""

    settings.data_dir.mkdir(parents=True, exist_ok=True)
    (settings.data_dir / "uploads").mkdir(parents=True, exist_ok=True)
    (settings.data_dir / "index").mkdir(parents=True, exist_ok=True)
    _warmup_model()
    _preindex_sample_docs()
    yield


app = FastAPI(
    title="Guidely",
    version="1.0.0",
    description="RAG-based internal knowledge assistant",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.add_exception_handler(GuidelyError, guidely_error_handler)
app.add_exception_handler(Exception, unhandled_error_handler)

app.include_router(documents.router)
app.include_router(search.router)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {
        "status": "healthy",
        "vector_store": "FAISS (in-memory)",
        "db": "None (in-memory only)",
    }


@app.get("/metrics", tags=["system"])
async def metrics() -> dict[str, int | float | dict[str, int]]:
    store_stats = vector_store.stats()
    query_stats = get_metrics_snapshot()
    return {
        "total_documents": store_stats["documents"],
        "documents": store_stats["documents"],
        "active_chunks": store_stats["chunks"],
        "chunks": store_stats["chunks"],
        "queries_served": query_stats["queries_served"],
        "total_queries": query_stats["queries_served"],
        "total_latency_ms": query_stats["total_latency_ms"],
        "average_latency_ms": query_stats["average_latency_ms"],
        "latency_ms_average": query_stats["average_latency_ms"],
        "latency_ms_median": query_stats["latency_ms_median"],
        "latency_ms_p95": query_stats["latency_ms_p95"],
        "total_errors": query_stats["total_errors"],
        "errors": query_stats["errors"],
    }
