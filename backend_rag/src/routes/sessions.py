from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from src.core.dependencies import get_rag_session_store_service
from src.models.api.session import (
    RagSessionCreateRequest,
    RagSessionListResponse,
    RagSessionRecord,
    RagSessionUpdateRequest,
)
from src.services.rag_session_store_service import RagSessionStoreService

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("")
def list_sessions(
    project_id: Annotated[str | None, Query(description="Optional project filter")] = None,
    service: RagSessionStoreService = Depends(get_rag_session_store_service),
) -> RagSessionListResponse:
    """List persisted RAG sessions sorted by latest activity."""

    return service.list_sessions(project_id=project_id)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_session(
    data: RagSessionCreateRequest,
    service: Annotated[RagSessionStoreService, Depends(get_rag_session_store_service)],
) -> RagSessionRecord:
    """Create a new persistent session row."""

    return service.create_session(data)


@router.get("/{session_id}")
def get_session(
    session_id: str,
    service: Annotated[RagSessionStoreService, Depends(get_rag_session_store_service)],
) -> RagSessionRecord:
    """Load full session snapshot by id."""

    return service.get_session(session_id)


@router.patch("/{session_id}")
def update_session(
    session_id: str,
    data: RagSessionUpdateRequest,
    service: Annotated[RagSessionStoreService, Depends(get_rag_session_store_service)],
) -> RagSessionRecord:
    """Patch one session snapshot."""

    return service.update_session(session_id, data)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    service: Annotated[RagSessionStoreService, Depends(get_rag_session_store_service)],
) -> Response:
    """Delete one persisted session."""

    service.delete_session(session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
