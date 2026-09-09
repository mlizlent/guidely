import time

from fastapi import APIRouter

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

    try:
        retrieved = retrieve(question)
        answer_text, used_indices = generate_answer(question, retrieved)
    except GuidelyError as exc:
        error_type = exc.code
        raise
    finally:
        latency_ms = (time.perf_counter() - start) * 1000
        log_query(
            query=question,
            latency_ms=latency_ms,
            retrieved_chunk_ids=[c["chunk_id"] for c, _ in retrieved],
            cache_hit=True,
            error_type=error_type,
        )

    sources = [
        SourceSnippet(
            file_name=chunk["file_name"],
            section=chunk.get("section"),
            snippet=chunk["text"][:300],
            score=round(score, 4),
        )
        for i, (chunk, score) in enumerate(retrieved)
        if not used_indices or (i + 1) in used_indices
    ]

    return AnswerResponse(answer=answer_text, sources=sources, latency_ms=round(latency_ms, 1))