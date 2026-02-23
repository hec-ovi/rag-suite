from __future__ import annotations

from datetime import datetime, timezone

from src.reranked.models import (
    RagRerankedChatResponse,
    RagRerankedSessionCreateRequest,
    RagRerankedSessionListResponse,
    RagRerankedSessionMessage,
    RagRerankedSessionRecord,
    RagRerankedSessionSummary,
    RagRerankedSessionUpdateRequest,
)
from src.reranked.session_routes import (
    create_reranked_session,
    delete_reranked_session,
    get_reranked_session,
    list_reranked_sessions,
    update_reranked_session,
)


def _build_response(session_id: str) -> RagRerankedChatResponse:
    return RagRerankedChatResponse(
        mode="session",
        session_id=session_id,
        project_id="project-1",
        query="What changed?",
        answer="Grounded answer",
        chat_model="gpt-oss:20b",
        embedding_model="bge-m3:latest",
        rerank_model="bge-reranker-v2-m3:latest",
        hybrid_candidates=[],
        sources=[],
        documents=[],
        citations_used=[],
        created_at=datetime.now(timezone.utc),
    )


def _build_record(session_id: str) -> RagRerankedSessionRecord:
    now = datetime.now(timezone.utc)
    return RagRerankedSessionRecord(
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
            RagRerankedSessionMessage(
                id="msg-1",
                role="user",
                content="hi",
                created_at=now,
            ),
            RagRerankedSessionMessage(
                id="msg-2",
                role="assistant",
                content="hello",
                created_at=now,
            ),
        ],
    )


class FakeRerankedSessionStoreService:
    """Simple stub for reranked session route tests."""

    def __init__(self) -> None:
        self.deleted_ids: list[str] = []
        self.last_filter: str | None = None
        self.record = _build_record("session-1")

    def list_sessions(self, project_id: str | None = None) -> RagRerankedSessionListResponse:
        self.last_filter = project_id
        return RagRerankedSessionListResponse(
            sessions=[
                RagRerankedSessionSummary(
                    id=self.record.id,
                    project_id=self.record.project_id,
                    title=self.record.title,
                    message_count=self.record.message_count,
                    created_at=self.record.created_at,
                    updated_at=self.record.updated_at,
                )
            ]
        )

    def create_session(self, request: RagRerankedSessionCreateRequest) -> RagRerankedSessionRecord:
        self.record.project_id = request.project_id
        return self.record

    def get_session(self, session_id: str) -> RagRerankedSessionRecord:
        self.record.id = session_id
        return self.record

    def update_session(self, session_id: str, request: RagRerankedSessionUpdateRequest) -> RagRerankedSessionRecord:
        self.record.id = session_id
        if request.title is not None:
            self.record.title = request.title
        return self.record

    def delete_session(self, session_id: str) -> None:
        self.deleted_ids.append(session_id)


def test_list_reranked_sessions_route_supports_project_filter() -> None:
    service = FakeRerankedSessionStoreService()

    payload = list_reranked_sessions(project_id="project-1", service=service)  # type: ignore[arg-type]

    assert payload.sessions[0].id == "session-1"
    assert service.last_filter == "project-1"


def test_create_get_update_delete_reranked_session_routes() -> None:
    service = FakeRerankedSessionStoreService()

    created = create_reranked_session(
        RagRerankedSessionCreateRequest(project_id="project-1"),
        service,  # type: ignore[arg-type]
    )
    loaded = get_reranked_session("session-abc", service)  # type: ignore[arg-type]
    updated = update_reranked_session(
        "session-abc",
        RagRerankedSessionUpdateRequest(title="Renamed"),
        service,  # type: ignore[arg-type]
    )
    deleted = delete_reranked_session("session-abc", service)  # type: ignore[arg-type]

    assert created.project_id == "project-1"
    assert loaded.id == "session-abc"
    assert updated.title == "Renamed"
    assert deleted.status_code == 204
    assert service.deleted_ids == ["session-abc"]
