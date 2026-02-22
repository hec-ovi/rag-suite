from __future__ import annotations

from src.core.config import Settings
from src.core.exceptions import (
    DomainError,
    ExternalServiceError,
    ResourceNotFoundError,
    ValidationDomainError,
)
from src.main import handle_domain, handle_external, handle_not_found, handle_validation
from src.routes.health import health_check
from src.routes.rag import rag_status


async def test_health_check_returns_expected_shape() -> None:
    payload = await health_check(Settings())

    assert payload["status"] == "ok"
    assert "service" in payload
    assert "timestamp" in payload


def test_rag_status_reports_ready() -> None:
    payload = rag_status()

    assert payload["status"] == "ready"
    assert "chat" in payload["message"].lower()


async def test_validation_error_handler_maps_to_400() -> None:
    response = await handle_validation(None, ValidationDomainError("invalid payload"))  # type: ignore[arg-type]

    assert response.status_code == 400
    assert response.body == b'{"detail":"invalid payload"}'


async def test_not_found_handler_maps_to_404() -> None:
    response = await handle_not_found(None, ResourceNotFoundError("missing"))  # type: ignore[arg-type]

    assert response.status_code == 404
    assert response.body == b'{"detail":"missing"}'


async def test_external_handler_maps_to_502() -> None:
    response = await handle_external(None, ExternalServiceError("upstream failed"))  # type: ignore[arg-type]

    assert response.status_code == 502
    assert response.body == b'{"detail":"upstream failed"}'


async def test_domain_error_handler_maps_to_400() -> None:
    response = await handle_domain(None, DomainError("domain failure"))  # type: ignore[arg-type]

    assert response.status_code == 400
    assert response.body == b'{"detail":"domain failure"}'
