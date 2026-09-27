from pydantic import BaseModel, ConfigDict, Field


class RecordModel(BaseModel):
    """Base schema for API records."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class DocumentMeta(RecordModel):
    doc_id: str
    file_name: str
    chunk_count: int = Field(ge=0)
    status: str = "uploaded"
    error: str | None = None
    system: bool = False


class UploadResponse(RecordModel):
    doc_id: str
    file_name: str
    chunks_created: int = Field(ge=0)
    chunks_reused: int = Field(ge=0)


class ReindexResponse(RecordModel):
    documents_processed: int = Field(ge=0)
    chunks_reused: int = Field(ge=0)
    chunks_reembedded: int = Field(ge=0)


class QueryRequest(RecordModel):
    question: str


class SourceSnippet(RecordModel):
    file_name: str
    section: str | None = None
    snippet: str
    score: float


class AnswerResponse(RecordModel):
    answer: str
    sources: list[SourceSnippet]
    latency_ms: float = Field(ge=0)
