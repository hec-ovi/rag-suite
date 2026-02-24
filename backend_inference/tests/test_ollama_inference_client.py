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
    def __init__(self, payload: dict[str, object], calls: list[dict[str, object]] | None = None) -> None:
        self._payload = payload
        self._calls = calls if calls is not None else []

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> bool:  # noqa: ANN001
        return False

    async def post(self, url: str, json: dict[str, object]) -> _FakeResponse:  # noqa: A002
        self._calls.append({"url": url, "json": json})
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
    def __init__(self, lines: list[str], calls: list[dict[str, object]] | None = None) -> None:
        self._lines = lines
        self._calls = calls if calls is not None else []

    async def __aenter__(self) -> "_FakeAsyncStreamClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> bool:  # noqa: ANN001
        return False

    def stream(self, method: str, url: str, json: dict[str, object]) -> _FakeStreamResponse:  # noqa: A002, ARG002
        self._calls.append({"method": method, "url": url, "json": json})
        return _FakeStreamResponse(self._lines)


async def test_chat_wraps_thinking_when_content_is_empty(monkeypatch) -> None:  # noqa: ANN001
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

    calls: list[dict[str, object]] = []
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncClient(payload, calls),  # noqa: ARG005
    )

    client = OllamaInferenceClient(base_url="http://ollama:11434", timeout_seconds=5.0, keep_alive="0s")
    result = await client.chat(
        model="gpt-oss:20b",
        messages=[{"role": "user", "content": "test"}],
        temperature=0.0,
        max_tokens=32,
    )

    assert result.content == "<thinking>Useful fallback output</thinking>"
    assert calls and calls[0]["json"]["keep_alive"] == "0s"


async def test_chat_stream_returns_content_and_final_usage(monkeypatch) -> None:  # noqa: ANN001
    lines = [
        '{"message":{"role":"assistant","content":"Hello "},"done":false}',
        '{"message":{"role":"assistant","content":"world"},"done":false}',
        '{"done":true,"done_reason":"stop","prompt_eval_count":11,"eval_count":4}',
    ]

    calls: list[dict[str, object]] = []
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncStreamClient(lines, calls),  # noqa: ARG005
    )

    client = OllamaInferenceClient(base_url="http://ollama:11434", timeout_seconds=5.0, keep_alive="0s")
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
    assert calls and calls[0]["json"]["keep_alive"] == "0s"


async def test_chat_stream_wraps_thinking_deltas(monkeypatch) -> None:  # noqa: ANN001
    lines = [
        '{"message":{"role":"assistant","thinking":"internal reasoning"},"done":false}',
        '{"done":true,"done_reason":"stop","prompt_eval_count":3,"eval_count":2}',
    ]

    calls: list[dict[str, object]] = []
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncStreamClient(lines, calls),  # noqa: ARG005
    )

    client = OllamaInferenceClient(base_url="http://ollama:11434", timeout_seconds=5.0, keep_alive="0s")
    chunks = [
        chunk
        async for chunk in client.chat_stream(
            model="gpt-oss:20b",
            messages=[{"role": "user", "content": "test"}],
            temperature=0.0,
            max_tokens=32,
        )
    ]

    assert "".join(chunk.content_delta for chunk in chunks) == "<thinking>internal reasoning</thinking>"
    assert chunks[-1].done is True
    assert calls and calls[0]["json"]["keep_alive"] == "0s"


async def test_chat_stream_wraps_thinking_and_content_deltas(monkeypatch) -> None:  # noqa: ANN001
    lines = [
        '{"message":{"role":"assistant","thinking":"step","content":"answer"},"done":false}',
        '{"done":true,"done_reason":"stop"}',
    ]

    calls: list[dict[str, object]] = []
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncStreamClient(lines, calls),  # noqa: ARG005
    )

    client = OllamaInferenceClient(base_url="http://ollama:11434", timeout_seconds=5.0, keep_alive="0s")
    chunks = [
        chunk
        async for chunk in client.chat_stream(
            model="gpt-oss:20b",
            messages=[{"role": "user", "content": "test"}],
            temperature=0.0,
            max_tokens=32,
        )
    ]

    assert "".join(chunk.content_delta for chunk in chunks) == "<thinking>step</thinking>answer"
    assert calls and calls[0]["json"]["keep_alive"] == "0s"


async def test_embed_payload_includes_keep_alive(monkeypatch) -> None:  # noqa: ANN001
    payload = {
        "embeddings": [[0.1, 0.2]],
        "prompt_eval_count": 2,
    }
    calls: list[dict[str, object]] = []

    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda timeout: _FakeAsyncClient(payload, calls),  # noqa: ARG005
    )

    client = OllamaInferenceClient(base_url="http://ollama:11434", timeout_seconds=5.0, keep_alive="0s")
    result = await client.embed(model="bge-m3:latest", texts=["hello"])

    assert len(result.embeddings) == 1
    assert calls and calls[0]["json"]["keep_alive"] == "0s"
