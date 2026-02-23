from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = Field(default="RAG Suite Reranker API")
    app_version: str = Field(default="0.1.0")
    api_prefix: str = Field(default="/v1")

    rerank_default_model: str = Field(default="BAAI/bge-reranker-v2-m3")
    rerank_device: str = Field(default="auto")
    rerank_max_length: int = Field(default=1024)
    rerank_batch_size: int = Field(default=16)
    rerank_use_fp16: bool = Field(default=True)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


def load_settings() -> Settings:
    """Load a fresh settings object."""

    return Settings()
