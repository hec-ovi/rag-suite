from __future__ import annotations


class DomainError(Exception):
    """Base class for domain-level errors."""


class ResourceNotFoundError(DomainError):
    """Raised when an entity is not found."""


class ValidationDomainError(DomainError):
    """Raised when business validation fails."""


class ExternalServiceError(DomainError):
    """Raised when an external dependency fails."""


class OperationCancelledError(DomainError):
    """Raised when a long-running operation is cancelled by the client."""
