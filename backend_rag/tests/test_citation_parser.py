from __future__ import annotations

from src.tools.citation_parser import CitationParser


def test_extract_supports_ascii_and_fullwidth_brackets() -> None:
    parser = CitationParser()
    answer = "Fact [S1]. Another fact 【S2】. Duplicate [S1]. Missing [S3]."

    citations = parser.extract(answer=answer, available_source_ids={"S1", "S2"})

    assert citations == ["S1", "S2"]
