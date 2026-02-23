from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from src.core.dependencies import get_rag_reranked_chat_service
from src.core.exceptions import DomainError
from src.reranked.chat_service import RagRerankedChatService
from src.reranked.models import (
    RagRerankedChatRequest,
    RagRerankedChatResponse,
    RagRerankedSessionChatRequest,
)

router = APIRouter(prefix="/rag/reranked", tags=["RAG - Re-ranked"])


def _sse_event(event_name: str, payload: dict[str, object]) -> str:
    """Format one SSE event chunk."""

    return f"event: {event_name}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.get("/status")
def rag_reranked_status() -> dict[str, str]:
    """Expose backend-rag reranked implementation status."""

    return {
        "status": "ready",
        "message": (
            "Hybrid + reranked endpoints available: "
            "/chat/stateless, /chat/session, and SSE stream variants."
        ),
    }


@router.post("/chat/stateless")
def rag_reranked_chat_stateless(
    data: RagRerankedChatRequest,
    service: Annotated[RagRerankedChatService, Depends(get_rag_reranked_chat_service)],
) -> RagRerankedChatResponse:
    """Run one-shot hybrid+rereank RAG chat (no memory across calls)."""

    return service.chat_stateless(data)


@router.post("/chat/session")
def rag_reranked_chat_session(
    data: RagRerankedSessionChatRequest,
    service: Annotated[RagRerankedChatService, Depends(get_rag_reranked_chat_service)],
) -> RagRerankedChatResponse:
    """Run hybrid+rereank RAG chat with persistent session memory."""

    return service.chat_session(data)


@router.post("/chat/stateless/stream")
def rag_reranked_chat_stateless_stream(
    data: RagRerankedChatRequest,
    service: Annotated[RagRerankedChatService, Depends(get_rag_reranked_chat_service)],
) -> StreamingResponse:
    """Run one-shot hybrid+rereank chat and return SSE transport stream."""

    def event_stream() -> Iterator[str]:
        try:
            for event_name, payload in service.stream_chat_stateless(data):
                yield _sse_event(event_name, payload)
        except DomainError as error:
            yield _sse_event("error", {"detail": str(error)})
        except Exception:  # noqa: BLE001
            yield _sse_event("error", {"detail": "Unexpected streaming error"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/session/stream")
def rag_reranked_chat_session_stream(
    data: RagRerankedSessionChatRequest,
    service: Annotated[RagRerankedChatService, Depends(get_rag_reranked_chat_service)],
) -> StreamingResponse:
    """Run session-memory hybrid+rereank chat and return SSE transport stream."""

    def event_stream() -> Iterator[str]:
        try:
            for event_name, payload in service.stream_chat_session(data):
                yield _sse_event(event_name, payload)
        except DomainError as error:
            yield _sse_event("error", {"detail": str(error)})
        except Exception:  # noqa: BLE001
            yield _sse_event("error", {"detail": "Unexpected streaming error"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
