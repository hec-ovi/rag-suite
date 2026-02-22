from __future__ import annotations

import asyncio
from contextlib import suppress

import httpx

from src.core.exceptions import ExternalServiceError, OperationCancelledError


class OllamaChatClient:
    """HTTP client for the inference backend chat completions."""

    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    def _format_http_error(self, error: httpx.HTTPError) -> str:
        """Build a non-empty diagnostic string for chat request failures."""

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

    async def complete(
        self,
        model: str,
        system_prompt: str,
        user_prompt: str,
        cancel_event: asyncio.Event | None = None,
    ) -> str:
        """Generate a non-streamed completion from inference backend."""

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
                request_task = asyncio.create_task(client.post(f"{self._base_url}/chat/completions", json=payload))

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
                    "Inference backend chat request failed. Check inference service and model health, then retry. "
                    f"Details: {self._format_http_error(error)}"
                ) from error

        parsed = response.json()
        choices = parsed.get("choices")
        if not isinstance(choices, list) or not choices:
            raise ExternalServiceError("Inference backend response is missing choices")
        first_choice = choices[0]
        if not isinstance(first_choice, dict):
            raise ExternalServiceError("Inference backend response choice is malformed")
        message = first_choice.get("message")
        if not isinstance(message, dict):
            raise ExternalServiceError("Inference backend response is missing choice message")

        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ExternalServiceError("Inference backend response contained an empty completion")

        return content
