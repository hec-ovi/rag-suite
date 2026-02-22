from __future__ import annotations

from src.main import app
from src.models.api.pipeline import (
    AutomaticPipelinePreviewRequest,
    ChunkingOptions,
    PipelineAutomationFlags,
)


def test_openapi_contains_stage_zero_routes() -> None:
    schema = app.openapi()
    paths = schema["paths"]

    assert "/v1/pipeline/normalize" in paths
    assert "/v1/pipeline/chunk" in paths
    assert "/v1/pipeline/contextualize" in paths
    assert "/v1/pipeline/preview-automatic" in paths
    assert "/v1/projects/{project_id}" in paths
    assert "/v1/projects/{project_id}/documents/ingest" in paths


def test_preview_request_defaults_are_stable() -> None:
    payload = AutomaticPipelinePreviewRequest(
        document_name="Test",
        raw_text="Clause A.",
        automation=PipelineAutomationFlags(
            normalize_text=True,
            agentic_chunking=False,
            contextual_headers=False,
        ),
        chunk_options=ChunkingOptions(
            mode="deterministic",
            max_chunk_chars=1500,
            min_chunk_chars=350,
            overlap_chars=120,
        ),
        contextualization_mode="template",
    )

    assert payload.chunk_options.mode == "deterministic"
    assert payload.automation.contextual_headers is False
