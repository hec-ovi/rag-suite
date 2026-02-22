from __future__ import annotations

import httpx
import pytest

from src.core.exceptions import ExternalServiceError
from src.tools.inference_api_client import InferenceApiClient


class _FakeStreamResponse:
    def __init__(self, lines: list[str]) -> None:
        self._lines = lines

    def __enter__(self) -> "_FakeStreamResponse":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:  # noqa: ANN001
        return False

    def raise_for_status(self) -> None:
        return None

    def iter_lines(self):  # noqa: ANN201
        for line in self._lines:
            yield line


class _FakeHttpClient:
    def __init__(self, lines: list[str]) -> None:
        self._lines = lines

    def close(self) -> None:
        return None

    def stream(  # noqa: ANN201
        self,
        method: str,  # noqa: ARG002
        url: str,  # noqa: ARG002
        json: dict[str, object],  # noqa: A002, ARG002
        headers: dict[str, str],  # noqa: ARG002
    ):
        return _FakeStreamResponse(self._lines)


def test_stream_chat_deltas_extracts_content_only(monkeypatch) -> None:  # noqa: ANN001
    lines = [
        'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}',
        'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"content":"Hello "},"finish_reason":null}]}',
        'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"content":"world"},"finish_reason":null}]}',
        'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
        "data: [DONE]",
    ]

    monkeypatch.setattr(
        httpx,
        "Client",
        lambda timeout: _FakeHttpClient(lines),  # noqa: ARG005
    )

    client = InferenceApiClient(base_url="http://backend-inference:8010/v1", timeout_seconds=10.0)
    chunks = list(
        client.stream_chat_deltas(
            model="gpt-oss:20b",
            messages=[{"role": "user", "content": "hello"}],
        )
    )

    assert "".join(chunks) == "Hello world"


def test_stream_chat_deltas_rejects_malformed_json(monkeypatch) -> None:  # noqa: ANN001
    lines = ["data: not-json"]

    monkeypatch.setattr(
        httpx,
        "Client",
        lambda timeout: _FakeHttpClient(lines),  # noqa: ARG005
    )

    client = InferenceApiClient(base_url="http://backend-inference:8010/v1", timeout_seconds=10.0)

    with pytest.raises(ExternalServiceError, match="malformed JSON"):
        list(
            client.stream_chat_deltas(
                model="gpt-oss:20b",
                messages=[{"role": "user", "content": "hello"}],
            )
        )
