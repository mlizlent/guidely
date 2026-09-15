from core.config import settings
from core.errors import EmptyQueryError, NoResultsError
from services import vector_store
from services.embedder import embed_query


def retrieve(
    question: str,
    top_k: int | None = None,
) -> list[tuple[dict, float]]:
    """Embed a question and return the most similar indexed chunks.

    Scores are FAISS inner-product similarities after L2 normalization, so
    larger values indicate a closer semantic match.
    """

    query = (question or "").strip()
    if not query:
        raise EmptyQueryError()

    limit = settings.top_k if top_k is None else max(1, int(top_k))
    query_vector = embed_query(query)
    results = vector_store.search(query_vector, limit)
    if not results:
        raise NoResultsError()
    return results
