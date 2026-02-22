from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class RetrievalChunkCandidate:
    """Chunk candidate available for retrieval scoring."""

    chunk_key: str
    document_id: str
    document_name: str
    chunk_index: int
    context_header: str
    text: str


@dataclass(slots=True)
class RankedChunkCandidate(RetrievalChunkCandidate):
    """Chunk candidate with dense/sparse/hybrid scores."""

    dense_score: float
    sparse_score: float
    hybrid_score: float
