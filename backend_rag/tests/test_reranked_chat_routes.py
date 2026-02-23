from __future__ import annotations

from datetime import datetime, timezone

from src.reranked.models import (
    RagRerankedChatRequest,
    RagRerankedChatResponse,
    RagRerankedSessionChatRequest,
    RagRerankedSourceChunk,
    RagRerankedSourceDocument,
)
from src.reranked.routes import (
    rag_reranked_chat_session,
    rag_reranked_chat_stateless,
)


class FakeRagRerankedChatService:
    """Minimal reranked service stub for route-level tests."""

    def __init__(self) -> None:
        self.last_mode: str | None = None

    def chat_stateless(self, request: RagRerankedChatRequest) -> RagRerankedChatResponse:
        self.last_mode = "stateless"
        return self._build_response(
            mode="stateless",
            session_id=None,
            project_id=request.project_id,
            query=request.message,
        )

    def chat_session(self, request: RagRerankedSessionChatRequest) -> RagRerankedChatResponse:
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
    ) -> RagRerankedChatResponse:
        source = RagRerankedSourceChunk(
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
            original_rank=2,
            rerank_score=0.95,
        )
        document = RagRerankedSourceDocument(
            document_id="doc-1",
            document_name="Doc One",
            hit_count=1,
            top_rank=1,
            chunk_indices=[0],
        )
        return RagRerankedChatResponse(
            mode=mode,  # type: ignore[arg-type]
            session_id=session_id,
            project_id=project_id,
            query=query,
            answer="Answer",
            chat_model="gpt-oss:20b",
            embedding_model="bge-m3:latest",
            rerank_model="bge-reranker-v2-m3:latest",
            hybrid_candidates=[],
            sources=[source],
            documents=[document],
            citations_used=["S1"],
            created_at=datetime.now(timezone.utc),
        )


def test_reranked_stateless_route_returns_expected_shape() -> None:
    fake_service = FakeRagRerankedChatService()
    request = RagRerankedChatRequest(
        project_id="project-1",
        message="What changed?",
    )

    payload = rag_reranked_chat_stateless(request, fake_service)  # type: ignore[arg-type]

    assert payload.mode == "stateless"
    assert payload.project_id == "project-1"
    assert payload.sources[0].source_id == "S1"
    assert fake_service.last_mode == "stateless"


def test_reranked_session_route_returns_session_id() -> None:
    fake_service = FakeRagRerankedChatService()
    request = RagRerankedSessionChatRequest(
        project_id="project-1",
        message="Give me follow up",
        session_id="session-abc",
    )

    payload = rag_reranked_chat_session(request, fake_service)  # type: ignore[arg-type]

    assert payload.mode == "session"
    assert payload.session_id == "session-abc"
    assert fake_service.last_mode == "session"
