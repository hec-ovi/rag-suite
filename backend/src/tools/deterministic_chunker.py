from __future__ import annotations

from src.models.runtime.pipeline import ChunkCandidate


class DeterministicChunker:
    """Paragraph-aware dynamic chunker with overlap support."""

    def chunk(self, text: str, max_chunk_chars: int, min_chunk_chars: int, overlap_chars: int) -> list[ChunkCandidate]:
        """Create variable-size chunks using paragraph boundaries when possible."""

        paragraphs = [paragraph.strip() for paragraph in text.split("\n\n") if paragraph.strip()]
        if not paragraphs:
            return []

        chunks: list[str] = []
        current = ""

        for paragraph in paragraphs:
            if not current:
                current = paragraph
                continue

            tentative = f"{current}\n\n{paragraph}"
            if len(tentative) <= max_chunk_chars:
                current = tentative
                continue

            chunks.append(current)
            current = paragraph

        if current:
            chunks.append(current)

        merged_chunks: list[str] = []
        for chunk in chunks:
            if merged_chunks and len(chunk) < min_chunk_chars:
                merged_chunks[-1] = f"{merged_chunks[-1]}\n\n{chunk}".strip()
            else:
                merged_chunks.append(chunk)

        chunk_candidates: list[ChunkCandidate] = []
        cursor = 0
        for index, chunk_text in enumerate(merged_chunks):
            start = text.find(chunk_text, cursor)
            if start == -1:
                start = cursor
            end = start + len(chunk_text)

            chunk_candidates.append(
                ChunkCandidate(
                    chunk_index=index,
                    start_char=start,
                    end_char=end,
                    text=chunk_text,
                    rationale="Deterministic paragraph-aware boundary",
                )
            )

            if overlap_chars > 0:
                cursor = max(end - overlap_chars, 0)
            else:
                cursor = end

        return chunk_candidates
