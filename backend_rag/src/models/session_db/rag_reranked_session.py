from __future__ import annotations

import uuid

from sqlalchemy import JSON, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models.session_db.base import SessionStoreBase, SessionTimestampMixin


class RagRerankedSessionORM(SessionStoreBase, SessionTimestampMixin):
    """Persistent snapshot for one reranked RAG chat session."""

    __tablename__ = "rag_reranked_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="Untitled Session")

    message_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    messages: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)

    selected_document_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    selected_source_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    latest_response: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text(), nullable=True)
