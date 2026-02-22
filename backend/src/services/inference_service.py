from __future__ import annotations

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
)
from src.tools.ollama_inference_client import OllamaInferenceClient


class InferenceService:
    """Service exposing OpenAI-compatible inference responses via Ollama."""

    def __init__(self, ollama_client: OllamaInferenceClient) -> None:
        self._ollama_client = ollama_client

    async def chat_completions(self, request: ChatCompletionsRequest) -> ChatCompletionsResponse:
        """Run chat completions compatible with `/v1/chat/completions`."""

        if request.stream:
            raise ValidationDomainError("stream=true is not supported yet for chat completions")

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
