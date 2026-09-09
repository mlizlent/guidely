from datetime import datetime
from pydantic import Basemodel, Field

class Chunk(Basemodel):
    chunk_id: str
    doc_id: str
    file_name: str
    section: str | None = None
    text: str
    hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DocumentMeta(Basemodel):
    doc_id: str
    file_name: str
    chunk_count: int
    status: str = "indexed"

 class UploadResponse(Basemodel):
    doc_id: str
    file_name: str
    chunks_created: int
    chunks_reused: int

class ReindexResponse(Basemodel):
    documents_processed: int
    chunks_reused: int
    chunks_reembedded: int

class SourceSnippet(Basemodel):
    file_name: str
    section: str | None = None
    snippet: str
    score: float

class QueryRequest(Basemodel):
    question: str

class AnswerResponse(Basemodel):
    answer: str
    sources: list[SourceSnippet]
    latency_ms: float

class MetricsResponse(Basemodel):
    documents: int
    chunks: int
    queries_servered: int
    latency_ms_median: float
    latency_ms_p95: float
    cache_hit_rate: float
    errors: dict