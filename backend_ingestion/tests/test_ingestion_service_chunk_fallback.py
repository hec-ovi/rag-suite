from __future__ import annotations

from typing import cast

from sqlalchemy.orm import Session

from src.core.config import Settings
from src.core.exceptions import ExternalServiceError
from src.models.api.pipeline import ChunkTextRequest
from src.services.ingestion_service import IngestionService
from src.tools.deterministic_chunker import DeterministicChunker
from src.tools.normalize_text import DeterministicTextNormalizer


class _FailingAgenticChunker:
    async def chunk(  # noqa: ARG002
        self,
        text: str,
        model: str,
        max_chunk_chars: int,
        min_chunk_chars: int,
        cancel_event: object | None = None,
    ):
        raise ExternalServiceError("simulated agentic failure")


class _UnusedContextualHeaderGenerator:
    async def contextualize(self, **_: object):
        return []


class _UnusedEmbeddingClient:
    async def embed_texts(self, model: str, texts: list[str]):  # noqa: ARG002
        return []


class _UnusedQdrantIndexer:
    async def ensure_collection(self, collection_name: str, vector_size: int):  # noqa: ARG002
        return None

    async def upsert_chunks(
        self,
        collection_name: str,  # noqa: ARG002
        vectors: list[list[float]],  # noqa: ARG002
        payloads: list[dict[str, object]],  # noqa: ARG002
        point_ids: list[str],  # noqa: ARG002
    ) -> None:
        return None


async def test_agentic_chunking_falls_back_to_deterministic_when_ollama_fails() -> None:
    service = IngestionService(
        session=cast(Session, None),
        settings=Settings(),
        normalizer=DeterministicTextNormalizer(),
        deterministic_chunker=DeterministicChunker(),
        agentic_chunker=_FailingAgenticChunker(),
        contextual_header_generator=_UnusedContextualHeaderGenerator(),
        embedding_client=_UnusedEmbeddingClient(),
        qdrant_indexer=_UnusedQdrantIndexer(),
    )

    response = await service.chunk_text(
        ChunkTextRequest(
            text=(
                "Scope and definitions.\n\n"
                "This section establishes legal terms and references used throughout the agreement."
            ),
            mode="agentic",
            max_chunk_chars=1500,
            min_chunk_chars=200,
            overlap_chars=120,
            llm_model=None,
        )
    )

    assert response.mode == "agentic"
    assert len(response.chunks) >= 1
    assert all(
        (chunk.rationale or "").startswith("Fallback to deterministic chunking")
        for chunk in response.chunks
    )
