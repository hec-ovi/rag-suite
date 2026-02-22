from __future__ import annotations

from src.main import app


def test_openapi_contains_scaffold_routes() -> None:
    schema = app.openapi()
    paths = schema["paths"]

    assert "/v1/health" in paths
    assert "/v1/rag/status" in paths
