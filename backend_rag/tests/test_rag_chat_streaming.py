from __future__ import annotations

from src.models.api.rag import RagHybridChatRequest, RagSessionChatRequest
from src.services.rag_chat_service import RagChatService
from src.tools.citation_parser import CitationParser


class _FakeGraphService:
    def __init__(self) -> None:
        self.persist_calls: list[tuple[str, str, str, str]] = []

    def prepare_stream_stateless(self, state):  # noqa: ANN001, ANN201
        stream_state = dict(state)
        stream_state["query"] = "What changed?"
        stream_state["retrieved_sources"] = [
            {
                "rank": 1,
                "source_id": "S1",
                "chunk_key": "doc-1:0",
                "document_id": "doc-1",
                "document_name": "Doc One",
                "chunk_index": 0,
                "context_header": "Header",
                "text": "Evidence",
                "dense_score": 0.9,
                "sparse_score": 0.8,
                "hybrid_score": 0.88,
            }
        ]
        stream_state["retrieved_documents"] = [
            {
                "document_id": "doc-1",
                "document_name": "Doc One",
                "hit_count": 1,
                "top_rank": 1,
                "chunk_indices": [0],
            }
        ]
        llm_messages = [{"role": "system", "content": "grounded"}]
        return stream_state, llm_messages

    def prepare_stream_session(self, state, session_id: str):  # noqa: ANN001, ANN201
        stream_state, llm_messages = self.prepare_stream_stateless(state)
        stream_state["session_id"] = session_id
        return stream_state, llm_messages

    def stream_generation(self, model: str, messages: list[dict[str, str]]):  # noqa: ARG002, ANN201
        yield "Grounded "
        yield "answer [S1]"

    def persist_session_turn(
        self,
        project_id: str,
        session_id: str,
        user_message: str,
        assistant_message: str,
    ) -> None:
        self.persist_calls.append((project_id, session_id, user_message, assistant_message))

    def close(self) -> None:
        return None


class _FakeSessionStore:
    def __init__(self) -> None:
        self.append_calls: list[dict[str, object]] = []

    def append_turn(self, **kwargs) -> None:  # noqa: ANN003
        self.append_calls.append(kwargs)


def test_stream_chat_stateless_yields_meta_delta_done() -> None:
    service = RagChatService(
        graph_service=_FakeGraphService(),  # type: ignore[arg-type]
        citation_parser=CitationParser(),
        default_chat_model="gpt-oss:20b",
        default_embedding_model="bge-m3:latest",
        default_history_window_messages=8,
    )

    events = list(
        service.stream_chat_stateless(
            RagHybridChatRequest(
                project_id="project-1",
                message="What changed?",
            )
        )
    )

    assert events[0][0] == "meta"
    assert events[1][0] == "delta"
    assert events[-1][0] == "done"
    assert events[-1][1]["answer"] == "Grounded answer"


def test_stream_chat_session_persists_turn() -> None:
    graph = _FakeGraphService()
    session_store = _FakeSessionStore()
    service = RagChatService(
        graph_service=graph,  # type: ignore[arg-type]
        citation_parser=CitationParser(),
        default_chat_model="gpt-oss:20b",
        default_embedding_model="bge-m3:latest",
        default_history_window_messages=8,
        session_store=session_store,  # type: ignore[arg-type]
    )

    events = list(
        service.stream_chat_session(
            RagSessionChatRequest(
                project_id="project-1",
                message="Follow up",
                session_id="session-123",
            )
        )
    )

    assert events[0][0] == "meta"
    assert events[-1][0] == "done"
    assert graph.persist_calls[0][0] == "project-1"
    assert graph.persist_calls[0][1] == "session-123"
    assert graph.persist_calls[0][3] == "Grounded answer"
    assert session_store.append_calls[0]["session_id"] == "session-123"
    assert session_store.append_calls[0]["assistant_message"] == "Grounded answer"
