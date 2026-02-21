from __future__ import annotations

import re
from collections import Counter

from src.models.runtime.pipeline import NormalizationResult


class DeterministicTextNormalizer:
    """Deterministic normalization for ingestion-safe text cleanup."""

    def normalize(
        self,
        text: str,
        max_blank_lines: int,
        remove_repeated_short_lines: bool,
    ) -> NormalizationResult:
        """Normalize whitespace and repeated short headers/footers."""

        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        normalized, _ = re.subn(r"[\u200b\u200c\u200d\ufeff]", "", normalized)
        normalized, _ = re.subn(r"(\w)-\n(\w)", r"\1\2", normalized)

        collapsed_whitespace_count = 0
        normalized, replacements = re.subn(r"[^\S\n]+", " ", normalized)
        collapsed_whitespace_count += replacements

        lines = [line.strip() for line in normalized.split("\n")]

        removed_repeated_line_count = 0
        if remove_repeated_short_lines:
            short_lines = [line for line in lines if line and len(line) <= 100]
            counts = Counter(short_lines)
            repeated = {line for line, count in counts.items() if count >= 3}
            if repeated:
                filtered_lines: list[str] = []
                for line in lines:
                    if line in repeated:
                        removed_repeated_line_count += 1
                        continue
                    filtered_lines.append(line)
                lines = filtered_lines

        compacted_lines: list[str] = []
        blank_count = 0
        for line in lines:
            if line:
                blank_count = 0
                compacted_lines.append(line)
                continue

            blank_count += 1
            if blank_count <= max_blank_lines:
                compacted_lines.append("")

        normalized = "\n".join(compacted_lines).strip()

        return NormalizationResult(
            normalized_text=normalized,
            removed_repeated_line_count=removed_repeated_line_count,
            collapsed_whitespace_count=collapsed_whitespace_count,
        )
