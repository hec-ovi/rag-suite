from __future__ import annotations

from pathlib import Path

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

import src.models.session_db  # noqa: F401
from src.models.session_db.base import SessionStoreBase


def resolve_sqlite_url(database_url: str) -> str:
    """Resolve sqlite URLs to absolute paths under backend-rag root."""

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


def build_session_store_engine(database_url: str) -> Engine:
    """Create SQLAlchemy engine for the isolated session store."""

    return create_engine(resolve_sqlite_url(database_url), future=True)


def build_session_store_factory(engine: Engine) -> sessionmaker[Session]:
    """Create session factory for isolated session-store engine."""

    return sessionmaker(engine, expire_on_commit=False)


def initialize_session_store_database(engine: Engine) -> None:
    """Create all session-store tables when database is empty."""

    SessionStoreBase.metadata.create_all(bind=engine)
