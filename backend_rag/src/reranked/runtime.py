from __future__ import annotations

from dataclasses import dataclass

from src.models.runtime.retrieval import RankedSourceChunk, RetrievedSourceDocument


@dataclass(slots=True)
class RerankedRetrieveInput:
    """Hybrid+rereank retrieval parameters for one query."""

    project_id: str
    query: str
    document_ids: list[str] | None
    top_k: int
    dense_top_k: int
    sparse_top_k: int
    dense_weight: float
    embedding_model: str
    rerank_model: str
    rerank_candidate_count: int


@dataclass(slots=True)
class RerankedSourceChunk(RankedSourceChunk):
    """Final reranked source chunk with original hybrid rank lineage."""

    original_rank: int
    rerank_score: float


@dataclass(slots=True)
class RerankedRetrieveResult:
    """Hybrid+rereank retrieval output used by prompt construction and API response."""

    project_id: str
    query: str
    embedding_model: str
    rerank_model: str
    hybrid_candidates: list[RankedSourceChunk]
    sources: list[RerankedSourceChunk]
    documents: list[RetrievedSourceDocument]
