from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class NormalizationResult:
    """Deterministic normalization output."""

    normalized_text: str
    removed_repeated_line_count: int
    collapsed_whitespace_count: int


@dataclass(slots=True)
class ChunkCandidate:
    """Runtime chunk proposal."""

    chunk_index: int
    start_char: int
    end_char: int
    text: str
    rationale: str | None


@dataclass(slots=True)
class ContextualizedChunkCandidate:
    """Runtime contextualized chunk payload."""

    chunk_index: int
    start_char: int
    end_char: int
    rationale: str | None
    chunk_text: str
    context_header: str
    contextualized_text: str
