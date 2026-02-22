from __future__ import annotations

from sqlalchemy.orm import Session

from src.core.config import Settings
from src.services.inference_service import InferenceService
from src.services.ingestion_service import IngestionService
from src.services.project_service import ProjectService
from src.services.retrieval_service import RetrievalService
from src.tools.agentic_chunker import AgenticChunker
from src.tools.contextual_header_generator import ContextualHeaderGenerator
from src.tools.deterministic_chunker import DeterministicChunker
from src.tools.hybrid_ranker import HybridRanker
from src.tools.json_response_parser import JsonResponseParser
from src.tools.normalize_text import DeterministicTextNormalizer
from src.tools.ollama_chat_client import OllamaChatClient
from src.tools.ollama_embedding_client import OllamaEmbeddingClient
from src.tools.ollama_inference_client import OllamaInferenceClient
from src.tools.prompt_loader import PromptLoader
from src.tools.qdrant_indexer import QdrantIndexer


def build_project_service(session: Session, settings: Settings) -> ProjectService:
    """Build project service instance."""

    return ProjectService(
        session=session,
        collection_prefix=settings.qdrant_collection_prefix,
        qdrant_indexer=QdrantIndexer(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            timeout_seconds=settings.qdrant_timeout_seconds,
        ),
    )


def build_ingestion_service(session: Session, settings: Settings) -> IngestionService:
    """Build ingestion service with concrete tool adapters."""

    prompt_loader = PromptLoader()
    parser = JsonResponseParser()

    chat_client = OllamaChatClient(
        base_url=settings.ollama_url,
        timeout_seconds=settings.ollama_timeout_seconds,
    )
    embedding_client = OllamaEmbeddingClient(
        base_url=settings.ollama_url,
        timeout_seconds=settings.ollama_timeout_seconds,
    )

    return IngestionService(
        session=session,
        settings=settings,
        normalizer=DeterministicTextNormalizer(),
        deterministic_chunker=DeterministicChunker(),
        agentic_chunker=AgenticChunker(chat_client=chat_client, prompt_loader=prompt_loader, parser=parser),
        contextual_header_generator=ContextualHeaderGenerator(chat_client=chat_client, prompt_loader=prompt_loader),
        embedding_client=embedding_client,
        qdrant_indexer=QdrantIndexer(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            timeout_seconds=settings.qdrant_timeout_seconds,
        ),
    )


def build_retrieval_service(session: Session, settings: Settings) -> RetrievalService:
    """Build retrieval service with hybrid ranking tools."""

    prompt_loader = PromptLoader()
    chat_client = OllamaChatClient(
        base_url=settings.ollama_url,
        timeout_seconds=settings.ollama_timeout_seconds,
    )
    embedding_client = OllamaEmbeddingClient(
        base_url=settings.ollama_url,
        timeout_seconds=settings.ollama_timeout_seconds,
    )

    return RetrievalService(
        session=session,
        settings=settings,
        embedding_client=embedding_client,
        chat_client=chat_client,
        prompt_loader=prompt_loader,
        qdrant_indexer=QdrantIndexer(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            timeout_seconds=settings.qdrant_timeout_seconds,
        ),
        hybrid_ranker=HybridRanker(),
    )


def build_inference_service(settings: Settings) -> InferenceService:
    """Build OpenAI-compatible inference service backed by Ollama."""

    return InferenceService(
        ollama_client=OllamaInferenceClient(
            base_url=settings.ollama_url,
            timeout_seconds=settings.ollama_timeout_seconds,
        )
    )
