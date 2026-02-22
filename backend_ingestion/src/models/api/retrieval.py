from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, Field


class HybridSearchRequest(BaseModel):
    """Request payload for hybrid dense+sparse retrieval."""

    query: Annotated[str, Field(min_length=1, description="User query for retrieval")]
    top_k: Annotated[int, Field(default=6, ge=1, le=50, description="Final result count returned to caller")]
    dense_top_k: Annotated[int, Field(default=20, ge=1, le=100, description="Dense candidate count from Qdrant")]
    sparse_top_k: Annotated[int, Field(default=20, ge=1, le=100, description="Sparse candidate count from BM25")]
    dense_weight: Annotated[
        float,
        Field(default=0.65, ge=0.0, le=1.0, description="Relative weight of dense score in hybrid fusion"),
    ]
    embedding_model: Annotated[
        str | None,
        Field(default=None, description="Optional embedding model override for query vectorization"),
    ]


class HybridSearchChunk(BaseModel):
    """Hybrid ranked chunk payload."""

    rank: Annotated[int, Field(description="Rank position in final hybrid ordering")]
    chunk_key: Annotated[str, Field(description="Stable chunk key document_id:chunk_index")]
    document_id: Annotated[str, Field(description="Document identifier")]
    document_name: Annotated[str, Field(description="Document display name")]
    chunk_index: Annotated[int, Field(description="Chunk order in source document")]
    context_header: Annotated[str, Field(description="Context-aware header when available")]
    text: Annotated[str, Field(description="Chunk text used for retrieval context")]
    dense_score: Annotated[float, Field(description="Raw dense vector similarity score")]
    sparse_score: Annotated[float, Field(description="Raw sparse lexical BM25 score")]
    hybrid_score: Annotated[float, Field(description="Final fused score used for ranking")]


class HybridSearchResponse(BaseModel):
    """Hybrid retrieval output."""

    project_id: Annotated[str, Field(description="Project identifier")]
    query: Annotated[str, Field(description="Query text")]
    embedding_model: Annotated[str, Field(description="Embedding model used for query vectorization")]
    dense_weight: Annotated[float, Field(description="Dense weight used in fusion")]
    chunks: Annotated[list[HybridSearchChunk], Field(description="Hybrid ranked chunks")]


class GroundedAnswerRequest(HybridSearchRequest):
    """Generate an answer grounded by hybrid retrieval."""

    answer_model: Annotated[str | None, Field(default=None, description="Optional chat model override")]


class GroundedAnswerResponse(BaseModel):
    """Grounded answer with chunk-level citations."""

    project_id: Annotated[str, Field(description="Project identifier")]
    query: Annotated[str, Field(description="User query")]
    answer: Annotated[str, Field(description="Grounded answer text")]
    answer_model: Annotated[str, Field(description="Chat model used for answer generation")]
    citations: Annotated[list[HybridSearchChunk], Field(description="Chunks passed as answer context")]
