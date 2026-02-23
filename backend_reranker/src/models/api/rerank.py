from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Service health payload."""

    status: Annotated[str, Field(description="Service status")]
    device: Annotated[str, Field(description="Resolved compute device")]
    default_model: Annotated[str, Field(description="Default reranker model")]
    loaded_models: Annotated[list[str], Field(description="Currently loaded model ids")]
    timestamp: Annotated[datetime, Field(description="UTC timestamp")]


class RerankRequest(BaseModel):
    """Rerank request for query-document relevance sorting."""

    model: Annotated[str, Field(min_length=1, description="Reranker model name or alias")]
    query: Annotated[str, Field(min_length=1, description="User query used for relevance scoring")]
    documents: Annotated[list[str], Field(min_length=1, description="Candidate documents to rerank")]
    top_n: Annotated[int | None, Field(default=None, ge=1, le=200, description="Optional top-N cutoff")]


class RerankResultRow(BaseModel):
    """One reranked document reference with relevance score."""

    index: Annotated[int, Field(description="Original index in documents array")]
    relevance_score: Annotated[float, Field(description="Reranker relevance score")]


class RerankResponse(BaseModel):
    """Rerank response payload."""

    model: Annotated[str, Field(description="Reranker model used")]
    resolved_model: Annotated[str, Field(description="Resolved model id loaded by backend")]
    results: Annotated[list[RerankResultRow], Field(description="Reranked result rows")]
