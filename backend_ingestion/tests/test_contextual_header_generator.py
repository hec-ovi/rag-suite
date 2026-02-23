from __future__ import annotations

from src.models.runtime.pipeline import ChunkCandidate
from src.tools.contextual_header_generator import ContextualHeaderGenerator


class _StubChatClient:
    async def complete(self, **_: object) -> str:  # noqa: ANN003
        return "<thinking>drafting header</thinking>\nThis chunk defines payment obligations."


class _StubPromptLoader:
    def load(self, _: str) -> str:
        return "prompt"


async def test_contextual_header_generator_strips_thinking_tags() -> None:
    generator = ContextualHeaderGenerator(
        chat_client=_StubChatClient(),
        prompt_loader=_StubPromptLoader(),
    )
    chunks = [
        ChunkCandidate(
            chunk_index=0,
            start_char=0,
            end_char=25,
            text="Payment obligations are listed.",
            rationale="unit",
        )
    ]

    contextualized = await generator.contextualize(
        document_name="contract.txt",
        full_document_text="Payment obligations are listed.",
        chunks=chunks,
        mode="llm",
        model="gpt-oss:20b",
    )

    assert len(contextualized) == 1
    assert contextualized[0].context_header == "This chunk defines payment obligations."
    assert contextualized[0].contextualized_text.startswith("This chunk defines payment obligations.\n\n")
