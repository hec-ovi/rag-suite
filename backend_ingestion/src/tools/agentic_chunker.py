from __future__ import annotations

import asyncio

from src.core.exceptions import OperationCancelledError, ValidationDomainError
from src.models.runtime.pipeline import ChunkCandidate
from src.tools.json_response_parser import JsonResponseParser
from src.tools.ollama_chat_client import OllamaChatClient
from src.tools.prompt_loader import PromptLoader


class AgenticChunker:
    """LLM-driven chunk boundary proposer for experimental ingestion mode."""

    def __init__(self, chat_client: OllamaChatClient, prompt_loader: PromptLoader, parser: JsonResponseParser) -> None:
        self._chat_client = chat_client
        self._prompt_loader = prompt_loader
        self._parser = parser

    async def chunk(
        self,
        text: str,
        model: str,
        max_chunk_chars: int,
        min_chunk_chars: int,
        cancel_event: asyncio.Event | None = None,
    ) -> list[ChunkCandidate]:
        """Ask the model to propose chunks and return validated boundaries."""

        if cancel_event is not None and cancel_event.is_set():
            raise OperationCancelledError("Chunking interrupted by user request.")

        system_prompt = self._prompt_loader.load("agentic_chunk_selector.md")
        user_prompt = (
            "Return JSON with this schema: "
            '{"chunks":[{"text":"...","rationale":"..."}]}. '
            f"Constraints: max_chunk_chars={max_chunk_chars}, min_chunk_chars={min_chunk_chars}.\n\n"
            f"TEXT:\n{text}"
        )

        completion = await self._chat_client.complete(
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            cancel_event=cancel_event,
        )
        payload = self._parser.parse(completion)

        raw_chunks = payload.get("chunks")
        if not isinstance(raw_chunks, list) or not raw_chunks:
            raise ValidationDomainError("Agentic chunking did not return any chunks")

        chunks: list[ChunkCandidate] = []
        cursor = 0
        for index, raw_chunk in enumerate(raw_chunks):
            if not isinstance(raw_chunk, dict):
                raise ValidationDomainError("Agentic chunk entry is malformed")

            text_value = raw_chunk.get("text")
            rationale_value = raw_chunk.get("rationale")
            if not isinstance(text_value, str) or not text_value.strip():
                raise ValidationDomainError("Agentic chunk text is missing")

            chunk_text = text_value.strip()
            start = text.find(chunk_text, cursor)
            if start == -1:
                start = cursor
            end = start + len(chunk_text)

            rationale = rationale_value if isinstance(rationale_value, str) else "Agentic boundary selection"

            chunks.append(
                ChunkCandidate(
                    chunk_index=index,
                    start_char=start,
                    end_char=end,
                    text=chunk_text,
                    rationale=rationale,
                )
            )
            cursor = end

        return chunks
