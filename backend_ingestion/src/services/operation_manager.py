from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager


class OperationManager:
    """Track cancellable long-running operations by client-provided id."""

    def __init__(self) -> None:
        self._events: dict[str, asyncio.Event] = {}
        self._lock = asyncio.Lock()

    @asynccontextmanager
    async def track(self, operation_id: str) -> AsyncIterator[asyncio.Event]:
        """Register an operation id and automatically release it on exit."""

        event = await self.register(operation_id)
        try:
            yield event
        finally:
            await self.release(operation_id)

    async def register(self, operation_id: str) -> asyncio.Event:
        """Register an operation id and return its cancellation event."""

        event = asyncio.Event()
        async with self._lock:
            self._events[operation_id] = event
        return event

    async def cancel(self, operation_id: str) -> bool:
        """Signal cancellation if operation id is currently active."""

        async with self._lock:
            event = self._events.get(operation_id)

        if event is None:
            return False

        event.set()
        return True

    async def release(self, operation_id: str) -> None:
        """Remove an operation id from active tracking."""

        async with self._lock:
            self._events.pop(operation_id, None)
