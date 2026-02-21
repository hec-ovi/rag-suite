from __future__ import annotations

import httpx

from src.core.exceptions import ExternalServiceError


class OllamaChatClient:
    """HTTP client for local Ollama chat completions."""

    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    async def complete(self, model: str, system_prompt: str, user_prompt: str) -> str:
        """Generate a non-streamed completion from Ollama."""

        payload = {
            "model": model,
            "stream": False,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "options": {"temperature": 0.0},
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
            raise ExternalServiceError("Ollama response is missing message content")

        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ExternalServiceError("Ollama response contained an empty completion")

        return content
