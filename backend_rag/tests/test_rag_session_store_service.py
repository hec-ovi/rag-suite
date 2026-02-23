from __future__ import annotations

from datetime import datetime, timezone
from tempfile import TemporaryDirectory

import pytest

from src.core.exceptions import ResourceNotFoundError
from src.core.session_database import (
    build_session_store_engine,
    build_session_store_factory,
    initialize_session_store_database,
)
from src.models.api.rag import RagHybridChatResponse
from src.models.api.session import RagSessionCreateRequest, RagSessionMessage, RagSessionUpdateRequest
from src.services.rag_session_store_service import RagSessionStoreService


def _build_response(session_id: str, query: str) -> RagHybridChatResponse:
    return RagHybridChatResponse(
        mode="session",
        session_id=session_id,
        project_id="project-1",
        query=query,
        answer="Grounded answer",
        chat_model="gpt-oss:20b",
        embedding_model="bge-m3:latest",
        sources=[],
        documents=[],
        citations_used=[],
        created_at=datetime.now(timezone.utc),
    )


def _build_service(tmp_path: str) -> RagSessionStoreService:
    engine = build_session_store_engine(f"sqlite:///{tmp_path}/rag_sessions_test.db")
    initialize_session_store_database(engine)
    factory = build_session_store_factory(engine)
    return RagSessionStoreService(factory)


def test_crud_and_snapshot_update_roundtrip() -> None:
    with TemporaryDirectory() as tmp_dir:
        service = _build_service(tmp_dir)

        created = service.create_session(
            RagSessionCreateRequest(
                project_id="project-1",
                selected_document_ids=["doc-1"],
            )
        )
        assert created.message_count == 0

        listed = service.list_sessions()
        assert len(listed.sessions) == 1
        assert listed.sessions[0].id == created.id

        now = datetime.now(timezone.utc)
        updated = service.update_session(
            created.id,
            RagSessionUpdateRequest(
                title="Updated Session",
                selected_source_id="S1",
                selected_document_ids=["doc-2"],
                latest_response=_build_response(created.id, "what changed"),
                messages=[
                    RagSessionMessage(
                        id="msg-1",
                        role="user",
                        content="hello",
                        created_at=now,
                    ),
                    RagSessionMessage(
                        id="msg-2",
                        role="assistant",
                        content="hi there",
                        created_at=now,
                    ),
                ],
            ),
        )

        assert updated.title == "Updated Session"
        assert updated.message_count == 2
        assert updated.selected_document_ids == ["doc-2"]
        assert updated.latest_response is not None
        assert updated.latest_response.query == "what changed"

        loaded = service.get_session(created.id)
        assert loaded.messages[0].content == "hello"
        assert loaded.selected_source_id == "S1"

        service.delete_session(created.id)
        assert service.list_sessions().sessions == []

        with pytest.raises(ResourceNotFoundError):
            service.get_session(created.id)


def test_append_turn_creates_and_appends_messages() -> None:
    with TemporaryDirectory() as tmp_dir:
        service = _build_service(tmp_dir)

        first = service.append_turn(
            session_id="session-abc",
            project_id="project-1",
            user_message="first question",
            assistant_message="first answer",
            selected_document_ids=["doc-1"],
            latest_response=_build_response("session-abc", "first question"),
        )
        second = service.append_turn(
            session_id="session-abc",
            project_id="project-1",
            user_message="second question",
            assistant_message="second answer",
            selected_document_ids=["doc-1", "doc-2"],
            latest_response=_build_response("session-abc", "second question"),
        )

        assert first.message_count == 2
        assert second.message_count == 4
        assert second.latest_response is not None
        assert second.latest_response.query == "second question"
        assert second.selected_document_ids == ["doc-1", "doc-2"]
