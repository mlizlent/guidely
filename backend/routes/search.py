import time
from fastapi import APIRouter, HTTPException

from core.errors import EmptyQueryError, GuidelyError
from core.logging import log_query
from models.record import AnswerResponse, QueryRequest, SourceSnippet
from services.answerer import generate_answer
from services.retriever import retrieve

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/ask", response_model=AnswerResponse)
async def ask(request: QueryRequest) -> AnswerResponse:
    question = request.question.strip()
    if not question:
        raise EmptyQueryError()

    start = time.perf_counter()
    error_type: str | None = None
    retrieved: list[tuple[dict, float]] = []
    answer_text = ""
    used_indices = set()

    try:
        retrieved = retrieve(question, top_k=request.top_k)
        answer_text, used_indices = generate_answer(question, retrieved)
    except GuidelyError as exc:
        error_type = exc.code
        raise
    except Exception as exc:
        error_type = "UNHANDLED_SYSTEM_ERROR"
        # Return a clean HTTP 400/500 message so the interface shows a friendly alert state
        raise HTTPException(
            status_code=500, 
            detail=f"RAG search execution failed: {str(exc)}. Verify vector index and API keys."
        )
    finally:
        latency_ms = (time.perf_counter() - start) * 1000
        # Safely extract chunk IDs only if the dictionary contains them
        chunk_ids = []
        if retrieved:
            chunk_ids = [c.get("chunk_id", "unknown") for c, _ in retrieved if isinstance(c, dict)]
            
        log_query(
            query=question,
            latency_ms=latency_ms,
            retrieved_chunk_ids=chunk_ids,
            cache_hit=True,
            error_type=error_type,
        )

    sources = [
        SourceSnippet(
            file_name=chunk.get("file_name", "unknown_source.txt"),
            section=chunk.get("section"),
            snippet=chunk.get("text", "")[:300],
            score=round(score, 4),
        )
        for i, (chunk, score) in enumerate(retrieved)
        if not used_indices or (i + 1) in used_indices
    ]

    return AnswerResponse(answer=answer_text, sources=sources, latency_ms=round(latency_ms, 1))
