from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ChatGenerationResult:
    """Normalized chat generation output from Ollama."""

    content: str
    prompt_tokens: int
    completion_tokens: int
    finish_reason: str


@dataclass(slots=True)
class ChatStreamChunk:
    """Normalized streamed chat delta payload from Ollama."""

    content_delta: str
    done: bool
    finish_reason: str | None
    prompt_tokens: int | None
    completion_tokens: int | None


@dataclass(slots=True)
class EmbeddingGenerationResult:
    """Normalized embedding output from Ollama."""

    embeddings: list[list[float]]
    prompt_tokens: int


@dataclass(slots=True)
class RerankResult:
    """One rerank row returned by Ollama."""

    index: int
    relevance_score: float


@dataclass(slots=True)
class RerankGenerationResult:
    """Normalized rerank output from Ollama."""

    results: list[RerankResult]
