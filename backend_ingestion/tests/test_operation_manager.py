from __future__ import annotations

import pytest

from src.services.operation_manager import OperationManager


@pytest.mark.asyncio
async def test_operation_manager_cancel_active_operation() -> None:
    manager = OperationManager()

    async with manager.track("op-1") as cancel_event:
        cancelled = await manager.cancel("op-1")
        assert cancelled is True
        assert cancel_event.is_set() is True


@pytest.mark.asyncio
async def test_operation_manager_cancel_missing_operation_returns_false() -> None:
    manager = OperationManager()
    cancelled = await manager.cancel("missing")
    assert cancelled is False
