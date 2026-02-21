from __future__ import annotations

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.orm import Session, sessionmaker

from src.core.config import Settings


def get_settings(request: Request) -> Settings:
    """Return app-scoped settings."""

    return request.app.state.settings


def get_db_session(request: Request) -> Iterator[Session]:
    """Yield a database session for the current request."""

    session_factory: sessionmaker[Session] = request.app.state.session_factory
    with session_factory() as session:
        yield session
