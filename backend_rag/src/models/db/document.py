from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.db.base import Base, TimestampMixin


class DocumentORM(Base, TimestampMixin):
    """Document metadata and workflow settings from ingestion stage."""

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)

    raw_text: Mapped[str] = mapped_column(Text(), nullable=False)
    normalized_text: Mapped[str] = mapped_column(Text(), nullable=False)

    workflow_mode: Mapped[str] = mapped_column(String(32), nullable=False)
    chunking_mode: Mapped[str] = mapped_column(String(32), nullable=False)
    contextualization_mode: Mapped[str] = mapped_column(String(32), nullable=False)

    normalization_version: Mapped[str] = mapped_column(String(50), nullable=False)
    chunking_version: Mapped[str] = mapped_column(String(50), nullable=False)
    contextualization_version: Mapped[str] = mapped_column(String(50), nullable=False)
    embedding_model: Mapped[str] = mapped_column(String(120), nullable=False)

    project = relationship("ProjectORM", back_populates="documents")
    chunks = relationship("ChunkORM", back_populates="document", cascade="all, delete-orphan")
