from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class RagRerankedChatRequest(BaseModel):
    """Hybrid + rerank chat request payload."""

    project_id: Annotated[str, Field(min_length=1, description="Target project identifier")]
    message: Annotated[str, Field(min_length=1, description="User question")]
    document_ids: Annotated[
        list[str] | None,
        Field(default=None, description="Optional document filter within the selected project"),
    ]

    top_k: Annotated[int, Field(default=6, ge=1, le=50, description="Final ranked source count after reranking")]
    dense_top_k: Annotated[int, Field(default=24, ge=1, le=100, description="Dense candidate count from Qdrant")]
    sparse_top_k: Annotated[int, Field(default=24, ge=1, le=100, description="Sparse candidate count from BM25")]
    dense_weight: Annotated[
        float,
        Field(default=0.65, ge=0.0, le=1.0, description="Dense contribution weight in hybrid fusion"),
    ]
    rerank_candidate_count: Annotated[
        int,
        Field(default=16, ge=1, le=100, description="Hybrid candidate pool size passed into reranker"),
    ]
    rerank_model: Annotated[str | None, Field(default=None, description="Optional reranker model override")]

    embedding_model: Annotated[str | None, Field(default=None, description="Optional embedding model override")]
    chat_model: Annotated[str | None, Field(default=None, description="Optional chat model override")]
    history_window_messages: Annotated[
        int,
        Field(default=8, ge=0, le=40, description="Conversation history window (session mode only)"),
    ]


class RagRerankedSessionChatRequest(RagRerankedChatRequest):
    """Session-memory hybrid+rereank request."""

    session_id: Annotated[
        str | None,
        Field(default=None, description="Session identifier. If omitted, backend creates a new session."),
    ]


class RagRerankedHybridCandidateChunk(BaseModel):
    """Chunk row in pre-rerank hybrid order."""

    rank: Annotated[int, Field(description="Hybrid rank before reranker")]
    source_id: Annotated[str, Field(description="Hybrid source id")]
    chunk_key: Annotated[str, Field(description="Stable chunk key document_id:chunk_index")]
    document_id: Annotated[str, Field(description="Document identifier")]
    document_name: Annotated[str, Field(description="Document display name")]
    chunk_index: Annotated[int, Field(description="Chunk position in source document")]
    context_header: Annotated[str, Field(description="Context-aware header stored for this chunk")]
    text: Annotated[str, Field(description="Chunk text used for retrieval context injection")]
    dense_score: Annotated[float, Field(description="Raw dense score")]
    sparse_score: Annotated[float, Field(description="Raw sparse score")]
    hybrid_score: Annotated[float, Field(description="Final fused hybrid score before rerank")]


class RagRerankedSourceChunk(BaseModel):
    """Chunk row in final reranked order."""

    rank: Annotated[int, Field(description="Final rank after reranker")]
    source_id: Annotated[str, Field(description="Citation id used in prompts and answers, e.g. S1")]
    chunk_key: Annotated[str, Field(description="Stable chunk key document_id:chunk_index")]
    document_id: Annotated[str, Field(description="Document identifier")]
    document_name: Annotated[str, Field(description="Document display name")]
    chunk_index: Annotated[int, Field(description="Chunk position in source document")]
    context_header: Annotated[str, Field(description="Context-aware header stored for this chunk")]
    text: Annotated[str, Field(description="Chunk text used for retrieval context injection")]
    dense_score: Annotated[float, Field(description="Raw dense score")]
    sparse_score: Annotated[float, Field(description="Raw sparse score")]
    hybrid_score: Annotated[float, Field(description="Hybrid score before rerank")]
    original_rank: Annotated[int, Field(description="Hybrid rank before rerank")]
    rerank_score: Annotated[float, Field(description="Reranker relevance score")]


class RagRerankedSourceDocument(BaseModel):
    """Document-level aggregation of reranked sources."""

    document_id: Annotated[str, Field(description="Document identifier")]
    document_name: Annotated[str, Field(description="Document display name")]
    hit_count: Annotated[int, Field(description="How many ranked chunks came from this document")]
    top_rank: Annotated[int, Field(description="Best (lowest) chunk rank for this document")]
    chunk_indices: Annotated[list[int], Field(description="Ranked chunk indices returned for this document")]


class RagRerankedChatResponse(BaseModel):
    """Hybrid+rereank response with answer and source trace."""

    mode: Annotated[Literal["stateless", "session"], Field(description="Chat mode used")]
    session_id: Annotated[str | None, Field(description="Session id for session mode")]

    project_id: Annotated[str, Field(description="Project identifier used for retrieval")]
    query: Annotated[str, Field(description="Resolved user query")]
    answer: Annotated[str, Field(description="Model answer")]
    chat_model: Annotated[str, Field(description="Chat model used")]
    embedding_model: Annotated[str, Field(description="Embedding model used")]
    rerank_model: Annotated[str, Field(description="Reranker model used")]

    hybrid_candidates: Annotated[list[RagRerankedHybridCandidateChunk], Field(description="Pre-rerank hybrid list")]
    sources: Annotated[list[RagRerankedSourceChunk], Field(description="Final reranked source list")]
    documents: Annotated[list[RagRerankedSourceDocument], Field(description="Aggregated source documents")]
    citations_used: Annotated[list[str], Field(description="Citation ids detected in answer text")]

    created_at: Annotated[datetime, Field(description="UTC timestamp")]


class RagRerankedSessionMessage(BaseModel):
    """Persisted chat message row for one reranked session."""

    id: Annotated[str, Field(min_length=1, description="Message identifier")]
    role: Annotated[Literal["user", "assistant"], Field(description="Chat role")]
    content: Annotated[str, Field(description="Message text")]
    created_at: Annotated[datetime, Field(description="UTC timestamp")]


class RagRerankedSessionSummary(BaseModel):
    """Reranked session metadata row used by sidebar listings."""

    id: Annotated[str, Field(description="Session identifier")]
    project_id: Annotated[str, Field(description="Bound project identifier")]
    title: Annotated[str, Field(description="Display title")]
    message_count: Annotated[int, Field(description="Persisted message count")]
    created_at: Annotated[datetime, Field(description="Creation timestamp")]
    updated_at: Annotated[datetime, Field(description="Last update timestamp")]


class RagRerankedSessionRecord(RagRerankedSessionSummary):
    """Full reranked session snapshot payload."""

    selected_document_ids: Annotated[list[str], Field(description="Document filter for retrieval scope")]
    selected_source_id: Annotated[str | None, Field(description="Last selected source id in UI")]
    latest_response: Annotated[
        RagRerankedChatResponse | None,
        Field(description="Last reranked response snapshot used by the source panel"),
    ]
    messages: Annotated[list[RagRerankedSessionMessage], Field(description="Session chat transcript")]


class RagRerankedSessionListResponse(BaseModel):
    """Reranked session listing response."""

    sessions: Annotated[
        list[RagRerankedSessionSummary],
        Field(description="Session summaries sorted by updated_at desc"),
    ]


class RagRerankedSessionCreateRequest(BaseModel):
    """Create a new persistent reranked session."""

    project_id: Annotated[str, Field(min_length=1, description="Project namespace for the session")]
    title: Annotated[str | None, Field(default=None, description="Optional title override")]
    selected_document_ids: Annotated[
        list[str] | None,
        Field(default=None, description="Optional initial selected document ids"),
    ]


class RagRerankedSessionUpdateRequest(BaseModel):
    """Patch one persistent reranked session snapshot."""

    project_id: Annotated[str | None, Field(default=None, description="Optional project rebinding")]
    title: Annotated[str | None, Field(default=None, description="Optional title update")]
    selected_document_ids: Annotated[
        list[str] | None,
        Field(default=None, description="Optional selected document ids"),
    ]
    selected_source_id: Annotated[str | None, Field(default=None, description="Optional active source id")]
    latest_response: Annotated[
        RagRerankedChatResponse | None,
        Field(default=None, description="Optional latest response snapshot"),
    ]
    messages: Annotated[
        list[RagRerankedSessionMessage] | None,
        Field(default=None, description="Optional transcript replace"),
    ]
