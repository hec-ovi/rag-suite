from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from src.core.dependencies import get_rag_chat_service
from src.core.exceptions import DomainError
from src.models.api.rag import RagHybridChatRequest, RagHybridChatResponse, RagSessionChatRequest
from src.services.rag_chat_service import RagChatService

router = APIRouter(prefix="/rag", tags=["RAG"])


def _sse_event(event_name: str, payload: dict[str, object]) -> str:
    """Format one SSE event chunk."""

    return f"event: {event_name}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _chunk_text(text: str, size: int) -> list[str]:
    """Split text into fixed-size chunks for streaming deltas."""

    if text == "":
        return [""]
    return [text[index : index + size] for index in range(0, len(text), size)]


@router.get("/status")
def rag_status() -> dict[str, str]:
    """Expose backend-rag implementation status."""

    return {
        "status": "ready",
        "message": "Hybrid RAG endpoints available: /chat/stateless, /chat/session, and SSE stream variants.",
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


@router.post("/chat/stateless/stream")
def rag_chat_stateless_stream(
    data: RagHybridChatRequest,
    service: Annotated[RagChatService, Depends(get_rag_chat_service)],
) -> StreamingResponse:
    """Run one-shot hybrid RAG chat and return SSE transport stream."""

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
def rag_chat_session_stream(
    data: RagSessionChatRequest,
    service: Annotated[RagChatService, Depends(get_rag_chat_service)],
) -> StreamingResponse:
    """Run session-memory hybrid RAG chat and return SSE transport stream."""

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
