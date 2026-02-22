from __future__ import annotations

from typing import Annotated

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict


class RagGraphState(TypedDict, total=False):
    """LangGraph state for hybrid RAG request execution."""

    mode: str
    session_id: str | None

    project_id: str
    document_ids: list[str] | None

    top_k: int
    dense_top_k: int
    sparse_top_k: int
    dense_weight: float
    embedding_model: str
    chat_model: str
    history_window_messages: int

    query: str
    retrieval_context: str
    retrieved_sources: list[dict[str, object]]
    retrieved_documents: list[dict[str, object]]
    answer: str

    messages: Annotated[list[AnyMessage], add_messages]
