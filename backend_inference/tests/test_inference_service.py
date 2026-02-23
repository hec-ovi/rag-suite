from __future__ import annotations

import json

import pytest

from src.core.exceptions import ValidationDomainError
from src.models.api.inference import (
    ChatCompletionsRequest,
    ChatMessage,
    CompletionsRequest,
    EmbeddingsRequest,
    RerankRequest,
)
from src.models.runtime.inference import (
    ChatGenerationResult,
    EmbeddingGenerationResult,
    RerankGenerationResult,
    RerankResult,
)
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

    async def chat_stream(  # noqa: ARG002
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int | None,
    ):
        from src.models.runtime.inference import ChatStreamChunk

        yield ChatStreamChunk(
            content_delta="stub-",
            done=False,
            finish_reason=None,
            prompt_tokens=None,
            completion_tokens=None,
        )
        yield ChatStreamChunk(
            content_delta="response",
            done=False,
            finish_reason=None,
            prompt_tokens=None,
            completion_tokens=None,
        )
        yield ChatStreamChunk(
            content_delta="",
            done=True,
            finish_reason="stop",
            prompt_tokens=12,
            completion_tokens=7,
        )

    async def embed(self, model: str, texts: list[str]) -> EmbeddingGenerationResult:  # noqa: ARG002
        return EmbeddingGenerationResult(
            embeddings=[[0.1, 0.2], [0.3, 0.4]][: len(texts)],
            prompt_tokens=8,
        )


class _StubRerankerApiClient:
    async def rerank(  # noqa: ARG002
        self,
        model: str,
        query: str,
        documents: list[str],
        top_n: int | None,
    ) -> RerankGenerationResult:
        return RerankGenerationResult(
            results=[
                RerankResult(index=1, relevance_score=0.9),
                RerankResult(index=0, relevance_score=0.6),
            ][: (top_n or len(documents))]
        )


async def test_chat_completions_response_shape() -> None:
    service = InferenceService(
        ollama_client=_StubOllamaInferenceClient(),
        reranker_client=_StubRerankerApiClient(),
    )

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
    service = InferenceService(
        ollama_client=_StubOllamaInferenceClient(),
        reranker_client=_StubRerankerApiClient(),
    )

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
    service = InferenceService(
        ollama_client=_StubOllamaInferenceClient(),
        reranker_client=_StubRerankerApiClient(),
    )

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
    service = InferenceService(
        ollama_client=_StubOllamaInferenceClient(),
        reranker_client=_StubRerankerApiClient(),
    )

    with pytest.raises(ValidationDomainError, match="stream=true must be sent to the streaming route response path"):
        await service.chat_completions(
            ChatCompletionsRequest(
                model="gpt-oss:20b",
                messages=[ChatMessage(role="user", content="Hello")],
                stream=True,
            )
        )


async def test_chat_completions_stream_emits_openai_sse_frames() -> None:
    service = InferenceService(
        ollama_client=_StubOllamaInferenceClient(),
        reranker_client=_StubRerankerApiClient(),
    )
    request = ChatCompletionsRequest(
        model="gpt-oss:20b",
        messages=[ChatMessage(role="user", content="Hello")],
        stream=True,
    )

    frames = [frame async for frame in service.chat_completions_stream(request)]

    assert frames[0].startswith("data: ")
    assert frames[-1] == "data: [DONE]\n\n"

    payloads = []
    for frame in frames[:-1]:
        row = frame.removeprefix("data: ").strip()
        payloads.append(json.loads(row))

    role_delta = payloads[0]["choices"][0]["delta"]
    assert role_delta["role"] == "assistant"

    content = "".join(
        str(payload["choices"][0]["delta"].get("content", ""))
        for payload in payloads
    )
    assert "stub-response" in content
    assert payloads[-1]["choices"][0]["finish_reason"] == "stop"
    assert payloads[-1]["usage"]["total_tokens"] == 19


async def test_text_completions_rejects_empty_prompt_list() -> None:
    service = InferenceService(
        ollama_client=_StubOllamaInferenceClient(),
        reranker_client=_StubRerankerApiClient(),
    )

    with pytest.raises(ValidationDomainError, match="prompt list must contain at least one non-empty item"):
        await service.completions(
            CompletionsRequest(
                model="gpt-oss:20b",
                prompt=["", "   "],
                stream=False,
            )
        )


async def test_embeddings_reject_empty_input_list() -> None:
    service = InferenceService(
        ollama_client=_StubOllamaInferenceClient(),
        reranker_client=_StubRerankerApiClient(),
    )

    with pytest.raises(ValidationDomainError, match="input list must contain at least one non-empty item"):
        await service.embeddings(
            EmbeddingsRequest(
                model="bge-m3:latest",
                input=["", "   "],
            )
        )


async def test_rerank_response_shape() -> None:
    service = InferenceService(
        ollama_client=_StubOllamaInferenceClient(),
        reranker_client=_StubRerankerApiClient(),
    )

    response = await service.rerank(
        RerankRequest(
            model="bge-reranker-v2-m3:latest",
            query="What is the policy?",
            documents=["Doc A", "Doc B"],
            top_n=2,
        )
    )

    assert response.model == "bge-reranker-v2-m3:latest"
    assert len(response.results) == 2
    assert response.results[0].index == 1
    assert response.results[0].relevance_score == 0.9
