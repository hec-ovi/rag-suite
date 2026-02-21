from __future__ import annotations

import re

from src.models.runtime.pipeline import ChunkCandidate


class DeterministicChunker:
    """Paragraph-aware dynamic chunker with overlap support."""

    def chunk(self, text: str, max_chunk_chars: int, min_chunk_chars: int, overlap_chars: int) -> list[ChunkCandidate]:
        """Create variable-size chunks using paragraph boundaries when possible."""

        raw_paragraphs = [paragraph.strip() for paragraph in text.split("\n\n") if paragraph.strip()]
        paragraphs: list[str] = []
        for paragraph in raw_paragraphs:
            paragraphs.extend(
                self._split_long_paragraph(
                    paragraph=paragraph,
                    max_chunk_chars=max_chunk_chars,
                    min_chunk_chars=min_chunk_chars,
                )
            )

        if not paragraphs:
            return []

        chunks: list[str] = []
        current = ""
        heading_fusion_budget = max_chunk_chars + max(80, overlap_chars)

        for paragraph in paragraphs:
            if not current:
                current = paragraph
                continue

            tentative = f"{current}\n\n{paragraph}"
            # Keep short heading-style fragments attached to the next paragraph
            # so they do not become low-value standalone chunks.
            if len(tentative) <= max_chunk_chars or (
                len(current) < min_chunk_chars and len(tentative) <= heading_fusion_budget
            ):
                current = tentative
                continue

            chunks.append(current)
            current = paragraph

        if current:
            chunks.append(current)

        merged_chunks: list[str] = []
        for chunk in chunks:
            if (
                merged_chunks
                and len(chunk) < min_chunk_chars
                and len(merged_chunks[-1]) + 2 + len(chunk) <= heading_fusion_budget
            ):
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

    def _split_long_paragraph(self, paragraph: str, max_chunk_chars: int, min_chunk_chars: int) -> list[str]:
        """Split oversized paragraphs by sentence boundaries, with hard-wrap fallback."""

        if len(paragraph) <= max_chunk_chars:
            return [paragraph]

        sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", paragraph) if part.strip()]
        if len(sentences) <= 1:
            return self._hard_wrap(paragraph, max_chunk_chars)

        pieces: list[str] = []
        current = sentences[0]

        for sentence in sentences[1:]:
            tentative = f"{current} {sentence}".strip()
            if len(tentative) <= max_chunk_chars:
                current = tentative
                continue

            pieces.append(current)
            current = sentence

        if current:
            pieces.append(current)

        normalized_pieces: list[str] = []
        for piece in pieces:
            if len(piece) <= max_chunk_chars:
                normalized_pieces.append(piece)
            else:
                normalized_pieces.extend(self._hard_wrap(piece, max_chunk_chars))

        merged_pieces: list[str] = []
        for piece in normalized_pieces:
            if merged_pieces and len(piece) < min_chunk_chars:
                merged_pieces[-1] = f"{merged_pieces[-1]} {piece}".strip()
            else:
                merged_pieces.append(piece)

        return merged_pieces

    def _hard_wrap(self, text: str, max_chunk_chars: int) -> list[str]:
        """Hard-wrap text when no sentence boundaries are available."""

        wrapped: list[str] = []
        for start in range(0, len(text), max_chunk_chars):
            segment = text[start : start + max_chunk_chars].strip()
            if segment:
                wrapped.append(segment)
        return wrapped
