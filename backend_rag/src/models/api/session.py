from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from src.models.api.rag import RagHybridChatResponse


class RagSessionMessage(BaseModel):
    """Persisted chat message row for one session."""

    id: Annotated[str, Field(min_length=1, description="Message identifier")]
    role: Annotated[Literal["user", "assistant"], Field(description="Chat role")]
    content: Annotated[str, Field(description="Message text")]
    created_at: Annotated[datetime, Field(description="UTC timestamp")]


class RagSessionSummary(BaseModel):
    """Session metadata row used by sidebar listings."""

    id: Annotated[str, Field(description="Session identifier")]
    project_id: Annotated[str, Field(description="Bound project identifier")]
    title: Annotated[str, Field(description="Display title")]
    message_count: Annotated[int, Field(description="Persisted message count")]
    created_at: Annotated[datetime, Field(description="Creation timestamp")]
    updated_at: Annotated[datetime, Field(description="Last update timestamp")]


class RagSessionRecord(RagSessionSummary):
    """Full session snapshot payload."""

    selected_document_ids: Annotated[list[str], Field(description="Document filter for retrieval scope")]
    selected_source_id: Annotated[str | None, Field(description="Last selected source id in UI")]
    latest_response: Annotated[
        RagHybridChatResponse | None,
        Field(description="Last RAG response snapshot used by the source panel"),
    ]
    messages: Annotated[list[RagSessionMessage], Field(description="Session chat transcript")]


class RagSessionListResponse(BaseModel):
    """Session listing response."""

    sessions: Annotated[list[RagSessionSummary], Field(description="Session summaries sorted by updated_at desc")]


class RagSessionCreateRequest(BaseModel):
    """Create a new persistent RAG session."""

    project_id: Annotated[str, Field(min_length=1, description="Project namespace for the session")]
    title: Annotated[str | None, Field(default=None, description="Optional title override")]
    selected_document_ids: Annotated[
        list[str] | None,
        Field(default=None, description="Optional initial selected document ids"),
    ]


class RagSessionUpdateRequest(BaseModel):
    """Patch one persistent session snapshot."""

    project_id: Annotated[str | None, Field(default=None, description="Optional project rebinding")]
    title: Annotated[str | None, Field(default=None, description="Optional title update")]
    selected_document_ids: Annotated[
        list[str] | None,
        Field(default=None, description="Optional selected document ids"),
    ]
    selected_source_id: Annotated[str | None, Field(default=None, description="Optional active source id")]
    latest_response: Annotated[
        RagHybridChatResponse | None,
        Field(default=None, description="Optional latest response snapshot"),
    ]
    messages: Annotated[list[RagSessionMessage] | None, Field(default=None, description="Optional transcript replace")]
