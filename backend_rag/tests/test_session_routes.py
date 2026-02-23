from __future__ import annotations

from datetime import datetime, timezone

from src.models.api.rag import RagHybridChatResponse
from src.models.api.session import (
    RagSessionCreateRequest,
    RagSessionListResponse,
    RagSessionMessage,
    RagSessionRecord,
    RagSessionSummary,
    RagSessionUpdateRequest,
)
from src.routes.sessions import create_session, delete_session, get_session, list_sessions, update_session


def _build_response(session_id: str) -> RagHybridChatResponse:
    return RagHybridChatResponse(
        mode="session",
        session_id=session_id,
        project_id="project-1",
        query="What changed?",
        answer="Grounded answer",
        chat_model="gpt-oss:20b",
        embedding_model="bge-m3:latest",
        sources=[],
        documents=[],
        citations_used=[],
        created_at=datetime.now(timezone.utc),
    )


def _build_record(session_id: str) -> RagSessionRecord:
    now = datetime.now(timezone.utc)
    return RagSessionRecord(
        id=session_id,
        project_id="project-1",
        title="Session One",
        message_count=2,
        created_at=now,
        updated_at=now,
        selected_document_ids=["doc-1"],
        selected_source_id="S1",
        latest_response=_build_response(session_id),
        messages=[
            RagSessionMessage(
                id="msg-1",
                role="user",
                content="hi",
                created_at=now,
            ),
            RagSessionMessage(
                id="msg-2",
                role="assistant",
                content="hello",
                created_at=now,
            ),
        ],
    )


class FakeSessionStoreService:
    """Simple stub for session route tests."""

    def __init__(self) -> None:
        self.deleted_ids: list[str] = []
        self.last_filter: str | None = None
        self.record = _build_record("session-1")

    def list_sessions(self, project_id: str | None = None) -> RagSessionListResponse:
        self.last_filter = project_id
        return RagSessionListResponse(
            sessions=[
                RagSessionSummary(
                    id=self.record.id,
                    project_id=self.record.project_id,
                    title=self.record.title,
                    message_count=self.record.message_count,
                    created_at=self.record.created_at,
                    updated_at=self.record.updated_at,
                )
            ]
        )

    def create_session(self, request: RagSessionCreateRequest) -> RagSessionRecord:
        self.record.project_id = request.project_id
        return self.record

    def get_session(self, session_id: str) -> RagSessionRecord:
        self.record.id = session_id
        return self.record

    def update_session(self, session_id: str, request: RagSessionUpdateRequest) -> RagSessionRecord:
        self.record.id = session_id
        if request.title is not None:
            self.record.title = request.title
        return self.record

    def delete_session(self, session_id: str) -> None:
        self.deleted_ids.append(session_id)


def test_list_sessions_route_supports_project_filter() -> None:
    service = FakeSessionStoreService()

    payload = list_sessions(project_id="project-1", service=service)  # type: ignore[arg-type]

    assert payload.sessions[0].id == "session-1"
    assert service.last_filter == "project-1"


def test_create_get_update_delete_session_routes() -> None:
    service = FakeSessionStoreService()

    created = create_session(
        RagSessionCreateRequest(project_id="project-1"),
        service,  # type: ignore[arg-type]
    )
    loaded = get_session("session-abc", service)  # type: ignore[arg-type]
    updated = update_session(
        "session-abc",
        RagSessionUpdateRequest(title="Renamed"),
        service,  # type: ignore[arg-type]
    )
    deleted = delete_session("session-abc", service)  # type: ignore[arg-type]

    assert created.project_id == "project-1"
    assert loaded.id == "session-abc"
    assert updated.title == "Renamed"
    assert deleted.status_code == 204
    assert service.deleted_ids == ["session-abc"]
