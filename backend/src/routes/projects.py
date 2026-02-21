from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import Settings
from src.core.dependencies import get_db_session, get_settings
from src.models.api.pipeline import IngestDocumentRequest, IngestedDocumentResponse
from src.models.api.project import (
    ChunkSummaryResponse,
    CreateProjectRequest,
    DocumentSummaryResponse,
    ProjectListResponse,
    ProjectResponse,
)
from src.services.service_factory import build_ingestion_service, build_project_service

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("")
async def create_project(
    data: CreateProjectRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ProjectResponse:
    """Create a new ingestion project namespace."""

    service = build_project_service(session=session, settings=settings)
    return await service.create_project(data)


@router.get("")
async def list_projects(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ProjectListResponse:
    """List available project namespaces."""

    service = build_project_service(session=session, settings=settings)
    return ProjectListResponse(projects=await service.list_projects())


@router.get("/{project_id}/documents")
async def list_project_documents(
    project_id: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> list[DocumentSummaryResponse]:
    """List documents indexed for a project."""

    service = build_project_service(session=session, settings=settings)
    return await service.list_project_documents(project_id)


@router.get("/documents/{document_id}/chunks")
async def list_document_chunks(
    document_id: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> list[ChunkSummaryResponse]:
    """List chunk records for a document."""

    service = build_project_service(session=session, settings=settings)
    return await service.list_document_chunks(document_id)


@router.post("/{project_id}/documents/ingest")
async def ingest_document(
    project_id: str,
    data: IngestDocumentRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> IngestedDocumentResponse:
    """Persist and index approved chunks in Qdrant."""

    service = build_ingestion_service(session=session, settings=settings)
    return await service.ingest_document(project_id=project_id, request=data)
