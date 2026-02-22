from __future__ import annotations

import uuid

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.db.base import Base, TimestampMixin


class ChunkORM(Base, TimestampMixin):
    """Chunk-level record with contextual text and vector metadata."""

    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)

    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_char: Mapped[int] = mapped_column(Integer, nullable=False)
    end_char: Mapped[int] = mapped_column(Integer, nullable=False)

    rationale: Mapped[str | None] = mapped_column(Text(), nullable=True)

    raw_chunk: Mapped[str] = mapped_column(Text(), nullable=False)
    normalized_chunk: Mapped[str] = mapped_column(Text(), nullable=False)
    context_header: Mapped[str | None] = mapped_column(Text(), nullable=True)
    contextualized_chunk: Mapped[str] = mapped_column(Text(), nullable=False)

    approved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    qdrant_point_id: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)

    document = relationship("DocumentORM", back_populates="chunks")
