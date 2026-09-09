import os
import warnings
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings:
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    # Groq is used for answer generation. 
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_base_url: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    chat_model: str = os.getenv("CHAT_MODEL", "llama-3.3-70b-versatile")

    top_k: int = int(os.getenv("TOP_K", 5))
    chunk_size_tokens: int = int(os.getenv("CHUNK_SIZE_TOKENS", 800))
    chunk_overlap_tokens: int = int(os.getenv("CHUNK_OVERLAP_TOKENS", 100))

    data_dir: Path = BASE_DIR / "data"
    sample_docs_dir: Path = data_dir / "sample-docs"
    index_dir: Path = data_dir / "index"
    metadata_path: Path = index_dir / "metadata.json"
    faiss_index_path: Path = index_dir / "faiss.index"

    cors_origins: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")


settings = Settings()

settings.index_dir.mkdir(parents=True, exist_ok=True)
settings.sample_docs_dir.mkdir(parents=True, exist_ok=True)

if not settings.openai_api_key:
    warnings.warn(
        "OPENAI_API_KEY is not set. Embedding calls will fail until it is "
        "configured in your .env file."
    )

if not settings.groq_api_key:
    warnings.warn(
        "GROQ_API_KEY is not set. Answer generation calls will fail until it "
        "is configured in your .env file."
    )