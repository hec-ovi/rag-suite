from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.core.config import Settings


def get_settings(request: Request) -> Settings:
    """Return app-scoped settings."""

    return request.app.state.settings


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    """Yield an async database session for the current request."""

    session_factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    async with session_factory() as session:
        yield session
