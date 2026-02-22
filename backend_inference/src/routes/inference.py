from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from src.core.config import Settings
from src.core.dependencies import get_settings
from src.models.api.inference import (
    ChatCompletionsRequest,
    ChatCompletionsResponse,
    CompletionsRequest,
    CompletionsResponse,
    EmbeddingsRequest,
    EmbeddingsResponse,
)
from src.services.service_factory import build_inference_service

router = APIRouter(tags=["Inference"])


@router.post("/chat/completions")
async def chat_completions(
    data: ChatCompletionsRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> ChatCompletionsResponse:
    """OpenAI-compatible chat completion endpoint backed by Ollama."""

    service = build_inference_service(settings=settings)
    if data.stream:
        return StreamingResponse(
            service.chat_completions_stream(data),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return await service.chat_completions(data)


@router.post("/completions")
async def completions(
    data: CompletionsRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> CompletionsResponse:
    """OpenAI-compatible text completion endpoint backed by Ollama."""

    service = build_inference_service(settings=settings)
    return await service.completions(data)


@router.post("/embeddings")
async def embeddings(
    data: EmbeddingsRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> EmbeddingsResponse:
    """OpenAI-compatible embeddings endpoint backed by Ollama."""

    service = build_inference_service(settings=settings)
    return await service.embeddings(data)
