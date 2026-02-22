from __future__ import annotations

from src.main import app


def test_openapi_contains_rag_routes() -> None:
    schema = app.openapi()
    paths = schema["paths"]

    assert "/v1/projects/{project_id}/rag/search" in paths
    assert "/v1/projects/{project_id}/rag/answer" in paths
