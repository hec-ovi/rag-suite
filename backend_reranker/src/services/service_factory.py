from __future__ import annotations

from src.core.config import Settings
from src.services.rerank_service import RerankService
from src.tools.cross_encoder_reranker import CrossEncoderReranker


def build_rerank_service(settings: Settings) -> RerankService:
    """Build rerank service with configured cross-encoder runtime."""

    return RerankService(
        reranker=CrossEncoderReranker(
            default_model=settings.rerank_default_model,
            configured_device=settings.rerank_device,
            max_length=settings.rerank_max_length,
            batch_size=settings.rerank_batch_size,
            use_fp16=settings.rerank_use_fp16,
            unload_after_request=settings.rerank_unload_after_request,
        )
    )
