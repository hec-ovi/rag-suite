from __future__ import annotations

from src.core.exceptions import ValidationDomainError
from src.models.api.rerank import RerankRequest, RerankResponse, RerankResultRow
from src.tools.cross_encoder_reranker import CrossEncoderReranker


class RerankService:
    """Business service for query-document reranking."""

    def __init__(self, reranker: CrossEncoderReranker) -> None:
        self._reranker = reranker

    @property
    def default_model(self) -> str:
        """Return configured default reranker model."""

        return self._reranker.default_model

    @property
    def resolved_device(self) -> str:
        """Return active device used by reranker runtime."""

        return self._reranker.resolved_device

    def loaded_models(self) -> list[str]:
        """Return loaded model ids currently cached in process memory."""

        return self._reranker.loaded_models()

    def rerank(self, request: RerankRequest) -> RerankResponse:
        """Validate request and return ranked documents."""

        query = request.query.strip()
        if not query:
            raise ValidationDomainError("query must not be empty")

        documents = [item.strip() for item in request.documents if isinstance(item, str) and item.strip()]
        if not documents:
            raise ValidationDomainError("documents must contain at least one non-empty item")

        top_n = request.top_n
        if top_n is not None and top_n > len(documents):
            top_n = len(documents)

        run = self._reranker.rerank(
            model=request.model,
            query=query,
            documents=documents,
            top_n=top_n,
        )

        return RerankResponse(
            model=request.model,
            resolved_model=run.resolved_model,
            results=[
                RerankResultRow(index=row.index, relevance_score=row.relevance_score)
                for row in run.results
            ],
        )
