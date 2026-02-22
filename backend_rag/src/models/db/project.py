from __future__ import annotations

import uuid

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.db.base import Base, TimestampMixin


class ProjectORM(Base, TimestampMixin):
    """Project record used as namespace for retrieval."""

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    qdrant_collection_name: Mapped[str] = mapped_column(String(255), nullable=False)

    documents = relationship("DocumentORM", back_populates="project", cascade="all, delete-orphan")
