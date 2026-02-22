from __future__ import annotations

import re


class CitationParser:
    """Extract citation labels from model answers."""

    _citation_pattern = re.compile(r"[\[【](S\d+)[\]】]")

    def extract(self, answer: str, available_source_ids: set[str]) -> list[str]:
        """Return deduplicated citations in first-seen order."""

        seen: set[str] = set()
        ordered: list[str] = []

        for match in self._citation_pattern.findall(answer):
            if match in seen or match not in available_source_ids:
                continue
            seen.add(match)
            ordered.append(match)

        return ordered
