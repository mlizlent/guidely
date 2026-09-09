from core.config import settings
from core.errors import NoResultsError
from services import vector_store
from services.embedder import embed_query


def retrieve(question: str, top_k: int | None = None) -> list[tuple[dict, float]]:
    """Embeds the question and returns the top-k most similar chunks as
    (chunk_record, similarity_score) pairs. Raises NoResultsError if the
    index is empty or nothing is found."""
    top_k = top_k or settings.top_k
    query_vector = embed_query(question)
    results = vector_store.search(query_vector, top_k)
    if not results:
        raise NoResultsError()
    return results