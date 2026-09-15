from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application configuration loaded from environment variables and .env."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        validate_default=True,
    )

    groq_api_key: str = ""
    groq_base_url: str = "https://groq.com"
    chat_model: str = "llama3-8b-8192"
    embedding_model: str = "all-MiniLM-L6-v2"
    data_dir: Path = Path("./data")

    top_k: int = Field(default=3, ge=1)
    chunk_size_chars: int = Field(default=800, ge=100, le=4_000)
    chunk_overlap_chars: int = Field(default=100, ge=0)
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("groq_api_key", "groq_base_url", "chat_model", "embedding_model")
    @classmethod
    def strip_string_values(cls, value: str) -> str:
        return value.strip()

    @field_validator("data_dir")
    @classmethod
    def expand_data_dir(cls, value: Path) -> Path:
        return value.expanduser()

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [
                origin.strip()
                for origin in value.split(",")
                if origin.strip()
            ]
        return value

    @field_validator("chunk_overlap_chars")
    @classmethod
    def validate_overlap(cls, value: int, info) -> int:
        # ``chunk_size_chars`` has already been validated when the model is built.
        if "chunk_size_chars" in info.data and value >= info.data["chunk_size_chars"]:
            raise ValueError("chunk_overlap_chars must be smaller than chunk_size_chars")
        return value


settings = Settings()
