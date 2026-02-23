from __future__ import annotations

import re

_THINKING_BLOCK_PATTERN = re.compile(r"<thinking>.*?</thinking>", flags=re.IGNORECASE | re.DOTALL)
_THINKING_TAG_PATTERN = re.compile(r"</?thinking>", flags=re.IGNORECASE)


def strip_thinking_sections(text: str) -> str:
    """Remove model reasoning tags/blocks from assistant output."""

    without_blocks = _THINKING_BLOCK_PATTERN.sub("", text)
    without_tags = _THINKING_TAG_PATTERN.sub("", without_blocks)
    return without_tags.strip()
