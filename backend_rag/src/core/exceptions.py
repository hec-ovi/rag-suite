from __future__ import annotations


class DomainError(Exception):
    """Base class for domain-level errors."""


class ValidationDomainError(DomainError):
    """Raised when request data violates business rules."""


class ResourceNotFoundError(DomainError):
    """Raised when a requested record cannot be found."""


class ExternalServiceError(DomainError):
    """Raised when upstream service integrations fail."""
