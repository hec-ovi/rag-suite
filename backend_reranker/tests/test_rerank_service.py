from __future__ import annotations

import pytest

from src.core.exceptions import ValidationDomainError
from src.models.api.rerank import RerankRequest
from src.models.runtime.rerank import RerankResult, RerankRunResult
from src.services.rerank_service import RerankService


class _StubReranker:
    default_model = "BAAI/bge-reranker-v2-m3"
    resolved_device = "cpu"

    def loaded_models(self) -> list[str]:
        return ["BAAI/bge-reranker-v2-m3"]

    def rerank(  # noqa: ARG002
        self,
        *,
        model: str,
        query: str,
        documents: list[str],
        top_n: int | None,
    ) -> RerankRunResult:
        limit = len(documents) if top_n is None else top_n
        return RerankRunResult(
            resolved_model="BAAI/bge-reranker-v2-m3",
            results=[
                RerankResult(index=idx, relevance_score=1.0 - (idx * 0.1))
                for idx in range(limit)
            ],
        )


def test_rerank_service_response_shape() -> None:
    service = RerankService(reranker=_StubReranker())

    response = service.rerank(
        RerankRequest(
            model="bge-reranker-v2-m3:latest",
            query="gift",
            documents=["doc a", "doc b"],
            top_n=1,
        )
    )

    assert response.model == "bge-reranker-v2-m3:latest"
    assert response.resolved_model == "BAAI/bge-reranker-v2-m3"
    assert len(response.results) == 1
    assert response.results[0].index == 0


def test_rerank_service_rejects_empty_documents() -> None:
    service = RerankService(reranker=_StubReranker())

    with pytest.raises(ValidationDomainError, match="documents must contain at least one non-empty item"):
        service.rerank(
            RerankRequest(
                model="BAAI/bge-reranker-v2-m3",
                query="gift",
                documents=["   "],
            )
        )
