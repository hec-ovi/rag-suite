from __future__ import annotations

import asyncio

from src.core.exceptions import OperationCancelledError
from src.models.runtime.pipeline import ChunkCandidate, ContextualizedChunkCandidate
from src.tools.ollama_chat_client import OllamaChatClient
from src.tools.prompt_loader import PromptLoader


class ContextualHeaderGenerator:
    """Generates contextual headers for chunk-level retrieval quality."""

    def __init__(self, chat_client: OllamaChatClient, prompt_loader: PromptLoader) -> None:
        self._chat_client = chat_client
        self._prompt_loader = prompt_loader

    async def contextualize(
        self,
        document_name: str,
        full_document_text: str,
        chunks: list[ChunkCandidate],
        mode: str,
        model: str,
        cancel_event: asyncio.Event | None = None,
    ) -> list[ContextualizedChunkCandidate]:
        """Contextualize chunks using llm or deterministic template mode."""

        contextualized: list[ContextualizedChunkCandidate] = []

        for chunk in chunks:
            if cancel_event is not None and cancel_event.is_set():
                raise OperationCancelledError("Contextual retrieval interrupted by user request.")

            if mode == "llm":
                header = await self._generate_llm_header(
                    model=model,
                    document_name=document_name,
                    full_document_text=full_document_text,
                    chunk_text=chunk.text,
                    cancel_event=cancel_event,
                )
            else:
                header = self._template_header(document_name=document_name, chunk_index=chunk.chunk_index)

            contextualized_text = f"{header}\n\n{chunk.text}".strip()
            contextualized.append(
                ContextualizedChunkCandidate(
                    chunk_index=chunk.chunk_index,
                    start_char=chunk.start_char,
                    end_char=chunk.end_char,
                    rationale=chunk.rationale,
                    chunk_text=chunk.text,
                    context_header=header,
                    contextualized_text=contextualized_text,
                )
            )

        return contextualized

    async def _generate_llm_header(
        self,
        model: str,
        document_name: str,
        full_document_text: str,
        chunk_text: str,
        cancel_event: asyncio.Event | None = None,
    ) -> str:
        """Generate a concise chunk header with document-level awareness."""

        system_prompt = self._prompt_loader.load("contextual_chunk_header.md")
        user_prompt = (
            f"DOCUMENT NAME: {document_name}\n\n"
            f"FULL DOCUMENT:\n{full_document_text}\n\n"
            f"TARGET CHUNK:\n{chunk_text}\n\n"
            "Return only the contextual header sentence(s)."
        )
        response = await self._chat_client.complete(
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            cancel_event=cancel_event,
        )
        return response.strip()

    def _template_header(self, document_name: str, chunk_index: int) -> str:
        """Produce deterministic fallback headers."""

        return f"Document '{document_name}', chunk {chunk_index + 1}."
