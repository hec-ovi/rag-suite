from __future__ import annotations

import httpx

from src.core.exceptions import ExternalServiceError


class OllamaEmbeddingClient:
    """HTTP client for local Ollama embedding generation."""

    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    async def embed_texts(self, model: str, texts: list[str]) -> list[list[float]]:
        """Embed multiple texts and return vectors in the same order."""

        if not texts:
            return []

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
