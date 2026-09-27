import re

from openai import OpenAI

from core.config import settings
from core.errors import MissingModelKeyError, ModelTimeoutError

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    """Groq exposes an OpenAI-compatible /v1 API, so the same SDK is
    reused here — just pointed at Groq's base_url with a Groq key."""
    global _client
    if not settings.groq_api_key:
        raise MissingModelKeyError()
    if _client is None:
        _client = OpenAI(api_key=settings.groq_api_key, base_url=settings.groq_base_url)
    return _client


_SYSTEM_PROMPT = """You are Guidely, an internal knowledge assistant.
Answer the user's question using ONLY the numbered source documents provided.
If the documents don't contain enough information, say so plainly instead of guessing.
Keep the answer concise (2-5 sentences). After the answer, on a new line, list the
document numbers you actually relied on, formatted exactly as: SOURCES: [1, 3]"""


def _build_user_message(question: str, chunks: list[dict]) -> str:
    numbered = "\n\n".join(
        f"[{i + 1}] ({c['file_name']}" + (f" — {c['section']}" if c.get("section") else "") + f")\n{c['text']}"
        for i, c in enumerate(chunks)
    )
    return f"Question: {question}\n\nSource chunks:\n{numbered}"


def generate_answer(question: str, retrieved: list[tuple[dict, float]]) -> tuple[str, list[int]]:
    """Calls Groq with the retrieved chunks and returns (answer_text,
    used_chunk_numbers). used_chunk_numbers are 1-indexed positions into the
    `retrieved` list, as reported by the model."""
    chunks = [c for c, _ in retrieved]
    client = _get_client()

    try:
        response = client.chat.completions.create(
            model=settings.chat_model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_message(question, chunks)},
            ],
            temperature=0.2,
        )
    except Exception as exc:
        raise ModelTimeoutError() from exc

    raw = response.choices[0].message.content or ""
    return _parse_response(raw)


def _parse_response(raw: str) -> tuple[str, list[int]]:
    marker = "SOURCES:"
    if marker in raw:
        answer_part, sources_part = raw.split(marker, 1)
        used = [int(d) for d in re.findall(r"\d+", sources_part)]
        return answer_part.strip(), used
    return raw.strip(), []