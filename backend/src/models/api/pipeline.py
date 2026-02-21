from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class NormalizeTextRequest(BaseModel):
    """Normalize source text with deterministic cleanup rules."""

    text: Annotated[str, Field(min_length=1, description="Raw text payload")]
    max_blank_lines: Annotated[int, Field(default=1, ge=1, le=3, description="Maximum consecutive blank lines to keep")]
    remove_repeated_short_lines: Annotated[
        bool,
        Field(default=True, description="Remove repeated short lines likely coming from headers or footers"),
    ]


class NormalizeTextResponse(BaseModel):
    """Normalized text output and cleanup statistics."""

    normalized_text: Annotated[str, Field(description="Deterministically normalized text")]
    removed_repeated_line_count: Annotated[int, Field(description="How many repeated short lines were removed")]
    collapsed_whitespace_count: Annotated[int, Field(description="How many whitespace runs were collapsed")]


class ChunkProposal(BaseModel):
    """Chunk proposal from deterministic or agentic chunking."""

    chunk_index: Annotated[int, Field(description="Chunk order")]
    start_char: Annotated[int, Field(description="Start offset in source text")]
    end_char: Annotated[int, Field(description="End offset in source text")]
    text: Annotated[str, Field(description="Chunk body text")]
    rationale: Annotated[str | None, Field(description="Short rationale for this boundary")]


class ChunkTextRequest(BaseModel):
    """Request chunk proposals from a selected mode."""

    text: Annotated[str, Field(min_length=1, description="Source text to chunk")]
    mode: Annotated[Literal["deterministic", "agentic"], Field(description="Chunking mode")]
    max_chunk_chars: Annotated[int, Field(default=1500, ge=500, le=8000, description="Maximum characters per chunk")]
    min_chunk_chars: Annotated[int, Field(default=350, ge=100, le=3000, description="Minimum target chunk size")]
    overlap_chars: Annotated[int, Field(default=120, ge=0, le=1000, description="Overlap characters between chunks")]
    llm_model: Annotated[str | None, Field(default=None, description="Override chat model for agentic mode")]


class ChunkTextResponse(BaseModel):
    """Chunk proposal list."""

    mode: Annotated[Literal["deterministic", "agentic"], Field(description="Chunking mode used")]
    chunks: Annotated[list[ChunkProposal], Field(description="Proposed chunks")]


class ChunkingOptions(BaseModel):
    """Reusable chunking options for ingestion mode."""

    mode: Annotated[Literal["deterministic", "agentic"], Field(default="deterministic", description="Chunking mode")]
    max_chunk_chars: Annotated[int, Field(default=1500, ge=500, le=8000, description="Maximum characters per chunk")]
    min_chunk_chars: Annotated[int, Field(default=350, ge=100, le=3000, description="Minimum target chunk size")]
    overlap_chars: Annotated[int, Field(default=120, ge=0, le=1000, description="Overlap characters between chunks")]


class ContextualizedChunk(BaseModel):
    """Chunk enriched with contextual header before embedding."""

    chunk_index: Annotated[int, Field(description="Chunk order")]
    start_char: Annotated[int, Field(description="Start offset")]
    end_char: Annotated[int, Field(description="End offset")]
    rationale: Annotated[str | None, Field(description="Chunking rationale")]
    chunk_text: Annotated[str, Field(description="Chunk text before contextualization")]
    context_header: Annotated[str, Field(description="Short contextual header")]
    contextualized_text: Annotated[str, Field(description="Header plus chunk text")]


class ContextualizeChunksRequest(BaseModel):
    """Generate contextual headers for chunks."""

    document_name: Annotated[str, Field(min_length=1, description="Document title used by the contextualizer")]
    full_document_text: Annotated[str, Field(min_length=1, description="Full normalized document text")]
    chunks: Annotated[list[ChunkProposal], Field(min_length=1, description="Chunks to contextualize")]
    mode: Annotated[Literal["llm", "template"], Field(default="llm", description="Context header generation mode")]
    llm_model: Annotated[str | None, Field(default=None, description="Override chat model for llm mode")]


class ContextualizeChunksResponse(BaseModel):
    """Contextualized chunk payload."""

    mode: Annotated[Literal["llm", "template"], Field(description="Context generation mode used")]
    chunks: Annotated[list[ContextualizedChunk], Field(description="Contextualized chunks")]


class PipelineAutomationFlags(BaseModel):
    """Flags controlling fully automated ingestion."""

    normalize_text: Annotated[bool, Field(default=True, description="Run deterministic normalization")]
    agentic_chunking: Annotated[bool, Field(default=False, description="Use LLM chunk boundary proposal")]
    contextual_headers: Annotated[bool, Field(default=True, description="Generate contextual chunk headers")]


class ApprovedChunkInput(BaseModel):
    """Manually approved chunk payload ready for embedding and indexing."""

    chunk_index: Annotated[int, Field(description="Chunk order")]
    start_char: Annotated[int, Field(description="Start offset")]
    end_char: Annotated[int, Field(description="End offset")]
    rationale: Annotated[str | None, Field(default=None, description="Chunking rationale")]
    normalized_chunk: Annotated[str, Field(min_length=1, description="Chunk text after normalization")]
    context_header: Annotated[str | None, Field(default=None, description="Context header")]
    contextualized_chunk: Annotated[str, Field(min_length=1, description="Final chunk text for embedding")]


class IngestDocumentRequest(BaseModel):
    """Persist document ingestion and index vectors in Qdrant."""

    document_name: Annotated[str, Field(min_length=1, max_length=255, description="Document display name")]
    source_type: Annotated[str, Field(default="text", max_length=32, description="Document source type")]
    raw_text: Annotated[str, Field(min_length=1, description="Raw extracted text")]
    workflow_mode: Annotated[Literal["automatic", "manual"], Field(description="Pipeline execution mode")]

    automation: Annotated[
        PipelineAutomationFlags,
        Field(default_factory=PipelineAutomationFlags, description="Automation controls for automatic mode"),
    ]

    chunk_options: Annotated[
        ChunkingOptions,
        Field(default_factory=ChunkingOptions, description="Chunking options used in automatic mode"),
    ]

    contextualization_mode: Annotated[
        Literal["llm", "template"],
        Field(default="llm", description="Context mode in automatic mode"),
    ]

    llm_model: Annotated[str | None, Field(default=None, description="Override chat model")]
    embedding_model: Annotated[str | None, Field(default=None, description="Override embedding model")]

    normalized_text: Annotated[
        str | None,
        Field(default=None, description="Manually reviewed normalized text (required for manual mode)"),
    ]
    approved_chunks: Annotated[
        list[ApprovedChunkInput] | None,
        Field(default=None, description="Approved chunks (required for manual mode)"),
    ]


class IngestedDocumentResponse(BaseModel):
    """Result of persisted ingestion."""

    project_id: Annotated[str, Field(description="Project identifier")]
    document_id: Annotated[str, Field(description="Persisted document identifier")]
    qdrant_collection_name: Annotated[str, Field(description="Target Qdrant collection")]
    embedded_chunk_count: Annotated[int, Field(description="Number of embedded/indexed chunks")]
    embedding_model: Annotated[str, Field(description="Embedding model used")]
    chunking_mode: Annotated[str, Field(description="Chunking mode used")]
    contextualization_mode: Annotated[str, Field(description="Contextualization mode used")]
    created_at: Annotated[datetime, Field(description="Document creation timestamp")]
