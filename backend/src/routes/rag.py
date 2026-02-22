from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.core.config import Settings
from src.core.dependencies import get_db_session, get_settings
from src.models.api.retrieval import (
    GroundedAnswerRequest,
    GroundedAnswerResponse,
    HybridSearchRequest,
    HybridSearchResponse,
)
from src.services.service_factory import build_retrieval_service

router = APIRouter(prefix="/projects", tags=["RAG"])


@router.post("/{project_id}/rag/search")
async def hybrid_search(
    project_id: str,
    data: HybridSearchRequest,
    session: Annotated[Session, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> HybridSearchResponse:
    """Retrieve relevant chunks using dense+sparse hybrid scoring."""

    service = build_retrieval_service(session=session, settings=settings)
    return await service.hybrid_search(project_id=project_id, request=data)


@router.post("/{project_id}/rag/answer")
async def grounded_answer(
    project_id: str,
    data: GroundedAnswerRequest,
    session: Annotated[Session, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> GroundedAnswerResponse:
    """Generate a grounded answer with citations from hybrid retrieval."""

    service = build_retrieval_service(session=session, settings=settings)
    return await service.grounded_answer(project_id=project_id, request=data)
