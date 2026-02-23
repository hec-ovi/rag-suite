from __future__ import annotations

import os

os.environ["RERANK_DEVICE"] = "cpu"

from src.main import app


def test_openapi_contains_rerank_routes() -> None:
    schema = app.openapi()
    paths = schema["paths"]

    assert "/v1/health" in paths
    assert "/v1/rerank" in paths
