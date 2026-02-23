from __future__ import annotations

from src.main import app


def test_openapi_contains_inference_routes() -> None:
    schema = app.openapi()
    paths = schema["paths"]

    assert "/v1/chat/completions" in paths
    assert "/v1/completions" in paths
    assert "/v1/embeddings" in paths
    assert "/v1/rerank" in paths
