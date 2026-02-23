from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx

from src.core.exceptions import ExternalServiceError
from src.models.runtime.inference import (
    ChatGenerationResult,
    ChatStreamChunk,
    EmbeddingGenerationResult,
    RerankGenerationResult,
    RerankResult,
)


class OllamaInferenceClient:
    """Raw Ollama adapter for OpenAI-compatible inference routes."""

    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    async def chat(
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int | None,
    ) -> ChatGenerationResult:
        """Run a non-streamed chat completion."""

        options: dict[str, int | float] = {"temperature": temperature}
        if max_tokens is not None:
            options["num_predict"] = max_tokens

        payload = {
            "model": model,
            "stream": False,
            "messages": messages,
            "options": options,
        }

        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            try:
                response = await client.post(f"{self._base_url}/api/chat", json=payload)
                response.raise_for_status()
            except httpx.HTTPError as error:
                raise ExternalServiceError(f"Ollama chat request failed: {error}") from error

        parsed = response.json()
        message = parsed.get("message")
        if not isinstance(message, dict):
            raise ExternalServiceError("Ollama response is missing message payload")

        content_raw = message.get("content")
        content = content_raw.strip() if isinstance(content_raw, str) else ""
        thinking_raw = message.get("thinking")
        thinking = thinking_raw.strip() if isinstance(thinking_raw, str) else ""

        if thinking and content:
            content = f"<thinking>{thinking}</thinking>\n{content}"
        elif thinking:
            content = f"<thinking>{thinking}</thinking>"

        if not content:
            raise ExternalServiceError("Ollama response contained empty completion text")

        prompt_tokens_raw = parsed.get("prompt_eval_count", 0)
        completion_tokens_raw = parsed.get("eval_count", 0)
        finish_reason_raw = parsed.get("done_reason", "stop")

        prompt_tokens = int(prompt_tokens_raw) if isinstance(prompt_tokens_raw, int | float) else 0
        completion_tokens = int(completion_tokens_raw) if isinstance(completion_tokens_raw, int | float) else 0
        finish_reason = finish_reason_raw if isinstance(finish_reason_raw, str) and finish_reason_raw else "stop"

        return ChatGenerationResult(
            content=content,
            prompt_tokens=max(prompt_tokens, 0),
            completion_tokens=max(completion_tokens, 0),
            finish_reason=finish_reason,
        )

    async def chat_stream(
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int | None,
    ) -> AsyncIterator[ChatStreamChunk]:
        """Run a streamed chat completion and yield normalized deltas."""

        options: dict[str, int | float] = {"temperature": temperature}
        if max_tokens is not None:
            options["num_predict"] = max_tokens

        payload = {
            "model": model,
            "stream": True,
            "messages": messages,
            "options": options,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                async with client.stream("POST", f"{self._base_url}/api/chat", json=payload) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        raw_line = line.strip()
                        if not raw_line:
                            continue

                        chunk = self._parse_chat_stream_line(raw_line)
                        if chunk.content_delta or chunk.done:
                            yield chunk
        except httpx.HTTPError as error:
            raise ExternalServiceError(f"Ollama chat stream request failed: {error}") from error

    async def embed(self, model: str, texts: list[str]) -> EmbeddingGenerationResult:
        """Generate embeddings for one or more texts."""

        payload = {
            "model": model,
            "input": texts,
        }

        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            try:
                response = await client.post(f"{self._base_url}/api/embed", json=payload)
                response.raise_for_status()
            except httpx.HTTPError as error:
                raise ExternalServiceError(f"Ollama embeddings request failed: {error}") from error

        parsed = response.json()
        embeddings_raw = parsed.get("embeddings")
        if not isinstance(embeddings_raw, list):
            raise ExternalServiceError("Ollama embeddings response is missing embeddings")

        embeddings: list[list[float]] = []
        for vector_raw in embeddings_raw:
            if not isinstance(vector_raw, list):
                raise ExternalServiceError("Ollama embeddings response contained malformed vector row")

            vector = [float(item) for item in vector_raw if isinstance(item, int | float)]
            if not vector:
                raise ExternalServiceError("Ollama embeddings response contained empty vector")
            embeddings.append(vector)

        prompt_tokens_raw = parsed.get("prompt_eval_count", 0)
        prompt_tokens = int(prompt_tokens_raw) if isinstance(prompt_tokens_raw, int | float) else 0

        return EmbeddingGenerationResult(embeddings=embeddings, prompt_tokens=max(prompt_tokens, 0))

    async def rerank(
        self,
        model: str,
        query: str,
        documents: list[str],
        top_n: int | None = None,
    ) -> RerankGenerationResult:
        """Rerank candidate documents for one query."""

        payload: dict[str, object] = {
            "model": model,
            "query": query,
            "documents": documents,
        }
        if top_n is not None:
            payload["top_n"] = top_n

        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            try:
                response = await client.post(f"{self._base_url}/api/rerank", json=payload)
                response.raise_for_status()
            except httpx.HTTPError as error:
                raise ExternalServiceError(f"Ollama rerank request failed: {error}") from error

        parsed = response.json()
        results_raw = parsed.get("results")
        if not isinstance(results_raw, list):
            raise ExternalServiceError("Ollama rerank response is missing results")

        results: list[RerankResult] = []
        for item in results_raw:
            if not isinstance(item, dict):
                raise ExternalServiceError("Ollama rerank response contains malformed result row")

            index_raw = item.get("index")
            if not isinstance(index_raw, int):
                raise ExternalServiceError("Ollama rerank response is missing a valid result index")

            score_raw = item.get("relevance_score")
            if not isinstance(score_raw, int | float):
                raise ExternalServiceError("Ollama rerank response is missing a valid relevance score")

            results.append(RerankResult(index=index_raw, relevance_score=float(score_raw)))

        return RerankGenerationResult(results=results)

    def _parse_chat_stream_line(self, raw_line: str) -> ChatStreamChunk:
        """Parse one NDJSON chat stream line from Ollama."""

        try:
            parsed = json.loads(raw_line)
        except json.JSONDecodeError as error:
            raise ExternalServiceError("Ollama chat stream returned malformed JSON payload") from error

        if not isinstance(parsed, dict):
            raise ExternalServiceError("Ollama chat stream payload is not an object")

        done_raw = parsed.get("done", False)
        done = bool(done_raw) if isinstance(done_raw, bool) else False

        content_delta = ""
        message_raw = parsed.get("message")
        if isinstance(message_raw, dict):
            thinking_raw = message_raw.get("thinking")
            if isinstance(thinking_raw, str) and thinking_raw:
                content_delta += f"<thinking>{thinking_raw}</thinking>"

            content_raw = message_raw.get("content")
            if isinstance(content_raw, str):
                content_delta += content_raw

        finish_reason_raw = parsed.get("done_reason")
        finish_reason = finish_reason_raw if isinstance(finish_reason_raw, str) and finish_reason_raw else None

        prompt_tokens_raw = parsed.get("prompt_eval_count")
        prompt_tokens = int(prompt_tokens_raw) if isinstance(prompt_tokens_raw, int | float) else None

        completion_tokens_raw = parsed.get("eval_count")
        completion_tokens = int(completion_tokens_raw) if isinstance(completion_tokens_raw, int | float) else None

        return ChatStreamChunk(
            content_delta=content_delta,
            done=done,
            finish_reason=finish_reason,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )
