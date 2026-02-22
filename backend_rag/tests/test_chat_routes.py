from __future__ import annotations

from datetime import datetime, timezone

from src.models.api.rag import (
    RagHybridChatRequest,
    RagHybridChatResponse,
    RagSessionChatRequest,
    RagSourceChunk,
    RagSourceDocument,
)
from src.routes.rag import (
    rag_chat_session,
    rag_chat_stateless,
)


class FakeRagChatService:
    """Minimal service stub for route-level tests."""

    def __init__(self) -> None:
        self.last_mode: str | None = None

    def chat_stateless(self, request: RagHybridChatRequest) -> RagHybridChatResponse:
        self.last_mode = "stateless"
        return self._build_response(
            mode="stateless",
            session_id=None,
            project_id=request.project_id,
            query=request.message,
        )

    def chat_session(self, request: RagSessionChatRequest) -> RagHybridChatResponse:
        self.last_mode = "session"
        session_id = request.session_id or "generated-session"
        return self._build_response(
            mode="session",
            session_id=session_id,
            project_id=request.project_id,
            query=request.message,
        )

    def _build_response(
        self,
        mode: str,
        session_id: str | None,
        project_id: str,
        query: str,
    ) -> RagHybridChatResponse:
        source = RagSourceChunk(
            rank=1,
            source_id="S1",
            chunk_key="doc-1:0",
            document_id="doc-1",
            document_name="Doc One",
            chunk_index=0,
            context_header="Header",
            text="Chunk text",
            dense_score=0.9,
            sparse_score=0.7,
            hybrid_score=0.85,
        )
        document = RagSourceDocument(
            document_id="doc-1",
            document_name="Doc One",
            hit_count=1,
            top_rank=1,
            chunk_indices=[0],
        )
        return RagHybridChatResponse(
            mode=mode,  # type: ignore[arg-type]
            session_id=session_id,
            project_id=project_id,
            query=query,
            answer="Answer [S1]",
            chat_model="gpt-oss:20b",
            embedding_model="bge-m3:latest",
            sources=[source],
            documents=[document],
            citations_used=["S1"],
            created_at=datetime.now(timezone.utc),
        )


def test_stateless_route_returns_expected_shape() -> None:
    fake_service = FakeRagChatService()
    request = RagHybridChatRequest(
        project_id="project-1",
        message="What changed?",
    )

    payload = rag_chat_stateless(request, fake_service)  # type: ignore[arg-type]

    assert payload.mode == "stateless"
    assert payload.project_id == "project-1"
    assert payload.sources[0].source_id == "S1"
    assert fake_service.last_mode == "stateless"


def test_session_route_returns_session_id() -> None:
    fake_service = FakeRagChatService()
    request = RagSessionChatRequest(
        project_id="project-1",
        message="Give me follow up",
        session_id="session-abc",
    )

    payload = rag_chat_session(request, fake_service)  # type: ignore[arg-type]

    assert payload.mode == "session"
    assert payload.session_id == "session-abc"
    assert fake_service.last_mode == "session"
