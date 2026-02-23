from __future__ import annotations

import sqlite3
import threading
from collections.abc import Iterator
from typing import Annotated, Any
from xml.sax.saxutils import escape

from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from src.reranked.retrieval_service import RerankedRetrievalService
from src.reranked.runtime import RerankedRetrieveInput
from src.tools.inference_api_client import InferenceApiClient
from src.tools.prompt_loader import PromptLoader


class RagRerankedGraphState(TypedDict, total=False):
    """LangGraph state for hybrid+rereank request execution."""

    mode: str
    session_id: str | None

    project_id: str
    document_ids: list[str] | None

    top_k: int
    dense_top_k: int
    sparse_top_k: int
    dense_weight: float
    rerank_candidate_count: int
    embedding_model: str
    rerank_model: str
    chat_model: str
    history_window_messages: int

    query: str
    retrieval_context: str
    hybrid_candidates: list[dict[str, object]]
    retrieved_sources: list[dict[str, object]]
    retrieved_documents: list[dict[str, object]]
    answer: str

    messages: Annotated[list[AnyMessage], add_messages]


class RagRerankedGraphService:
    """LangGraph orchestrator for hybrid+rereank retrieval and grounded answer generation."""

    def __init__(
        self,
        retrieval_service: RerankedRetrievalService,
        inference_client: InferenceApiClient,
        prompt_loader: PromptLoader,
        checkpoint_path: str,
        default_history_window_messages: int,
    ) -> None:
        self._retrieval_service = retrieval_service
        self._inference_client = inference_client
        self._default_history_window_messages = max(default_history_window_messages, 0)

        self._system_prompt = prompt_loader.load("hybrid_rag_system.md")
        self._user_prompt_template = prompt_loader.load("hybrid_rag_user.md")

        self._checkpoint_connection = sqlite3.connect(checkpoint_path, check_same_thread=False)
        self._checkpointer = SqliteSaver(self._checkpoint_connection)
        self._checkpointer.setup()

        self._stateless_graph = self._build_graph().compile()
        self._session_graph = self._build_graph().compile(checkpointer=self._checkpointer)

        self._session_lock = threading.Lock()

    def close(self) -> None:
        """Close durable checkpoint resources."""

        self._checkpoint_connection.close()

    def invoke_stateless(self, state: RagRerankedGraphState) -> RagRerankedGraphState:
        """Run one-shot RAG flow without memory persistence."""

        response = self._stateless_graph.invoke(state)
        return response  # type: ignore[return-value]

    def invoke_session(self, state: RagRerankedGraphState, session_id: str) -> RagRerankedGraphState:
        """Run RAG flow with persistent conversation memory by session id."""

        thread_id = f"reranked:{state['project_id']}:{session_id}"
        with self._session_lock:
            response = self._session_graph.invoke(
                state,
                config={"configurable": {"thread_id": thread_id}},
            )

        return response  # type: ignore[return-value]

    def prepare_stream_stateless(
        self,
        state: RagRerankedGraphState,
    ) -> tuple[RagRerankedGraphState, list[dict[str, str]]]:
        """Prepare retrieval + generation messages for streamed stateless answer."""

        stream_state: RagRerankedGraphState = dict(state)
        stream_state.update(self._retrieve_node(stream_state))

        llm_messages, resolved_query = self._build_generation_messages(
            state=stream_state,
            messages=stream_state.get("messages", []),
        )
        stream_state["query"] = resolved_query
        return stream_state, llm_messages

    def prepare_stream_session(
        self,
        state: RagRerankedGraphState,
        session_id: str,
    ) -> tuple[RagRerankedGraphState, list[dict[str, str]]]:
        """Prepare retrieval + generation messages for streamed session answer."""

        thread_id = f"reranked:{state['project_id']}:{session_id}"
        with self._session_lock:
            snapshot = self._session_graph.get_state(
                config={"configurable": {"thread_id": thread_id}},
            )

        previous_messages_raw = snapshot.values.get("messages")
        previous_messages = previous_messages_raw if isinstance(previous_messages_raw, list) else []
        current_messages = state.get("messages", [])
        merged_messages = [*previous_messages, *current_messages]

        stream_state: RagRerankedGraphState = dict(state)
        stream_state["messages"] = merged_messages
        stream_state.update(self._retrieve_node(stream_state))

        llm_messages, resolved_query = self._build_generation_messages(
            state=stream_state,
            messages=merged_messages,
        )
        stream_state["query"] = resolved_query
        return stream_state, llm_messages

    def stream_generation(self, model: str, messages: list[dict[str, str]]) -> Iterator[str]:
        """Stream assistant token deltas from inference backend."""

        yield from self._inference_client.stream_chat_deltas(
            model=model,
            messages=messages,
        )

    def persist_session_turn(
        self,
        project_id: str,
        session_id: str,
        user_message: str,
        assistant_message: str,
    ) -> None:
        """Persist one user/assistant exchange into LangGraph checkpoints."""

        user_content = user_message.strip()
        assistant_content = assistant_message.strip()
        if not user_content:
            return

        thread_id = f"reranked:{project_id}:{session_id}"
        with self._session_lock:
            config = {"configurable": {"thread_id": thread_id}}
            next_config = self._session_graph.update_state(
                config=config,
                values={"messages": [{"role": "user", "content": user_content}]},
                as_node="generate",
            )
            if assistant_content:
                self._session_graph.update_state(
                    config=next_config,
                    values={"messages": [{"role": "assistant", "content": assistant_content}]},
                    as_node="generate",
                )

    def _build_graph(self) -> StateGraph[RagRerankedGraphState]:
        """Create retrieve->generate graph."""

        graph = StateGraph(RagRerankedGraphState)
        graph.add_node("retrieve", self._retrieve_node)
        graph.add_node("generate", self._generate_node)

        graph.add_edge(START, "retrieve")
        graph.add_edge("retrieve", "generate")
        graph.add_edge("generate", END)
        return graph

    def _retrieve_node(self, state: RagRerankedGraphState) -> dict[str, object]:
        """Retrieve, rerank, and rank sources for the current user query."""

        query = self._latest_user_query(state.get("messages", []))
        result = self._retrieval_service.retrieve(
            RerankedRetrieveInput(
                project_id=state["project_id"],
                query=query,
                document_ids=state.get("document_ids"),
                top_k=state["top_k"],
                dense_top_k=state["dense_top_k"],
                sparse_top_k=state["sparse_top_k"],
                dense_weight=state["dense_weight"],
                embedding_model=state["embedding_model"],
                rerank_model=state["rerank_model"],
                rerank_candidate_count=state["rerank_candidate_count"],
            )
        )

        hybrid_candidates = [
            {
                "rank": row.rank,
                "source_id": row.source_id,
                "chunk_key": row.chunk_key,
                "document_id": row.document_id,
                "document_name": row.document_name,
                "chunk_index": row.chunk_index,
                "context_header": row.context_header,
                "text": row.text,
                "dense_score": row.dense_score,
                "sparse_score": row.sparse_score,
                "hybrid_score": row.hybrid_score,
            }
            for row in result.hybrid_candidates
        ]
        source_rows = [
            {
                "rank": row.rank,
                "source_id": row.source_id,
                "chunk_key": row.chunk_key,
                "document_id": row.document_id,
                "document_name": row.document_name,
                "chunk_index": row.chunk_index,
                "context_header": row.context_header,
                "text": row.text,
                "dense_score": row.dense_score,
                "sparse_score": row.sparse_score,
                "hybrid_score": row.hybrid_score,
                "original_rank": row.original_rank,
                "rerank_score": row.rerank_score,
            }
            for row in result.sources
        ]
        document_rows = [
            {
                "document_id": row.document_id,
                "document_name": row.document_name,
                "hit_count": row.hit_count,
                "top_rank": row.top_rank,
                "chunk_indices": row.chunk_indices,
            }
            for row in result.documents
        ]

        return {
            "query": query,
            "embedding_model": result.embedding_model,
            "rerank_model": result.rerank_model,
            "hybrid_candidates": hybrid_candidates,
            "retrieved_sources": source_rows,
            "retrieved_documents": document_rows,
            "retrieval_context": self._build_retrieval_context(source_rows),
        }

    def _generate_node(self, state: RagRerankedGraphState) -> dict[str, object]:
        """Generate grounded answer using retrieved context and optional memory."""

        llm_messages, _query = self._build_generation_messages(
            state=state,
            messages=state.get("messages", []),
        )

        answer = self._inference_client.complete_chat(
            model=state["chat_model"],
            messages=llm_messages,
        )

        return {
            "answer": answer,
            "messages": [{"role": "assistant", "content": answer}],
        }

    def _build_generation_messages(
        self,
        state: RagRerankedGraphState,
        messages: list[Any],
    ) -> tuple[list[dict[str, str]], str]:
        """Construct grounded prompt messages for chat generation."""

        query = state.get("query", "").strip()
        if not query:
            query = self._latest_user_query(messages)

        history_window = max(state.get("history_window_messages", self._default_history_window_messages), 0)
        history_messages, current_query = self._split_history_and_current_question(messages, fallback_query=query)
        if history_window > 0:
            history_messages = history_messages[-history_window:]
        else:
            history_messages = []

        resolved_query = current_query.strip() if current_query.strip() else query
        user_prompt = self._user_prompt_template.format(
            question=resolved_query,
            retrieved_context=state.get("retrieval_context", "<source_set empty=\"true\" />"),
        )

        llm_messages: list[dict[str, str]] = [
            {"role": "system", "content": self._system_prompt},
            *history_messages,
            {"role": "user", "content": user_prompt},
        ]
        return llm_messages, resolved_query

    def _latest_user_query(self, messages: list[Any]) -> str:
        """Resolve latest user message text from LangGraph message state."""

        for message in reversed(messages):
            if isinstance(message, HumanMessage):
                content = message.content
                if isinstance(content, str) and content.strip():
                    return content.strip()

            if isinstance(message, dict):
                role = message.get("role")
                content_raw = message.get("content")
                if role == "user" and isinstance(content_raw, str) and content_raw.strip():
                    return content_raw.strip()

        return ""

    def _split_history_and_current_question(
        self,
        messages: list[Any],
        fallback_query: str,
    ) -> tuple[list[dict[str, str]], str]:
        """Map LangGraph message history into OpenAI chat messages."""

        openai_messages = self._to_openai_messages(messages)
        if openai_messages and openai_messages[-1]["role"] == "user":
            current_query = openai_messages[-1]["content"].strip()
            return openai_messages[:-1], current_query

        return openai_messages, fallback_query

    def _to_openai_messages(self, messages: list[Any]) -> list[dict[str, str]]:
        """Convert LangChain messages to OpenAI-compatible role/content dicts."""

        rows: list[dict[str, str]] = []
        for message in messages:
            if isinstance(message, dict):
                content_raw = message.get("content")
            else:
                content_raw = getattr(message, "content", "")

            content = content_raw.strip() if isinstance(content_raw, str) else ""
            if not content:
                continue

            role = self._resolve_role(message)
            if role is None:
                continue

            rows.append({"role": role, "content": content})

        return rows

    def _resolve_role(self, message: Any) -> str | None:
        """Map LangChain message type to OpenAI chat role."""

        if isinstance(message, HumanMessage):
            return "user"
        if isinstance(message, AIMessage):
            return "assistant"
        if isinstance(message, SystemMessage):
            return "system"
        if isinstance(message, dict):
            role = message.get("role")
            if role in {"user", "assistant", "system"}:
                return role
        return None

    def _build_retrieval_context(self, sources: list[dict[str, Any]]) -> str:
        """Build XML-tagged retrieval context for robust grounding."""

        if not sources:
            return "<source_set empty=\"true\" />"

        blocks: list[str] = ["<source_set>"]
        for source in sources:
            source_id = escape(str(source.get("source_id", "")))
            document_id = escape(str(source.get("document_id", "")))
            document_name = escape(str(source.get("document_name", "")))
            chunk_index = escape(str(source.get("chunk_index", "")))
            context_header = escape(str(source.get("context_header", "")))
            chunk_text = escape(str(source.get("text", "")))

            blocks.extend(
                [
                    (
                        f"  <source id=\"{source_id}\" document_id=\"{document_id}\" "
                        f"document_name=\"{document_name}\" chunk_index=\"{chunk_index}\">"
                    ),
                    f"    <context_header>{context_header}</context_header>",
                    f"    <chunk_text>{chunk_text}</chunk_text>",
                    "  </source>",
                ]
            )

        blocks.append("</source_set>")
        return "\n".join(blocks)
