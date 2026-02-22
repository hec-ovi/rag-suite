from __future__ import annotations

from fastapi import Request

from src.core.config import Settings


def get_settings(request: Request) -> Settings:
    """Return app-scoped settings."""

    return request.app.state.settings
