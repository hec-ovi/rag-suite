from __future__ import annotations

from src.core.config import Settings
from src.core.exceptions import DomainError, ValidationDomainError
from src.main import handle_domain, handle_validation
from src.routes.health import health_check
from src.routes.rag import rag_status


async def test_health_check_returns_expected_shape() -> None:
    payload = await health_check(Settings())

    assert payload["status"] == "ok"
    assert "service" in payload
    assert "timestamp" in payload


async def test_rag_status_returns_under_construction() -> None:
    payload = await rag_status()

    assert payload["status"] == "under_construction"
    assert "next stage" in payload["message"].lower()


async def test_validation_error_handler_maps_to_400() -> None:
    response = await handle_validation(None, ValidationDomainError("invalid payload"))  # type: ignore[arg-type]

    assert response.status_code == 400
    assert response.body == b'{"detail":"invalid payload"}'


async def test_domain_error_handler_maps_to_400() -> None:
    response = await handle_domain(None, DomainError("domain failure"))  # type: ignore[arg-type]

    assert response.status_code == 400
    assert response.body == b'{"detail":"domain failure"}'
