from __future__ import annotations

from fastapi import Request

from src.core.config import Settings
from src.services.rag_chat_service import RagChatService
from src.services.rag_session_store_service import RagSessionStoreService


def get_settings(request: Request) -> Settings:
    """Return app-scoped settings."""

    return request.app.state.settings


def get_rag_chat_service(request: Request) -> RagChatService:
    """Return app-scoped RAG chat service."""

    return request.app.state.runtime.rag_chat_service


def get_rag_session_store_service(request: Request) -> RagSessionStoreService:
    """Return app-scoped session-store service."""

    return request.app.state.runtime.rag_session_store_service
