from __future__ import annotations

from fastapi import Request

from src.core.config import Settings
from src.services.rerank_service import RerankService


def get_settings(request: Request) -> Settings:
    """Return app-scoped settings."""

    return request.app.state.settings


def get_rerank_service(request: Request) -> RerankService:
    """Return app-scoped rerank service."""

    return request.app.state.rerank_service
