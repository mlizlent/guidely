from openai import OpenAI

from core.config import settings
from core.errors import MissingModelKeyError, ModelTimeoutError

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if not settings.openai_api_key:
        raise MissingModelKeyError()
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embeds a batch of texts in a single API call. Callers (vector_store)
    are responsible for skipping texts that are already cached."""
    if not texts:
        return []
    client = _get_client()
    try:
        response = client.embeddings.create(model=settings.embedding_model, input=texts)
    except Exception as exc:
        raise ModelTimeoutError() from exc
    return [item.embedding for item in response.data]


def embed_query(query: str) -> list[float]:
    return embed_texts([query])[0]