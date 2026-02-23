from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from src.core.dependencies import get_rerank_service
from src.models.api.rerank import RerankRequest, RerankResponse
from src.services.rerank_service import RerankService

router = APIRouter(tags=["Rerank"])


@router.post("/rerank")
def rerank(
    data: RerankRequest,
    service: Annotated[RerankService, Depends(get_rerank_service)],
) -> RerankResponse:
    """Score and rank candidate documents for a single query."""

    return service.rerank(data)
