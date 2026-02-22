from __future__ import annotations

import httpx

from src.core.exceptions import ExternalServiceError


class InferenceApiClient:
    """OpenAI-compatible inference backend adapter."""

    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._client = httpx.Client(timeout=timeout_seconds)

    def close(self) -> None:
        """Close shared HTTP client."""

        self._client.close()

    def embed_texts(self, model: str, texts: list[str]) -> list[list[float]]:
        """Embed one or more texts and return vectors in the same order."""

        if not texts:
            return []

        payload = {
            "model": model,
            "input": texts,
        }

        try:
            response = self._client.post(f"{self._base_url}/embeddings", json=payload)
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise ExternalServiceError(
                "Inference embeddings request failed. "
                f"Details: {self._format_http_error(error)}"
            ) from error

        parsed = response.json()
        data = parsed.get("data")
        if not isinstance(data, list):
            raise ExternalServiceError("Inference embeddings response is missing data")

        normalized: list[list[float]] = []
        for item in data:
            if not isinstance(item, dict):
                raise ExternalServiceError("Inference embeddings row is malformed")

            embedding = item.get("embedding")
            if not isinstance(embedding, list):
                raise ExternalServiceError("Inference embeddings response contains malformed vectors")

            vector: list[float] = []
            for value in embedding:
                if isinstance(value, int | float):
                    vector.append(float(value))

            if not vector:
                raise ExternalServiceError("Inference embeddings response contains empty vector")

            normalized.append(vector)

        return normalized

    def complete_chat(self, model: str, messages: list[dict[str, str]]) -> str:
        """Generate a non-streamed chat completion."""

        payload = {
            "model": model,
            "stream": False,
            "temperature": 0.0,
            "messages": messages,
        }

        try:
            response = self._client.post(f"{self._base_url}/chat/completions", json=payload)
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise ExternalServiceError(
                "Inference chat request failed. "
                f"Details: {self._format_http_error(error)}"
            ) from error

        parsed = response.json()
        choices = parsed.get("choices")
        if not isinstance(choices, list) or not choices:
            raise ExternalServiceError("Inference chat response is missing choices")

        first_choice = choices[0]
        if not isinstance(first_choice, dict):
            raise ExternalServiceError("Inference chat response choice is malformed")

        message = first_choice.get("message")
        if not isinstance(message, dict):
            raise ExternalServiceError("Inference chat response is missing message payload")

        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ExternalServiceError("Inference chat response contains empty completion")

        return content.strip()

    def _format_http_error(self, error: httpx.HTTPError) -> str:
        """Build a concise, non-empty diagnostic for HTTP failures."""

        parts: list[str] = [error.__class__.__name__]

        message = str(error).strip()
        if message:
            parts.append(message)

        if isinstance(error, httpx.HTTPStatusError):
            response = error.response
            parts.append(f"status={response.status_code}")
            body = response.text.strip()
            if body:
                parts.append(f"response={body[:300]}")
        elif isinstance(error, httpx.RequestError):
            request = error.request
            parts.append(f"request={request.method} {request.url}")

        if len(parts) == 1:
            parts.append(repr(error))

        return " | ".join(parts)
