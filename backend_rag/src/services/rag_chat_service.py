from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from src.models.api.rag import (
    RagHybridChatRequest,
    RagHybridChatResponse,
    RagSessionChatRequest,
    RagSourceChunk,
    RagSourceDocument,
)
from src.models.runtime.graph import RagGraphState
from src.services.rag_graph_service import RagGraphService
from src.tools.citation_parser import CitationParser


class RagChatService:
    """Public service API for stateless and session-memory hybrid chat."""

    def __init__(
        self,
        graph_service: RagGraphService,
        citation_parser: CitationParser,
        default_chat_model: str,
        default_embedding_model: str,
        default_history_window_messages: int,
    ) -> None:
        self._graph_service = graph_service
        self._citation_parser = citation_parser
        self._default_chat_model = default_chat_model
        self._default_embedding_model = default_embedding_model
        self._default_history_window_messages = max(default_history_window_messages, 0)

    def chat_stateless(self, request: RagHybridChatRequest) -> RagHybridChatResponse:
        """Execute one-shot hybrid RAG answer generation."""

        graph_state = self._build_graph_state(
            request=request,
            mode="stateless",
            session_id=None,
        )
        output = self._graph_service.invoke_stateless(graph_state)
        return self._build_response(
            output=output,
            mode="stateless",
            session_id=None,
        )

    def chat_session(self, request: RagSessionChatRequest) -> RagHybridChatResponse:
        """Execute hybrid RAG answer generation with persistent session memory."""

        session_id = request.session_id.strip() if isinstance(request.session_id, str) else ""
        if not session_id:
            session_id = str(uuid4())

        graph_state = self._build_graph_state(
            request=request,
            mode="session",
            session_id=session_id,
        )
        output = self._graph_service.invoke_session(graph_state, session_id=session_id)
        return self._build_response(
            output=output,
            mode="session",
            session_id=session_id,
        )

    def close(self) -> None:
        """Release graph/checkpoint resources."""

        self._graph_service.close()

    def _build_graph_state(
        self,
        request: RagHybridChatRequest,
        mode: str,
        session_id: str | None,
    ) -> RagGraphState:
        """Normalize request payload into graph input state."""

        embedding_model = request.embedding_model or self._default_embedding_model
        chat_model = request.chat_model or self._default_chat_model
        history_window = request.history_window_messages
        if history_window < 0:
            history_window = self._default_history_window_messages

        return {
            "mode": mode,
            "session_id": session_id,
            "project_id": request.project_id,
            "document_ids": request.document_ids,
            "top_k": request.top_k,
            "dense_top_k": request.dense_top_k,
            "sparse_top_k": request.sparse_top_k,
            "dense_weight": request.dense_weight,
            "embedding_model": embedding_model,
            "chat_model": chat_model,
            "history_window_messages": history_window,
            "messages": [{"role": "user", "content": request.message}],
        }

    def _build_response(
        self,
        output: RagGraphState,
        mode: str,
        session_id: str | None,
    ) -> RagHybridChatResponse:
        """Build final API response from graph output state."""

        sources = [RagSourceChunk.model_validate(row) for row in output.get("retrieved_sources", [])]
        documents = [RagSourceDocument.model_validate(row) for row in output.get("retrieved_documents", [])]
        answer = str(output.get("answer", "")).strip()
        available_citations = {row.source_id for row in sources}
        citations_used = self._citation_parser.extract(answer=answer, available_source_ids=available_citations)

        return RagHybridChatResponse(
            mode="session" if mode == "session" else "stateless",
            session_id=session_id,
            project_id=str(output.get("project_id", "")),
            query=str(output.get("query", "")),
            answer=answer,
            chat_model=str(output.get("chat_model", "")),
            embedding_model=str(output.get("embedding_model", "")),
            sources=sources,
            documents=documents,
            citations_used=citations_used,
            created_at=datetime.now(timezone.utc),
        )
