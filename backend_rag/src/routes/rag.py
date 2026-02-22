from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from src.core.dependencies import get_rag_chat_service
from src.models.api.rag import RagHybridChatRequest, RagHybridChatResponse, RagSessionChatRequest
from src.services.rag_chat_service import RagChatService

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.get("/status")
def rag_status() -> dict[str, str]:
    """Expose backend-rag implementation status."""

    return {
        "status": "ready",
        "message": "Hybrid RAG endpoints available: /chat/stateless and /chat/session.",
    }


@router.post("/chat/stateless")
def rag_chat_stateless(
    data: RagHybridChatRequest,
    service: Annotated[RagChatService, Depends(get_rag_chat_service)],
) -> RagHybridChatResponse:
    """Run one-shot hybrid RAG chat (no memory across calls)."""

    return service.chat_stateless(data)


@router.post("/chat/session")
def rag_chat_session(
    data: RagSessionChatRequest,
    service: Annotated[RagChatService, Depends(get_rag_chat_service)],
) -> RagHybridChatResponse:
    """Run hybrid RAG chat with persistent session memory."""

    return service.chat_session(data)
