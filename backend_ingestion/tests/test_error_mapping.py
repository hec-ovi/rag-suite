from __future__ import annotations

from src.core.exceptions import (
    DomainError,
    ExternalServiceError,
    OperationCancelledError,
    ResourceNotFoundError,
    ValidationDomainError,
)
from src.main import (
    handle_domain,
    handle_external_service,
    handle_not_found,
    handle_operation_cancelled,
    handle_validation,
)


async def test_not_found_handler_maps_to_404() -> None:
    response = await handle_not_found(None, ResourceNotFoundError("missing"))  # type: ignore[arg-type]

    assert response.status_code == 404
    assert response.body == b'{"detail":"missing"}'


async def test_validation_handler_maps_to_400() -> None:
    response = await handle_validation(None, ValidationDomainError("bad input"))  # type: ignore[arg-type]

    assert response.status_code == 400
    assert response.body == b'{"detail":"bad input"}'


async def test_external_service_handler_maps_to_502() -> None:
    response = await handle_external_service(None, ExternalServiceError("upstream unavailable"))  # type: ignore[arg-type]

    assert response.status_code == 502
    assert response.body == b'{"detail":"upstream unavailable"}'


async def test_operation_cancelled_handler_maps_to_499() -> None:
    response = await handle_operation_cancelled(None, OperationCancelledError("cancelled by user"))  # type: ignore[arg-type]

    assert response.status_code == 499
    assert response.body == b'{"detail":"cancelled by user"}'


async def test_domain_handler_maps_to_400() -> None:
    response = await handle_domain(None, DomainError("domain fallback"))  # type: ignore[arg-type]

    assert response.status_code == 400
    assert response.body == b'{"detail":"domain fallback"}'
