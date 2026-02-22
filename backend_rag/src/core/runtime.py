from __future__ import annotations

from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker

from src.core.config import Settings
from src.core.database import (
    build_engine,
    build_session_factory,
    initialize_database,
    resolve_local_path,
)
from src.services.hybrid_retrieval_service import HybridRetrievalService
from src.services.rag_chat_service import RagChatService
from src.services.rag_graph_service import RagGraphService
from src.tools.citation_parser import CitationParser
from src.tools.hybrid_ranker import HybridRanker
from src.tools.inference_api_client import InferenceApiClient
from src.tools.prompt_loader import PromptLoader
from src.tools.qdrant_searcher import QdrantSearcher


class RuntimeContainer:
    """Runtime dependency container for backend-rag."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

        self._engine: Engine = build_engine(settings.database_url)
        initialize_database(self._engine)
        self._session_factory: sessionmaker[Session] = build_session_factory(self._engine)

        self._inference_client = InferenceApiClient(
            base_url=settings.inference_api_url,
            timeout_seconds=settings.inference_timeout_seconds,
        )
        self._qdrant_searcher = QdrantSearcher(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            timeout_seconds=settings.qdrant_timeout_seconds,
        )

        retrieval_service = HybridRetrievalService(
            session_factory=self._session_factory,
            inference_client=self._inference_client,
            qdrant_searcher=self._qdrant_searcher,
            hybrid_ranker=HybridRanker(),
        )

        graph_service = RagGraphService(
            retrieval_service=retrieval_service,
            inference_client=self._inference_client,
            prompt_loader=PromptLoader(),
            checkpoint_path=str(resolve_local_path(settings.rag_checkpoint_path)),
            default_history_window_messages=settings.rag_default_history_window_messages,
        )

        self.rag_chat_service = RagChatService(
            graph_service=graph_service,
            citation_parser=CitationParser(),
            default_chat_model=settings.rag_chat_model,
            default_embedding_model=settings.rag_embedding_model,
            default_history_window_messages=settings.rag_default_history_window_messages,
        )

    def close(self) -> None:
        """Close shared clients and release runtime resources."""

        self.rag_chat_service.close()
        self._qdrant_searcher.close()
        self._inference_client.close()
        self._engine.dispose()
