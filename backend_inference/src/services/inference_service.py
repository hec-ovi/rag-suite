from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from uuid import uuid4

from src.core.exceptions import ValidationDomainError
from src.models.api.inference import (
    ChatCompletionChoice,
    ChatCompletionChoiceMessage,
    ChatCompletionsRequest,
    ChatCompletionsResponse,
    CompletionChoice,
    CompletionsRequest,
    CompletionsResponse,
    CompletionUsage,
    EmbeddingData,
    EmbeddingsRequest,
    EmbeddingsResponse,
    EmbeddingsUsage,
    RerankRequest,
    RerankResponse,
    RerankResultRow,
)
from src.tools.ollama_inference_client import OllamaInferenceClient


class InferenceService:
    """Service exposing OpenAI-compatible inference responses via Ollama."""

    def __init__(self, ollama_client: OllamaInferenceClient) -> None:
        self._ollama_client = ollama_client

    async def chat_completions(self, request: ChatCompletionsRequest) -> ChatCompletionsResponse:
        """Run chat completions compatible with `/v1/chat/completions`."""

        if request.stream:
            raise ValidationDomainError("stream=true must be sent to the streaming route response path")

        result = await self._ollama_client.chat(
            model=request.model,
            messages=[{"role": item.role, "content": item.content} for item in request.messages],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        created = int(datetime.now(timezone.utc).timestamp())
        usage = CompletionUsage(
            prompt_tokens=result.prompt_tokens,
            completion_tokens=result.completion_tokens,
            total_tokens=result.prompt_tokens + result.completion_tokens,
        )

        return ChatCompletionsResponse(
            id=f"chatcmpl-{uuid4().hex[:24]}",
            object="chat.completion",
            created=created,
            model=request.model,
            choices=[
                ChatCompletionChoice(
                    index=0,
                    message=ChatCompletionChoiceMessage(role="assistant", content=result.content),
                    finish_reason=result.finish_reason,
                )
            ],
            usage=usage,
            created_at=datetime.now(timezone.utc),
        )

    async def chat_completions_stream(self, request: ChatCompletionsRequest) -> AsyncIterator[str]:
        """Run streamed chat completions compatible with OpenAI SSE transport."""

        completion_id = f"chatcmpl-{uuid4().hex[:24]}"
        created = int(datetime.now(timezone.utc).timestamp())

        # Emit assistant role first so clients can initialize choice/message state.
        yield self._to_sse_data(
            {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": request.model,
                "choices": [
                    {
                        "index": 0,
                        "delta": {"role": "assistant"},
                        "finish_reason": None,
                    }
                ],
            }
        )

        prompt_tokens = 0
        completion_tokens = 0
        finish_reason = "stop"

        async for chunk in self._ollama_client.chat_stream(
            model=request.model,
            messages=[{"role": item.role, "content": item.content} for item in request.messages],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        ):
            if chunk.content_delta:
                yield self._to_sse_data(
                    {
                        "id": completion_id,
                        "object": "chat.completion.chunk",
                        "created": created,
                        "model": request.model,
                        "choices": [
                            {
                                "index": 0,
                                "delta": {"content": chunk.content_delta},
                                "finish_reason": None,
                            }
                        ],
                    }
                )

            if chunk.done:
                if chunk.finish_reason:
                    finish_reason = chunk.finish_reason
                if isinstance(chunk.prompt_tokens, int):
                    prompt_tokens = max(chunk.prompt_tokens, 0)
                if isinstance(chunk.completion_tokens, int):
                    completion_tokens = max(chunk.completion_tokens, 0)

        usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        }

        yield self._to_sse_data(
            {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": request.model,
                "choices": [
                    {
                        "index": 0,
                        "delta": {},
                        "finish_reason": finish_reason,
                    }
                ],
                "usage": usage,
            }
        )
        yield "data: [DONE]\n\n"

    async def completions(self, request: CompletionsRequest) -> CompletionsResponse:
        """Run text completions compatible with `/v1/completions`."""

        if request.stream:
            raise ValidationDomainError("stream=true is not supported yet for text completions")

        prompt = self._normalize_prompt(request.prompt)
        result = await self._ollama_client.chat(
            model=request.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        created = int(datetime.now(timezone.utc).timestamp())
        usage = CompletionUsage(
            prompt_tokens=result.prompt_tokens,
            completion_tokens=result.completion_tokens,
            total_tokens=result.prompt_tokens + result.completion_tokens,
        )

        return CompletionsResponse(
            id=f"cmpl-{uuid4().hex[:24]}",
            object="text_completion",
            created=created,
            model=request.model,
            choices=[
                CompletionChoice(
                    text=result.content,
                    index=0,
                    finish_reason=result.finish_reason,
                )
            ],
            usage=usage,
            created_at=datetime.now(timezone.utc),
        )

    async def embeddings(self, request: EmbeddingsRequest) -> EmbeddingsResponse:
        """Run embeddings compatible with `/v1/embeddings`."""

        texts = self._normalize_embedding_input(request.input)
        result = await self._ollama_client.embed(model=request.model, texts=texts)

        return EmbeddingsResponse(
            object="list",
            model=request.model,
            data=[
                EmbeddingData(
                    object="embedding",
                    index=index,
                    embedding=vector,
                )
                for index, vector in enumerate(result.embeddings)
            ],
            usage=EmbeddingsUsage(
                prompt_tokens=result.prompt_tokens,
                total_tokens=result.prompt_tokens,
            ),
        )

    async def rerank(self, request: RerankRequest) -> RerankResponse:
        """Run query-document reranking compatible with Ollama `/api/rerank`."""

        query = request.query.strip()
        if not query:
            raise ValidationDomainError("query must not be empty")

        documents = self._normalize_rerank_documents(request.documents)
        top_n = request.top_n
        if top_n is not None and top_n > len(documents):
            top_n = len(documents)

        result = await self._ollama_client.rerank(
            model=request.model,
            query=query,
            documents=documents,
            top_n=top_n,
        )

        return RerankResponse(
            model=request.model,
            results=[
                RerankResultRow(
                    index=item.index,
                    relevance_score=item.relevance_score,
                )
                for item in result.results
            ],
        )

    def _normalize_prompt(self, prompt: str | list[str]) -> str:
        """Normalize completion prompt variants to a single prompt string."""

        if isinstance(prompt, str):
            normalized = prompt.strip()
            if normalized:
                return normalized
            raise ValidationDomainError("prompt must not be empty")

        non_empty = [item.strip() for item in prompt if item.strip()]
        if not non_empty:
            raise ValidationDomainError("prompt list must contain at least one non-empty item")

        return "\n".join(non_empty)

    def _normalize_embedding_input(self, embedding_input: str | list[str]) -> list[str]:
        """Normalize embedding input into a non-empty list."""

        if isinstance(embedding_input, str):
            normalized = embedding_input.strip()
            if normalized:
                return [normalized]
            raise ValidationDomainError("input must not be empty")

        texts = [item.strip() for item in embedding_input if item.strip()]
        if not texts:
            raise ValidationDomainError("input list must contain at least one non-empty item")

        return texts

    def _normalize_rerank_documents(self, documents: list[str]) -> list[str]:
        """Normalize rerank documents into a non-empty list."""

        normalized = [item.strip() for item in documents if isinstance(item, str) and item.strip()]
        if not normalized:
            raise ValidationDomainError("documents must contain at least one non-empty item")
        return normalized

    def _to_sse_data(self, payload: dict[str, object]) -> str:
        """Encode an SSE data frame."""

        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
