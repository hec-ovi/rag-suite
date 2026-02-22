from __future__ import annotations

from src.main import app


def test_openapi_contains_rag_routes() -> None:
    schema = app.openapi()
    paths = schema["paths"]

    assert "/v1/health" in paths
    assert "/v1/rag/status" in paths
    assert "/v1/rag/chat/stateless" in paths
    assert "/v1/rag/chat/session" in paths
    assert "/v1/rag/chat/stateless/stream" in paths
    assert "/v1/rag/chat/session/stream" in paths
