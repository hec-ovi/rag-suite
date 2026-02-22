from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class HybridRetrieveInput:
    """Hybrid retrieval parameters for a single query."""

    project_id: str
    query: str
    document_ids: list[str] | None
    top_k: int
    dense_top_k: int
    sparse_top_k: int
    dense_weight: float
    embedding_model: str


@dataclass(slots=True)
class RetrievalChunkCandidate:
    """Chunk candidate available for dense/sparse scoring."""

    chunk_key: str
    document_id: str
    document_name: str
    chunk_index: int
    context_header: str
    text: str


@dataclass(slots=True)
class RankedSourceChunk(RetrievalChunkCandidate):
    """Ranked chunk candidate with hybrid score components."""

    source_id: str
    rank: int
    dense_score: float
    sparse_score: float
    hybrid_score: float


@dataclass(slots=True)
class RetrievedSourceDocument:
    """Document summary derived from ranked chunks."""

    document_id: str
    document_name: str
    hit_count: int
    top_rank: int
    chunk_indices: list[int]


@dataclass(slots=True)
class HybridRetrieveResult:
    """Hybrid retrieval output used for prompt construction and API response."""

    project_id: str
    query: str
    embedding_model: str
    sources: list[RankedSourceChunk]
    documents: list[RetrievedSourceDocument]
