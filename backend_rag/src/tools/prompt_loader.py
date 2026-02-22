from __future__ import annotations

from pathlib import Path

from src.core.exceptions import ValidationDomainError


class PromptLoader:
    """Load markdown prompts from the local prompts directory."""

    def __init__(self, prompts_dir: Path | None = None) -> None:
        root = Path(__file__).resolve().parents[1]
        self._prompts_dir = prompts_dir or (root / "prompts")

    def load(self, prompt_name: str) -> str:
        """Return prompt contents for a given markdown file."""

        if not prompt_name.endswith(".md"):
            raise ValidationDomainError("Prompt names must use .md extension")

        prompt_path = self._prompts_dir / prompt_name
        if not prompt_path.exists():
            raise ValidationDomainError(f"Prompt file not found: {prompt_name}")

        return prompt_path.read_text(encoding="utf-8").strip()
