from __future__ import annotations


class DomainError(Exception):
    """Base class for domain-level errors."""


class ValidationDomainError(DomainError):
    """Raised when business validation fails."""
