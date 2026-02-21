from __future__ import annotations

from pathlib import Path


class PromptLoader:
    """Loads markdown prompt templates from the prompts folder."""

    def __init__(self) -> None:
        self._prompts_dir = Path(__file__).resolve().parents[1] / "prompts"

    def load(self, filename: str) -> str:
        """Read a prompt file as UTF-8 text."""

        prompt_path = self._prompts_dir / filename
        return prompt_path.read_text(encoding="utf-8")
