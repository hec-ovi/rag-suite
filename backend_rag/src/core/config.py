from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = Field(default="RAG Suite RAG API")
    app_version: str = Field(default="0.1.0")
    api_prefix: str = Field(default="/v1")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


def load_settings() -> Settings:
    """Load a fresh settings object."""

    return Settings()
