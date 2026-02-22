from __future__ import annotations

from fastapi import Request

from src.core.config import Settings
from src.services.rag_chat_service import RagChatService


def get_settings(request: Request) -> Settings:
    """Return app-scoped settings."""

    return request.app.state.settings


def get_rag_chat_service(request: Request) -> RagChatService:
    """Return app-scoped RAG chat service."""

    return request.app.state.runtime.rag_chat_service
