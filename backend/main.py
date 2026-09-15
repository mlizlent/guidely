from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.errors import GuidelyError, guidely_error_handler, unhandled_error_handler
from core.logging import get_metrics_snapshot
from routes import documents, search
from services import vector_store


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Create runtime directories before the first request is accepted."""

    settings.data_dir.mkdir(parents=True, exist_ok=True)
    (settings.data_dir / "uploads").mkdir(parents=True, exist_ok=True)
    (settings.data_dir / "index").mkdir(parents=True, exist_ok=True)
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
    return {"status": "healthy"}


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
