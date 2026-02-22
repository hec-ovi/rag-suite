from __future__ import annotations

import httpx

from src.core.exceptions import ExternalServiceError
from src.models.runtime.inference import ChatGenerationResult, EmbeddingGenerationResult


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
