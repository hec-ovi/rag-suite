from __future__ import annotations

from src.core.exceptions import DomainError, ExternalServiceError, ValidationDomainError
from src.main import handle_domain, handle_external_service, handle_validation


async def test_validation_error_handler_maps_to_400() -> None:
    response = await handle_validation(None, ValidationDomainError("bad request"))  # type: ignore[arg-type]

    assert response.status_code == 400
    assert response.body == b'{"detail":"bad request"}'


async def test_external_service_error_handler_maps_to_502() -> None:
    response = await handle_external_service(None, ExternalServiceError("upstream down"))  # type: ignore[arg-type]

    assert response.status_code == 502
    assert response.body == b'{"detail":"upstream down"}'


async def test_generic_domain_error_handler_maps_to_400() -> None:
    response = await handle_domain(None, DomainError("domain issue"))  # type: ignore[arg-type]

    assert response.status_code == 400
    assert response.body == b'{"detail":"domain issue"}'
