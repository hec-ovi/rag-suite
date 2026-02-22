from __future__ import annotations

import httpx

from src.tools.ollama_inference_client import OllamaInferenceClient


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

    async def post(self, url: str, json: dict[str, object]) -> _FakeResponse:  # noqa: A002
        return _FakeResponse(self._payload)


class _FakeStreamResponse:
    def __init__(self, lines: list[str]) -> None:
        self._lines = lines

    async def __aenter__(self) -> "_FakeStreamResponse":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> bool:  # noqa: ANN001
        return False

    def raise_for_status(self) -> None:
        return None

    async def aiter_lines(self):  # noqa: ANN201
        for line in self._lines:
            yield line


class _FakeAsyncStreamClient:
    def __init__(self, lines: list[str]) -> None:
        self._lines = lines

    async def __aenter__(self) -> "_FakeAsyncStreamClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> bool:  # noqa: ANN001
        return False

    def stream(self, method: str, url: str, json: dict[str, object]) -> _FakeStreamResponse:  # noqa: A002, ARG002
        return _FakeStreamResponse(self._lines)


async def test_chat_uses_thinking_field_when_content_is_empty(monkeypatch) -> None:  # noqa: ANN001
    payload = {
        "message": {
            "role": "assistant",
            "content": "",
            "thinking": "Useful fallback output",
        },
        "prompt_eval_count": 10,
        "eval_count": 5,
        "done_reason": "stop",
    }

    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncClient(payload),  # noqa: ARG005
    )

    client = OllamaInferenceClient(base_url="http://ollama:11434", timeout_seconds=5.0)
    result = await client.chat(
        model="gpt-oss:20b",
        messages=[{"role": "user", "content": "test"}],
        temperature=0.0,
        max_tokens=32,
    )

    assert result.content == "Useful fallback output"
    assert result.prompt_tokens == 10
    assert result.completion_tokens == 5


async def test_chat_stream_returns_content_and_final_usage(monkeypatch) -> None:  # noqa: ANN001
    lines = [
        '{"message":{"role":"assistant","content":"Hello "},"done":false}',
        '{"message":{"role":"assistant","content":"world"},"done":false}',
        '{"done":true,"done_reason":"stop","prompt_eval_count":11,"eval_count":4}',
    ]

    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncStreamClient(lines),  # noqa: ARG005
    )

    client = OllamaInferenceClient(base_url="http://ollama:11434", timeout_seconds=5.0)
    chunks = [
        chunk
        async for chunk in client.chat_stream(
            model="gpt-oss:20b",
            messages=[{"role": "user", "content": "test"}],
            temperature=0.0,
            max_tokens=32,
        )
    ]

    assert "".join(chunk.content_delta for chunk in chunks) == "Hello world"
    assert chunks[-1].done is True
    assert chunks[-1].finish_reason == "stop"
    assert chunks[-1].prompt_tokens == 11
    assert chunks[-1].completion_tokens == 4
