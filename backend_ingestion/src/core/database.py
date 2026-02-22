from __future__ import annotations

from pathlib import Path

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

import src.models.db  # noqa: F401
from src.models.db.base import Base


def _resolve_database_url(database_url: str) -> str:
    """Resolve sqlite URLs to an absolute path under the service project root."""

    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        return database_url

    database_path = database_url.removeprefix(prefix)
    if database_path.startswith("/"):
        return database_url

    project_root = Path(__file__).resolve().parents[2]
    absolute_path = project_root / database_path
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    return f"{prefix}{absolute_path}"


def build_engine(database_url: str) -> Engine:
    """Create the SQLAlchemy engine."""

    return create_engine(_resolve_database_url(database_url), future=True)


def build_session_factory(engine: Engine) -> sessionmaker[Session]:
    """Create the SQLAlchemy session factory."""

    return sessionmaker(engine, expire_on_commit=False)


def initialize_database(engine: Engine) -> None:
    """Create all tables if missing."""

    Base.metadata.create_all(bind=engine)
