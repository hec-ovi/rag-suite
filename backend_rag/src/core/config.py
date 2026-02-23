from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = Field(default="RAG Suite RAG API")
    app_version: str = Field(default="0.1.0")
    api_prefix: str = Field(default="/v1")

    database_url: str = Field(default="sqlite:///./data/control_plane.db")

    qdrant_url: str = Field(default="http://qdrant:6333")
    qdrant_api_key: str | None = Field(default=None)
    qdrant_timeout_seconds: float = Field(default=30.0)

    inference_api_url: str = Field(default="http://backend-inference:8010/v1")
    inference_timeout_seconds: float = Field(default=300.0)
    rag_chat_model: str = Field(default="gpt-oss:20b", validation_alias="OLLAMA_CHAT_MODEL")
    rag_embedding_model: str = Field(default="bge-m3:latest", validation_alias="OLLAMA_EMBEDDING_MODEL")
    rag_rerank_model: str = Field(default="BAAI/bge-reranker-v2-m3", validation_alias="OLLAMA_RERANK_MODEL")

    rag_checkpoint_path: str = Field(default="./data/rag_memory_checkpoints.db")
    rag_reranked_checkpoint_path: str = Field(default="./data/rag_reranked_memory_checkpoints.db")
    rag_sessions_database_url: str = Field(default="sqlite:///./data/rag_sessions.db")
    rag_default_history_window_messages: int = Field(default=8)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


def load_settings() -> Settings:
    """Load a fresh settings object."""

    return Settings()
