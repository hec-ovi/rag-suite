from __future__ import annotations

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

import src.models.db  # noqa: F401
from src.models.db.base import Base


def _resolve_database_url(database_url: str) -> str:
    """Resolve sqlite URLs to an absolute path under the backend folder."""

    prefix = "sqlite+aiosqlite:///"
    if not database_url.startswith(prefix):
        return database_url

    database_path = database_url.removeprefix(prefix)
    if database_path.startswith("/"):
        return database_url

    project_root = Path(__file__).resolve().parents[2]
    absolute_path = project_root / database_path
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    return f"{prefix}{absolute_path}"


def build_engine(database_url: str) -> AsyncEngine:
    """Create the async SQLAlchemy engine."""

    return create_async_engine(_resolve_database_url(database_url), future=True)


def build_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Create the async session factory."""

    return async_sessionmaker(engine, expire_on_commit=False)


async def initialize_database(engine: AsyncEngine) -> None:
    """Create all tables if missing."""

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
