from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from src.core.config import Settings
from src.core.dependencies import get_db_session, get_operation_manager, get_settings
from src.models.api.pipeline import (
    AutomaticPipelinePreviewRequest,
    AutomaticPipelinePreviewResponse,
    CancelOperationResponse,
    ChunkTextRequest,
    ChunkTextResponse,
    ContextualizeChunksRequest,
    ContextualizeChunksResponse,
    NormalizeTextRequest,
    NormalizeTextResponse,
)
from src.services.operation_manager import OperationManager
from src.services.service_factory import build_ingestion_service

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


@router.post("/normalize")
async def normalize_text(
    data: NormalizeTextRequest,
    session: Annotated[Session, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> NormalizeTextResponse:
    """Normalize raw text with deterministic preprocessing."""

    service = build_ingestion_service(session=session, settings=settings)
    return await service.normalize_text(data)


@router.post("/chunk")
async def chunk_text(
    data: ChunkTextRequest,
    session: Annotated[Session, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    operation_manager: Annotated[OperationManager, Depends(get_operation_manager)],
    operation_id: Annotated[str | None, Header(alias="X-Operation-Id")] = None,
) -> ChunkTextResponse:
    """Propose chunk boundaries using deterministic or agentic mode."""

    service = build_ingestion_service(session=session, settings=settings)
    if not operation_id:
        return await service.chunk_text(data)

    async with operation_manager.track(operation_id) as cancel_event:
        return await service.chunk_text(data, cancel_event=cancel_event)


@router.post("/contextualize")
async def contextualize_chunks(
    data: ContextualizeChunksRequest,
    session: Annotated[Session, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    operation_manager: Annotated[OperationManager, Depends(get_operation_manager)],
    operation_id: Annotated[str | None, Header(alias="X-Operation-Id")] = None,
) -> ContextualizeChunksResponse:
    """Generate contextual headers for proposed chunks."""

    service = build_ingestion_service(session=session, settings=settings)
    if not operation_id:
        return await service.contextualize_chunks(data)

    async with operation_manager.track(operation_id) as cancel_event:
        return await service.contextualize_chunks(data, cancel_event=cancel_event)


@router.post("/operations/{operation_id}/cancel", status_code=202)
async def cancel_pipeline_operation(
    operation_id: str,
    operation_manager: Annotated[OperationManager, Depends(get_operation_manager)],
) -> CancelOperationResponse:
    """Request cooperative cancellation of a tracked long-running operation."""

    cancelled = await operation_manager.cancel(operation_id)
    return CancelOperationResponse(operation_id=operation_id, cancelled=cancelled)


@router.post("/preview-automatic")
async def preview_automatic_pipeline(
    data: AutomaticPipelinePreviewRequest,
    session: Annotated[Session, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AutomaticPipelinePreviewResponse:
    """Preview normalize/chunk/contextualize before document ingestion."""

    service = build_ingestion_service(session=session, settings=settings)
    return await service.preview_automatic_pipeline(data)
