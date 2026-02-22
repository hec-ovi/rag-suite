from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field


class CreateProjectRequest(BaseModel):
    """Request payload for project creation."""

    name: Annotated[str, Field(min_length=2, max_length=200, description="Human-friendly project name")]
    description: Annotated[str | None, Field(default=None, description="Optional project description")]


class ProjectResponse(BaseModel):
    """Project metadata response."""

    id: Annotated[str, Field(description="Project unique identifier")]
    name: Annotated[str, Field(description="Project name")]
    description: Annotated[str | None, Field(description="Project description")]
    qdrant_collection_name: Annotated[str, Field(description="Qdrant collection assigned to this project")]
    created_at: Annotated[datetime, Field(description="Project creation timestamp in UTC")]


class ProjectListResponse(BaseModel):
    """Project list wrapper."""

    projects: Annotated[list[ProjectResponse], Field(description="Projects available for ingestion")]


class DocumentSummaryResponse(BaseModel):
    """Document summary record for a project."""

    id: Annotated[str, Field(description="Document identifier")]
    name: Annotated[str, Field(description="Document name")]
    source_type: Annotated[str, Field(description="Document source type")]
    chunk_count: Annotated[int, Field(description="Number of chunks stored for this document")]
    workflow_mode: Annotated[str, Field(description="Ingestion workflow mode used for this document")]
    chunking_mode: Annotated[str, Field(description="Chunking mode used during ingestion")]
    contextualization_mode: Annotated[str, Field(description="Contextualization mode used during ingestion")]
    used_normalization: Annotated[bool, Field(description="Whether normalized_text differs from raw_text")]
    used_agentic_chunking: Annotated[bool, Field(description="Whether agentic chunking mode was used")]
    has_contextual_headers: Annotated[bool, Field(description="Whether chunks include non-empty context headers")]
    created_at: Annotated[datetime, Field(description="Creation timestamp in UTC")]


class ChunkSummaryResponse(BaseModel):
    """Chunk detail used for inspection views."""

    id: Annotated[str, Field(description="Chunk identifier")]
    chunk_index: Annotated[int, Field(description="Chunk order inside the document")]
    start_char: Annotated[int, Field(description="Start offset in normalized text")]
    end_char: Annotated[int, Field(description="End offset in normalized text")]
    rationale: Annotated[str | None, Field(description="Chunking rationale")]
    context_header: Annotated[str | None, Field(description="Context header attached before embedding")]
    raw_chunk: Annotated[str, Field(description="Raw chunk snapshot available at ingestion time")]
    normalized_chunk: Annotated[str, Field(description="Normalized chunk text")]
    contextualized_chunk: Annotated[str, Field(description="Header + chunk text used for embedding")]
    created_at: Annotated[datetime, Field(description="Chunk creation timestamp in UTC")]


class DeleteProjectResponse(BaseModel):
    """Project deletion summary."""

    project_id: Annotated[str, Field(description="Deleted project identifier")]
    qdrant_collection_name: Annotated[str, Field(description="Deleted Qdrant collection name")]
    deleted_document_count: Annotated[int, Field(description="Number of deleted documents")]
    deleted_chunk_count: Annotated[int, Field(description="Number of deleted chunks")]
