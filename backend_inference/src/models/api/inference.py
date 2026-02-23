from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """OpenAI-style chat message."""

    role: Annotated[Literal["system", "user", "assistant"], Field(description="Message role")]
    content: Annotated[str, Field(min_length=1, description="Message content")]


class ChatCompletionsRequest(BaseModel):
    """OpenAI-compatible chat completions request."""

    model: Annotated[str, Field(min_length=1, description="Model name")]
    messages: Annotated[list[ChatMessage], Field(min_length=1, description="Conversation messages")]
    temperature: Annotated[float, Field(default=0.0, ge=0.0, le=2.0, description="Sampling temperature")]
    max_tokens: Annotated[int | None, Field(default=None, ge=1, le=16384, description="Maximum output tokens")]
    stream: Annotated[bool, Field(default=False, description="Return SSE stream when true")]


class CompletionUsage(BaseModel):
    """Token usage object."""

    prompt_tokens: Annotated[int, Field(description="Prompt token count")]
    completion_tokens: Annotated[int, Field(description="Generated token count")]
    total_tokens: Annotated[int, Field(description="Total token count")]


class ChatCompletionChoiceMessage(BaseModel):
    """Assistant message in completion choice."""

    role: Annotated[Literal["assistant"], Field(description="Assistant role")]
    content: Annotated[str, Field(description="Generated assistant content")]


class ChatCompletionChoice(BaseModel):
    """Chat completion choice."""

    index: Annotated[int, Field(description="Choice index")]
    message: Annotated[ChatCompletionChoiceMessage, Field(description="Assistant message")]
    finish_reason: Annotated[str, Field(description="Completion finish reason")]


class ChatCompletionsResponse(BaseModel):
    """OpenAI-compatible chat completions response."""

    id: Annotated[str, Field(description="Completion identifier")]
    object: Annotated[Literal["chat.completion"], Field(description="Object type")]
    created: Annotated[int, Field(description="Unix timestamp")]
    model: Annotated[str, Field(description="Model used")]
    choices: Annotated[list[ChatCompletionChoice], Field(description="Returned choices")]
    usage: Annotated[CompletionUsage, Field(description="Token usage summary")]
    created_at: Annotated[datetime, Field(description="ISO timestamp for logging/audit")]


class CompletionsRequest(BaseModel):
    """OpenAI-compatible text completions request."""

    model: Annotated[str, Field(min_length=1, description="Model name")]
    prompt: Annotated[str | list[str], Field(description="Prompt text")]
    temperature: Annotated[float, Field(default=0.0, ge=0.0, le=2.0, description="Sampling temperature")]
    max_tokens: Annotated[int | None, Field(default=None, ge=1, le=16384, description="Maximum output tokens")]
    stream: Annotated[bool, Field(default=False, description="Streaming flag (currently unsupported)")]


class CompletionChoice(BaseModel):
    """Text completion choice."""

    text: Annotated[str, Field(description="Generated text")]
    index: Annotated[int, Field(description="Choice index")]
    finish_reason: Annotated[str, Field(description="Completion finish reason")]


class CompletionsResponse(BaseModel):
    """OpenAI-compatible text completions response."""

    id: Annotated[str, Field(description="Completion identifier")]
    object: Annotated[Literal["text_completion"], Field(description="Object type")]
    created: Annotated[int, Field(description="Unix timestamp")]
    model: Annotated[str, Field(description="Model used")]
    choices: Annotated[list[CompletionChoice], Field(description="Returned choices")]
    usage: Annotated[CompletionUsage, Field(description="Token usage summary")]
    created_at: Annotated[datetime, Field(description="ISO timestamp for logging/audit")]


class EmbeddingsRequest(BaseModel):
    """OpenAI-compatible embeddings request."""

    model: Annotated[str, Field(min_length=1, description="Embedding model name")]
    input: Annotated[str | list[str], Field(description="Input text or list of texts")]


class EmbeddingData(BaseModel):
    """Single embedding row."""

    object: Annotated[Literal["embedding"], Field(description="Object type")]
    index: Annotated[int, Field(description="Embedding index")]
    embedding: Annotated[list[float], Field(description="Embedding vector")]


class EmbeddingsUsage(BaseModel):
    """Embedding usage object."""

    prompt_tokens: Annotated[int, Field(description="Prompt token count")]
    total_tokens: Annotated[int, Field(description="Total token count")]


class EmbeddingsResponse(BaseModel):
    """OpenAI-compatible embeddings response."""

    object: Annotated[Literal["list"], Field(description="Object type")]
    model: Annotated[str, Field(description="Model used")]
    data: Annotated[list[EmbeddingData], Field(description="Generated embeddings")]
    usage: Annotated[EmbeddingsUsage, Field(description="Token usage summary")]


class RerankRequest(BaseModel):
    """Rerank request for query-document relevance sorting."""

    model: Annotated[str, Field(min_length=1, description="Reranker model name")]
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
    results: Annotated[list[RerankResultRow], Field(description="Reranked result rows")]
