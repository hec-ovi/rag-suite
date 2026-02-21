from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import Settings
from src.core.dependencies import get_db_session, get_settings
from src.models.api.pipeline import (
    ChunkTextRequest,
    ChunkTextResponse,
    ContextualizeChunksRequest,
    ContextualizeChunksResponse,
    NormalizeTextRequest,
    NormalizeTextResponse,
)
from src.services.service_factory import build_ingestion_service

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


@router.post("/normalize")
async def normalize_text(
    data: NormalizeTextRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> NormalizeTextResponse:
    """Normalize raw text with deterministic preprocessing."""

    service = build_ingestion_service(session=session, settings=settings)
    return await service.normalize_text(data)


@router.post("/chunk")
async def chunk_text(
    data: ChunkTextRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ChunkTextResponse:
    """Propose chunk boundaries using deterministic or agentic mode."""

    service = build_ingestion_service(session=session, settings=settings)
    return await service.chunk_text(data)


@router.post("/contextualize")
async def contextualize_chunks(
    data: ContextualizeChunksRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ContextualizeChunksResponse:
    """Generate contextual headers for proposed chunks."""

    service = build_ingestion_service(session=session, settings=settings)
    return await service.contextualize_chunks(data)

