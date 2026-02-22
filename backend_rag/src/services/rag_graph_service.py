from __future__ import annotations

import sqlite3
import threading
from typing import Any
from xml.sax.saxutils import escape

from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph

from src.models.runtime.graph import RagGraphState
from src.models.runtime.retrieval import HybridRetrieveInput
from src.services.hybrid_retrieval_service import HybridRetrievalService
from src.tools.inference_api_client import InferenceApiClient
from src.tools.prompt_loader import PromptLoader


class RagGraphService:
    """LangGraph orchestrator for hybrid retrieval + grounded answer generation."""

    def __init__(
        self,
        retrieval_service: HybridRetrievalService,
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

    def invoke_stateless(self, state: RagGraphState) -> RagGraphState:
        """Run one-shot RAG flow without memory persistence."""

        response = self._stateless_graph.invoke(state)
        return response  # type: ignore[return-value]

    def invoke_session(self, state: RagGraphState, session_id: str) -> RagGraphState:
        """Run RAG flow with persistent conversation memory by session id."""

        thread_id = f"{state['project_id']}:{session_id}"
        with self._session_lock:
            response = self._session_graph.invoke(
                state,
                config={"configurable": {"thread_id": thread_id}},
            )

        return response  # type: ignore[return-value]

    def _build_graph(self) -> StateGraph[RagGraphState]:
        """Create retrieve->generate graph."""

        graph = StateGraph(RagGraphState)
        graph.add_node("retrieve", self._retrieve_node)
        graph.add_node("generate", self._generate_node)

        graph.add_edge(START, "retrieve")
        graph.add_edge("retrieve", "generate")
        graph.add_edge("generate", END)
        return graph

    def _retrieve_node(self, state: RagGraphState) -> dict[str, object]:
        """Retrieve and rank sources for the current user query."""

        query = self._latest_user_query(state.get("messages", []))
        result = self._retrieval_service.retrieve(
            HybridRetrieveInput(
                project_id=state["project_id"],
                query=query,
                document_ids=state.get("document_ids"),
                top_k=state["top_k"],
                dense_top_k=state["dense_top_k"],
                sparse_top_k=state["sparse_top_k"],
                dense_weight=state["dense_weight"],
                embedding_model=state["embedding_model"],
            )
        )

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
            "retrieved_sources": source_rows,
            "retrieved_documents": document_rows,
            "retrieval_context": self._build_retrieval_context(source_rows),
        }

    def _generate_node(self, state: RagGraphState) -> dict[str, object]:
        """Generate grounded answer using retrieved context and optional memory."""

        query = state.get("query", "").strip()
        if not query:
            query = self._latest_user_query(state.get("messages", []))

        history_window = max(state.get("history_window_messages", self._default_history_window_messages), 0)
        history_messages, _ = self._split_history_and_current_question(state.get("messages", []), fallback_query=query)
        if history_window > 0:
            history_messages = history_messages[-history_window:]
        else:
            history_messages = []

        user_prompt = self._user_prompt_template.format(
            question=query,
            retrieved_context=state.get("retrieval_context", "<source_set empty=\"true\" />"),
        )

        llm_messages: list[dict[str, str]] = [
            {"role": "system", "content": self._system_prompt},
            *history_messages,
            {"role": "user", "content": user_prompt},
        ]

        answer = self._inference_client.complete_chat(
            model=state["chat_model"],
            messages=llm_messages,
        )

        return {
            "answer": answer,
            "messages": [{"role": "assistant", "content": answer}],
        }

    def _latest_user_query(self, messages: list[AnyMessage]) -> str:
        """Resolve latest user message text from LangGraph message state."""

        for message in reversed(messages):
            if isinstance(message, HumanMessage):
                content = message.content
                if isinstance(content, str) and content.strip():
                    return content.strip()

        return ""

    def _split_history_and_current_question(
        self,
        messages: list[AnyMessage],
        fallback_query: str,
    ) -> tuple[list[dict[str, str]], str]:
        """Map LangGraph message history into OpenAI chat messages."""

        openai_messages = self._to_openai_messages(messages)
        if openai_messages and openai_messages[-1]["role"] == "user":
            current_query = openai_messages[-1]["content"].strip()
            return openai_messages[:-1], current_query

        return openai_messages, fallback_query

    def _to_openai_messages(self, messages: list[AnyMessage]) -> list[dict[str, str]]:
        """Convert LangChain messages to OpenAI-compatible role/content dicts."""

        rows: list[dict[str, str]] = []
        for message in messages:
            content = message.content if isinstance(message.content, str) else ""
            content = content.strip()
            if not content:
                continue

            role = self._resolve_role(message)
            if role is None:
                continue

            rows.append({"role": role, "content": content})

        return rows

    def _resolve_role(self, message: AnyMessage) -> str | None:
        """Map LangChain message type to OpenAI chat role."""

        if isinstance(message, HumanMessage):
            return "user"
        if isinstance(message, AIMessage):
            return "assistant"
        if isinstance(message, SystemMessage):
            return "system"
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
