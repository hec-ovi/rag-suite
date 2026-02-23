from __future__ import annotations

import httpx

from src.tools.reranker_api_client import RerankerApiClient


class _FakeResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return self._payload


class _FakeAsyncClient:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> bool:  # noqa: ANN001
        return False

    async def post(self, url: str, json: dict[str, object]) -> _FakeResponse:  # noqa: A002, ARG002
        return _FakeResponse(self._payload)


async def test_reranker_api_client_parses_results(monkeypatch) -> None:  # noqa: ANN001
    payload = {
        "results": [
            {"index": 2, "relevance_score": 0.91},
            {"index": 0, "relevance_score": 0.55},
        ]
    }

    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncClient(payload),  # noqa: ARG005
    )

    client = RerankerApiClient(base_url="http://backend-reranker:8030/v1", timeout_seconds=5.0)
    result = await client.rerank(
        model="BAAI/bge-reranker-v2-m3",
        query="test query",
        documents=["a", "b", "c"],
        top_n=2,
    )

    assert len(result.results) == 2
    assert result.results[0].index == 2
    assert result.results[0].relevance_score == 0.91
