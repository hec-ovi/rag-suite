from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from src.core.dependencies import get_rag_reranked_session_store_service
from src.reranked.models import (
    RagRerankedSessionCreateRequest,
    RagRerankedSessionListResponse,
    RagRerankedSessionRecord,
    RagRerankedSessionUpdateRequest,
)
from src.reranked.session_store_service import RagRerankedSessionStoreService

router = APIRouter(prefix="/reranked/sessions", tags=["Reranked Sessions"])


@router.get("")
def list_reranked_sessions(
    service: Annotated[RagRerankedSessionStoreService, Depends(get_rag_reranked_session_store_service)],
    project_id: Annotated[str | None, Query(description="Optional project filter")] = None,
) -> RagRerankedSessionListResponse:
    """List persisted reranked sessions sorted by latest activity."""

    return service.list_sessions(project_id=project_id)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_reranked_session(
    data: RagRerankedSessionCreateRequest,
    service: Annotated[RagRerankedSessionStoreService, Depends(get_rag_reranked_session_store_service)],
) -> RagRerankedSessionRecord:
    """Create a new persistent reranked session row."""

    return service.create_session(data)


@router.get("/{session_id}")
def get_reranked_session(
    session_id: str,
    service: Annotated[RagRerankedSessionStoreService, Depends(get_rag_reranked_session_store_service)],
) -> RagRerankedSessionRecord:
    """Load full reranked session snapshot by id."""

    return service.get_session(session_id)


@router.patch("/{session_id}")
def update_reranked_session(
    session_id: str,
    data: RagRerankedSessionUpdateRequest,
    service: Annotated[RagRerankedSessionStoreService, Depends(get_rag_reranked_session_store_service)],
) -> RagRerankedSessionRecord:
    """Patch one reranked session snapshot."""

    return service.update_session(session_id, data)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reranked_session(
    session_id: str,
    service: Annotated[RagRerankedSessionStoreService, Depends(get_rag_reranked_session_store_service)],
) -> Response:
    """Delete one persisted reranked session."""

    service.delete_session(session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
