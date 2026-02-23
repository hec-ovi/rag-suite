from __future__ import annotations

import httpx

from src.core.exceptions import ExternalServiceError
from src.models.runtime.inference import RerankGenerationResult, RerankResult


class RerankerApiClient:
    """Adapter for dedicated reranker backend."""

    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    async def rerank(
        self,
        model: str,
        query: str,
        documents: list[str],
        top_n: int | None = None,
    ) -> RerankGenerationResult:
        """Call reranker backend and return normalized rows."""

        payload: dict[str, object] = {
            "model": model,
            "query": query,
            "documents": documents,
        }
        if top_n is not None:
            payload["top_n"] = top_n

        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            try:
                response = await client.post(f"{self._base_url}/rerank", json=payload)
                response.raise_for_status()
            except httpx.HTTPError as error:
                raise ExternalServiceError(f"Reranker API request failed: {error}") from error

        parsed = response.json()
        results_raw = parsed.get("results")
        if not isinstance(results_raw, list):
            raise ExternalServiceError("Reranker API response is missing results")

        results: list[RerankResult] = []
        for item in results_raw:
            if not isinstance(item, dict):
                raise ExternalServiceError("Reranker API response contains malformed result row")

            index_raw = item.get("index")
            score_raw = item.get("relevance_score")
            if not isinstance(index_raw, int) or not isinstance(score_raw, int | float):
                raise ExternalServiceError("Reranker API response row has invalid index/relevance_score")

            results.append(RerankResult(index=index_raw, relevance_score=float(score_raw)))

        return RerankGenerationResult(results=results)
