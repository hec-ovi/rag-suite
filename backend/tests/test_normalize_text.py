from __future__ import annotations

from src.tools.normalize_text import DeterministicTextNormalizer


def test_normalizer_removes_repeated_short_lines_and_collapses_spaces() -> None:
    normalizer = DeterministicTextNormalizer()

    text = (
        "Header\n"
        "Header\n"
        "Header\n"
        "Clause   A    starts here.\n\n\n"
        "Clause B continues.\n"
    )

    result = normalizer.normalize(text=text, max_blank_lines=1, remove_repeated_short_lines=True)

    assert "Header" not in result.normalized_text
    assert "Clause A starts here." in result.normalized_text
    assert "\n\n\n" not in result.normalized_text
    assert result.removed_repeated_line_count == 3


def test_normalizer_keeps_repeated_short_lines_when_disabled() -> None:
    normalizer = DeterministicTextNormalizer()

    text = "Index\nIndex\nIndex\nBody"
    result = normalizer.normalize(text=text, max_blank_lines=1, remove_repeated_short_lines=False)

    assert result.normalized_text.startswith("Index")
    assert result.removed_repeated_line_count == 0


def test_normalizer_can_remove_blank_lines_when_configured() -> None:
    normalizer = DeterministicTextNormalizer()

    text = "Paragraph A.\n\n\nParagraph B.\n\nParagraph C."
    result = normalizer.normalize(text=text, max_blank_lines=0, remove_repeated_short_lines=False)

    assert result.normalized_text == "Paragraph A.\nParagraph B.\nParagraph C."
