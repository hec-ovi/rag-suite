from __future__ import annotations

import pytest

from src.core.exceptions import ValidationDomainError
from src.tools.json_response_parser import JsonResponseParser


def test_parser_strips_thinking_for_plain_json_payload() -> None:
    parser = JsonResponseParser()

    payload = parser.parse(
        "<thinking>internal chain-of-thought</thinking>\n"
        '{"chunks":[{"text":"Alpha section","rationale":"Keep section boundary"}]}'
    )

    assert payload["chunks"] == [{"text": "Alpha section", "rationale": "Keep section boundary"}]


def test_parser_strips_thinking_for_fenced_json_payload() -> None:
    parser = JsonResponseParser()

    payload = parser.parse(
        "<thinking>scratchpad</thinking>\n"
        "```json\n"
        '{"chunks":[{"text":"Beta section","rationale":"Semantic unit"}]}\n'
        "```"
    )

    assert payload["chunks"] == [{"text": "Beta section", "rationale": "Semantic unit"}]


def test_parser_rejects_response_without_json_after_thinking_removal() -> None:
    parser = JsonResponseParser()

    with pytest.raises(ValidationDomainError, match="valid JSON"):
        parser.parse("<thinking>no final answer emitted</thinking>")
