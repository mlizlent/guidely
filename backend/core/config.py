from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parent.parent


def _split_csv(value: str) -> list[str]:
    """Split a comma-separated string into a trimmed list."""
    return [item.strip() for item in value.split(",") if item.strip()]


class _CorsEnvSettingsSource(PydanticBaseSettingsSource):
    """Read ``CORS_ORIGINS`` from the environment as a comma-separated list.

    pydantic-settings 2.15 treats ``list[str]`` fields read from ``.env`` as
    complex values and tries to JSON-decode them before the model validator
    runs, which fails on plain comma-separated strings. This source parses the
    raw value first so the default JSON path is never reached.
    """

    def __init__(self, settings_cls) -> None:
        super().__init__(settings_cls)
        self._raw = self._read_raw()

    def _read_raw(self) -> dict[str, str]:
        import os

        raw: dict[str, str] = {}
        for env_name in ("CORS_ORIGINS",):
            if env_name in os.environ:
                raw[env_name] = os.environ[env_name]
        return raw

    def get_field_value(self, field, field_name):
        raw_value = self._raw.get("CORS_ORIGINS")
        if raw_value is None or field_name != "cors_origins":
            return None, field_name, False
        return raw_value, field_name, True

    def prepare_field_value(self, field_name, field, value, value_is_complex):
        return value

    def __call__(self) -> dict[str, object]:
        raw_value = self._raw.get("CORS_ORIGINS")
        if raw_value is None:
            return {}
        return {"cors_origins": _split_csv(raw_value)}


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
            return _split_csv(value)
        return value

    @field_validator("chunk_overlap_chars")
    @classmethod
    def validate_overlap(cls, value: int, info) -> int:
        # ``chunk_size_chars`` has already been validated when the model is built.
        if "chunk_size_chars" in info.data and value >= info.data["chunk_size_chars"]:
            raise ValueError("chunk_overlap_chars must be smaller than chunk_size_chars")
        return value

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        # Run our parser before the standard env/dotenv sources so the raw
        # comma-separated string never reaches the JSON decoder.
        return (
            init_settings,
            _CorsEnvSettingsSource(settings_cls),
            env_settings,
            dotenv_settings,
            file_secret_settings,
        )


settings = Settings()
