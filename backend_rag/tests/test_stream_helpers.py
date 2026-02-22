from __future__ import annotations

import json

from src.routes.rag import _chunk_text, _sse_event


def test_chunk_text_splits_expected_boundaries() -> None:
    chunks = _chunk_text("abcdefghij", 4)

    assert chunks == ["abcd", "efgh", "ij"]


def test_sse_event_serializes_event_and_payload() -> None:
    event = _sse_event("meta", {"session_id": "s-1", "project_id": "p-1"})

    assert event.startswith("event: meta\n")
    assert event.endswith("\n\n")

    data_line = [line for line in event.splitlines() if line.startswith("data:")][0]
    payload = json.loads(data_line.removeprefix("data:").strip())
    assert payload["session_id"] == "s-1"
    assert payload["project_id"] == "p-1"
