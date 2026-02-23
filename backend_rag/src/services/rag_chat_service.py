from __future__ import annotations

import re
from collections.abc import Iterator
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

    _inline_source_tag_pattern = re.compile(r"\s*[\[【](S\d+)[\]】]\s*")

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

    def stream_chat_stateless(
        self,
        request: RagHybridChatRequest,
    ) -> Iterator[tuple[str, dict[str, object]]]:
        """Execute one-shot hybrid RAG and yield SSE event payloads."""

        graph_state = self._build_graph_state(
            request=request,
            mode="stateless",
            session_id=None,
        )
        stream_state, llm_messages = self._graph_service.prepare_stream_stateless(graph_state)

        yield ("meta", self._build_meta_payload(stream_state, mode="stateless", session_id=None))

        answer_parts: list[str] = []
        for delta in self._graph_service.stream_generation(
            model=stream_state["chat_model"],
            messages=llm_messages,
        ):
            if not delta:
                continue

            answer_parts.append(delta)
            yield ("delta", {"content": delta})

        response = self._build_stream_response(
            stream_state=stream_state,
            mode="stateless",
            session_id=None,
            answer="".join(answer_parts),
        )
        yield ("done", response.model_dump(mode="json"))

    def stream_chat_session(
        self,
        request: RagSessionChatRequest,
    ) -> Iterator[tuple[str, dict[str, object]]]:
        """Execute session-memory hybrid RAG and yield SSE event payloads."""

        session_id = request.session_id.strip() if isinstance(request.session_id, str) else ""
        if not session_id:
            session_id = str(uuid4())

        graph_state = self._build_graph_state(
            request=request,
            mode="session",
            session_id=session_id,
        )
        stream_state, llm_messages = self._graph_service.prepare_stream_session(
            graph_state,
            session_id=session_id,
        )

        yield ("meta", self._build_meta_payload(stream_state, mode="session", session_id=session_id))

        answer_parts: list[str] = []
        for delta in self._graph_service.stream_generation(
            model=stream_state["chat_model"],
            messages=llm_messages,
        ):
            if not delta:
                continue

            answer_parts.append(delta)
            yield ("delta", {"content": delta})

        answer = "".join(answer_parts)
        normalized_answer = self._strip_inline_source_tags(answer)
        self._graph_service.persist_session_turn(
            project_id=request.project_id,
            session_id=session_id,
            user_message=request.message,
            assistant_message=normalized_answer,
        )

        response = self._build_stream_response(
            stream_state=stream_state,
            mode="session",
            session_id=session_id,
            answer=normalized_answer,
        )
        yield ("done", response.model_dump(mode="json"))

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
        answer_raw = str(output.get("answer", "")).strip()
        available_citations = {row.source_id for row in sources}
        citations_used = self._citation_parser.extract(answer=answer_raw, available_source_ids=available_citations)
        answer = self._strip_inline_source_tags(answer_raw)

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

    def _strip_inline_source_tags(self, answer: str) -> str:
        """Remove source tag markers from assistant text for cleaner UX."""

        if not answer.strip():
            return ""

        cleaned = self._inline_source_tag_pattern.sub(" ", answer)
        # Collapse any spacing artifacts left by tag removal while preserving line breaks.
        cleaned_lines = [re.sub(r"[ \t]+", " ", line).strip() for line in cleaned.splitlines()]
        normalized = "\n".join(line for line in cleaned_lines if line or len(cleaned_lines) == 1).strip()
        return normalized

    def _build_meta_payload(
        self,
        stream_state: RagGraphState,
        mode: str,
        session_id: str | None,
    ) -> dict[str, object]:
        """Build stream metadata event payload."""

        return {
            "mode": "session" if mode == "session" else "stateless",
            "session_id": session_id,
            "project_id": stream_state.get("project_id", ""),
            "query": stream_state.get("query", ""),
            "chat_model": stream_state.get("chat_model", ""),
            "embedding_model": stream_state.get("embedding_model", ""),
        }

    def _build_stream_response(
        self,
        stream_state: RagGraphState,
        mode: str,
        session_id: str | None,
        answer: str,
    ) -> RagHybridChatResponse:
        """Build final response object for stream endpoints."""

        output: RagGraphState = dict(stream_state)
        output["answer"] = answer
        return self._build_response(
            output=output,
            mode=mode,
            session_id=session_id,
        )
