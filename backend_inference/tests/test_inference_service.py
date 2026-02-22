from __future__ import annotations

import pytest

from src.core.exceptions import ValidationDomainError
from src.models.api.inference import (
    ChatCompletionsRequest,
    ChatMessage,
    CompletionsRequest,
    EmbeddingsRequest,
)
from src.models.runtime.inference import ChatGenerationResult, EmbeddingGenerationResult
from src.services.inference_service import InferenceService


class _StubOllamaInferenceClient:
    async def chat(  # noqa: ARG002
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int | None,
    ) -> ChatGenerationResult:
        return ChatGenerationResult(
            content=f"stub-response:{model}:{len(messages)}",
            prompt_tokens=12,
            completion_tokens=7,
            finish_reason="stop",
        )

    async def embed(self, model: str, texts: list[str]) -> EmbeddingGenerationResult:  # noqa: ARG002
        return EmbeddingGenerationResult(
            embeddings=[[0.1, 0.2], [0.3, 0.4]][: len(texts)],
            prompt_tokens=8,
        )


async def test_chat_completions_response_shape() -> None:
    service = InferenceService(ollama_client=_StubOllamaInferenceClient())

    response = await service.chat_completions(
        ChatCompletionsRequest(
            model="gpt-oss:20b",
            messages=[ChatMessage(role="user", content="Hello")],
            stream=False,
        )
    )

    assert response.object == "chat.completion"
    assert response.choices[0].message.content.startswith("stub-response:gpt-oss:20b")
    assert response.usage.total_tokens == 19


async def test_text_completions_accept_prompt_list() -> None:
    service = InferenceService(ollama_client=_StubOllamaInferenceClient())

    response = await service.completions(
        CompletionsRequest(
            model="gpt-oss:20b",
            prompt=["First line", "Second line"],
            stream=False,
        )
    )

    assert response.object == "text_completion"
    assert response.choices[0].finish_reason == "stop"


async def test_embeddings_response_shape() -> None:
    service = InferenceService(ollama_client=_StubOllamaInferenceClient())

    response = await service.embeddings(
        EmbeddingsRequest(
            model="bge-m3:latest",
            input=["alpha", "beta"],
        )
    )

    assert response.object == "list"
    assert len(response.data) == 2
    assert response.data[0].object == "embedding"


async def test_chat_completions_rejects_stream_true() -> None:
    service = InferenceService(ollama_client=_StubOllamaInferenceClient())

    with pytest.raises(ValidationDomainError, match="stream=true is not supported"):
        await service.chat_completions(
            ChatCompletionsRequest(
                model="gpt-oss:20b",
                messages=[ChatMessage(role="user", content="Hello")],
                stream=True,
            )
        )


async def test_text_completions_rejects_empty_prompt_list() -> None:
    service = InferenceService(ollama_client=_StubOllamaInferenceClient())

    with pytest.raises(ValidationDomainError, match="prompt list must contain at least one non-empty item"):
        await service.completions(
            CompletionsRequest(
                model="gpt-oss:20b",
                prompt=["", "   "],
                stream=False,
            )
        )


async def test_embeddings_reject_empty_input_list() -> None:
    service = InferenceService(ollama_client=_StubOllamaInferenceClient())

    with pytest.raises(ValidationDomainError, match="input list must contain at least one non-empty item"):
        await service.embeddings(
            EmbeddingsRequest(
                model="bge-m3:latest",
                input=["", "   "],
            )
        )
