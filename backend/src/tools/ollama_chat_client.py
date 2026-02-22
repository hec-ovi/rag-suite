from __future__ import annotations

import asyncio
from contextlib import suppress

import httpx

from src.core.exceptions import ExternalServiceError, OperationCancelledError


class OllamaChatClient:
    """HTTP client for local Ollama chat completions."""

    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    async def complete(
        self,
        model: str,
        system_prompt: str,
        user_prompt: str,
        cancel_event: asyncio.Event | None = None,
    ) -> str:
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
                request_task = asyncio.create_task(client.post(f"{self._base_url}/api/chat", json=payload))

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
                        raise OperationCancelledError("Operation interrupted by user request.")

                    cancel_task.cancel()
                    with suppress(asyncio.CancelledError):
                        await cancel_task

                response = await request_task
                response.raise_for_status()
            except httpx.HTTPError as error:
                raise ExternalServiceError(
                    "Ollama chat request failed. Check model health/GPU stability and retry with a smaller model. "
                    f"Details: {error}"
                ) from error

        parsed = response.json()
        message = parsed.get("message")
        if not isinstance(message, dict):
            raise ExternalServiceError("Ollama response is missing message content")

        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ExternalServiceError("Ollama response contained an empty completion")

        return content
