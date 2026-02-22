from __future__ import annotations

import json
import re

from src.core.exceptions import ValidationDomainError


class JsonResponseParser:
    """Parses model responses into JSON payloads."""

    def parse(self, response_text: str) -> dict[str, object]:
        """Parse raw model output and extract JSON object content."""

        stripped = response_text.strip()
        try:
            payload = json.loads(stripped)
            if isinstance(payload, dict):
                return payload
        except json.JSONDecodeError:
            pass

        block_match = re.search(r"```json\s*(\{.*?\})\s*```", stripped, flags=re.DOTALL)
        if block_match is None:
            raise ValidationDomainError("Model response did not contain valid JSON")

        try:
            payload = json.loads(block_match.group(1))
        except json.JSONDecodeError as error:
            raise ValidationDomainError("Model JSON block is invalid") from error

        if not isinstance(payload, dict):
            raise ValidationDomainError("Model JSON response must be an object")
        return payload
