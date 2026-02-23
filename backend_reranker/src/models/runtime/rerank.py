from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class RerankResult:
    """One reranked row returned by the model."""

    index: int
    relevance_score: float


@dataclass(slots=True)
class RerankRunResult:
    """Normalized rerank output for one request."""

    resolved_model: str
    results: list[RerankResult]
