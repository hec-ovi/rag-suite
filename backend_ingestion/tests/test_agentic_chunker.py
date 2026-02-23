from __future__ import annotations

from src.tools.agentic_chunker import AgenticChunker
from src.tools.json_response_parser import JsonResponseParser


class _StubChatClient:
    async def complete(self, **_: object) -> str:  # noqa: ANN003
        return (
            "<thinking>considering split strategy</thinking>\n"
            '{"chunks":[{"text":"Alpha section.","rationale":"Topic boundary"}]}'
        )


class _StubPromptLoader:
    def load(self, _: str) -> str:
        return "prompt"


async def test_agentic_chunker_ignores_thinking_sections() -> None:
    chunker = AgenticChunker(
        chat_client=_StubChatClient(),
        prompt_loader=_StubPromptLoader(),
        parser=JsonResponseParser(),
    )

    chunks = await chunker.chunk(
        text="Alpha section. Beta section.",
        model="gpt-oss:20b",
        max_chunk_chars=400,
        min_chunk_chars=40,
    )

    assert len(chunks) == 1
    assert chunks[0].text == "Alpha section."
    assert chunks[0].rationale == "Topic boundary"
