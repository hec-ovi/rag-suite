from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = Field(default="RAG Suite API")
    app_version: str = Field(default="0.1.0")
    api_prefix: str = Field(default="/v1")

    database_url: str = Field(default="sqlite:///./data/control_plane.db")

    qdrant_url: str = Field(default="http://qdrant:6333")
    qdrant_api_key: str | None = Field(default=None)
    qdrant_timeout_seconds: float = Field(default=30.0)
    qdrant_collection_prefix: str = Field(default="rag_suite_project")

    ollama_url: str = Field(default="http://ollama:11434")
    ollama_chat_model: str = Field(default="qwen3:8b")
    ollama_embedding_model: str = Field(default="nomic-embed-text:latest")
    ollama_timeout_seconds: float = Field(default=90.0)

    normalization_version: str = Field(default="v1")
    chunking_version: str = Field(default="v1")
    contextualization_version: str = Field(default="anthropic-style-v1")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


def load_settings() -> Settings:
    """Load a fresh settings object."""

    return Settings()
