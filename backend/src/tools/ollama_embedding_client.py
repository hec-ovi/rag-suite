from __future__ import annotations

import asyncio
from contextlib import suppress

import httpx

from src.core.exceptions import ExternalServiceError, OperationCancelledError


class OllamaEmbeddingClient:
    """HTTP client for local Ollama embedding generation."""

    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    def _format_http_error(self, error: httpx.HTTPError) -> str:
        """Build a non-empty diagnostic string for embedding request failures."""

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

    async def embed_texts(
        self,
        model: str,
        texts: list[str],
        cancel_event: asyncio.Event | None = None,
    ) -> list[list[float]]:
        """Embed multiple texts and return vectors in the same order."""

        if not texts:
            return []

        payload = {
            "model": model,
            "input": texts,
        }

        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            try:
                request_task = asyncio.create_task(client.post(f"{self._base_url}/api/embed", json=payload))

                if cancel_event is not None:
                    cancel_task = asyncio.create_task(cancel_event.wait())
                    done, _ = await asyncio.wait(
                        {request_task, cancel_task},
                        return_when=asyncio.FIRST_COMPLETED,
                    )

                    if cancel_task in done and cancel_event.is_set():
                        request_task.cancel()
                        with suppress(asyncio.CancelledError):
                            await request_task
                        raise OperationCancelledError("Vectorization interrupted by user request.")

                    cancel_task.cancel()
                    with suppress(asyncio.CancelledError):
                        await cancel_task

                response = await request_task
                response.raise_for_status()
            except httpx.HTTPError as error:
                raise ExternalServiceError(
                    "Ollama embeddings request failed. Check model health/GPU stability and retry with a smaller model. "
                    f"Details: {self._format_http_error(error)}"
                ) from error

        parsed = response.json()
        embeddings = parsed.get("embeddings")
        if not isinstance(embeddings, list):
            raise ExternalServiceError("Ollama embeddings response is missing embeddings")

        normalized: list[list[float]] = []
        for embedding in embeddings:
            if not isinstance(embedding, list):
                raise ExternalServiceError("Ollama embeddings response contained malformed vectors")
            vector: list[float] = []
            for value in embedding:
                if isinstance(value, (int, float)):
                    vector.append(float(value))
            if not vector:
                raise ExternalServiceError("Ollama embeddings response contained empty vector")
            normalized.append(vector)

        return normalized
