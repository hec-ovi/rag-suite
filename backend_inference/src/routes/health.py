from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends

from src.core.config import Settings
from src.core.dependencies import get_settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check(settings: Annotated[Settings, Depends(get_settings)]) -> dict[str, str]:
    """Return service health status."""

    return {
        "status": "ok",
        "service": settings.app_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
