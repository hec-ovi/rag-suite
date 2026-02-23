from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends

from src.core.dependencies import get_rerank_service
from src.models.api.rerank import HealthResponse
from src.services.rerank_service import RerankService

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health(
    service: Annotated[RerankService, Depends(get_rerank_service)],
) -> HealthResponse:
    """Return runtime health and loaded-model metadata."""

    return HealthResponse(
        status="ok",
        device=service.resolved_device,
        default_model=service.default_model,
        loaded_models=service.loaded_models(),
        timestamp=datetime.now(timezone.utc),
    )
