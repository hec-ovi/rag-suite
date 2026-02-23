from __future__ import annotations


class DomainError(Exception):
    """Base class for domain-level errors."""


class ValidationDomainError(DomainError):
    """Raised when request data violates business constraints."""


class ExternalServiceError(DomainError):
    """Raised when an external dependency fails."""
