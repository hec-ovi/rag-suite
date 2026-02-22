from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class RagHybridChatRequest(BaseModel):
    """Hybrid RAG chat request payload."""

    project_id: Annotated[str, Field(min_length=1, description="Target project identifier")]
    message: Annotated[str, Field(min_length=1, description="User question")]
    document_ids: Annotated[
        list[str] | None,
        Field(default=None, description="Optional document filter within the selected project"),
    ]

    top_k: Annotated[int, Field(default=6, ge=1, le=50, description="Final ranked source count")]
    dense_top_k: Annotated[int, Field(default=24, ge=1, le=100, description="Dense candidate count from Qdrant")]
    sparse_top_k: Annotated[int, Field(default=24, ge=1, le=100, description="Sparse candidate count from BM25")]
    dense_weight: Annotated[
        float,
        Field(default=0.65, ge=0.0, le=1.0, description="Dense contribution weight in hybrid fusion"),
    ]

    embedding_model: Annotated[str | None, Field(default=None, description="Optional embedding model override")]
    chat_model: Annotated[str | None, Field(default=None, description="Optional chat model override")]
    history_window_messages: Annotated[
        int,
        Field(default=8, ge=0, le=40, description="Conversation history window (session mode only)"),
    ]


class RagSessionChatRequest(RagHybridChatRequest):
    """Session-memory hybrid RAG request."""

    session_id: Annotated[
        str | None,
        Field(default=None, description="Session identifier. If omitted, backend creates a new session."),
    ]


class RagSourceChunk(BaseModel):
    """Chunk-level traced source record."""

    rank: Annotated[int, Field(description="Final rank in hybrid ordering")]
    source_id: Annotated[str, Field(description="Citation id used in prompts and answers, e.g. S1")]
    chunk_key: Annotated[str, Field(description="Stable chunk key document_id:chunk_index")]
    document_id: Annotated[str, Field(description="Document identifier")]
    document_name: Annotated[str, Field(description="Document display name")]
    chunk_index: Annotated[int, Field(description="Chunk position in source document")]
    context_header: Annotated[str, Field(description="Context-aware header stored for this chunk")]
    text: Annotated[str, Field(description="Chunk text used for retrieval context injection")]
    dense_score: Annotated[float, Field(description="Raw dense score")]
    sparse_score: Annotated[float, Field(description="Raw sparse score")]
    hybrid_score: Annotated[float, Field(description="Final fused score")]


class RagSourceDocument(BaseModel):
    """Document-level aggregation of retrieved sources."""

    document_id: Annotated[str, Field(description="Document identifier")]
    document_name: Annotated[str, Field(description="Document display name")]
    hit_count: Annotated[int, Field(description="How many ranked chunks came from this document")]
    top_rank: Annotated[int, Field(description="Best (lowest) chunk rank for this document")]
    chunk_indices: Annotated[list[int], Field(description="Ranked chunk indices returned for this document")]


class RagHybridChatResponse(BaseModel):
    """Hybrid RAG response with answer and full source trace."""

    mode: Annotated[Literal["stateless", "session"], Field(description="Chat mode used")]
    session_id: Annotated[str | None, Field(description="Session id for session mode")]

    project_id: Annotated[str, Field(description="Project identifier used for retrieval")]
    query: Annotated[str, Field(description="Resolved user query")]
    answer: Annotated[str, Field(description="Model answer")]
    chat_model: Annotated[str, Field(description="Chat model used")]
    embedding_model: Annotated[str, Field(description="Embedding model used")]

    sources: Annotated[list[RagSourceChunk], Field(description="Ordered chunk sources")]
    documents: Annotated[list[RagSourceDocument], Field(description="Aggregated source documents")]
    citations_used: Annotated[list[str], Field(description="Citation ids detected in answer text")]

    created_at: Annotated[datetime, Field(description="UTC timestamp")]
