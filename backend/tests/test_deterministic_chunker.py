from __future__ import annotations

from src.tools.deterministic_chunker import DeterministicChunker


def test_deterministic_chunker_respects_max_size_and_order() -> None:
    chunker = DeterministicChunker()

    text = "\n\n".join(
        [
            "Section 1 " + ("a" * 400),
            "Section 2 " + ("b" * 400),
            "Section 3 " + ("c" * 400),
            "Section 4 " + ("d" * 400),
        ]
    )

    chunks = chunker.chunk(text=text, max_chunk_chars=900, min_chunk_chars=200, overlap_chars=0)

    assert len(chunks) >= 2
    assert chunks[0].chunk_index == 0
    assert all(chunk.start_char < chunk.end_char for chunk in chunks)
    assert all(len(chunk.text) <= 950 for chunk in chunks)


def test_deterministic_chunker_merges_tiny_tail_chunks() -> None:
    chunker = DeterministicChunker()

    text = "Paragraph alpha." + "\n\n" + ("beta " * 250) + "\n\n" + "tail"
    chunks = chunker.chunk(text=text, max_chunk_chars=1000, min_chunk_chars=200, overlap_chars=0)

    assert len(chunks) >= 1
    assert "tail" in chunks[-1].text
