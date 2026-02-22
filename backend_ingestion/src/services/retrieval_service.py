from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.config import Settings
from src.core.exceptions import ResourceNotFoundError
from src.models.api.retrieval import (
    GroundedAnswerRequest,
    GroundedAnswerResponse,
    HybridSearchChunk,
    HybridSearchRequest,
    HybridSearchResponse,
)
from src.models.db.chunk import ChunkORM
from src.models.db.document import DocumentORM
from src.models.db.project import ProjectORM
from src.models.runtime.retrieval import RetrievalChunkCandidate
from src.tools.hybrid_ranker import HybridRanker
from src.tools.ollama_chat_client import OllamaChatClient
from src.tools.ollama_embedding_client import OllamaEmbeddingClient
from src.tools.prompt_loader import PromptLoader
from src.tools.qdrant_indexer import QdrantIndexer


class RetrievalService:
    """Hybrid retrieval + grounded answer orchestration."""

    def __init__(
        self,
        session: Session,
        settings: Settings,
        embedding_client: OllamaEmbeddingClient,
        chat_client: OllamaChatClient,
        prompt_loader: PromptLoader,
        qdrant_indexer: QdrantIndexer,
        hybrid_ranker: HybridRanker,
    ) -> None:
        self._session = session
        self._settings = settings
        self._embedding_client = embedding_client
        self._chat_client = chat_client
        self._prompt_loader = prompt_loader
        self._qdrant_indexer = qdrant_indexer
        self._hybrid_ranker = hybrid_ranker

    async def hybrid_search(self, project_id: str, request: HybridSearchRequest) -> HybridSearchResponse:
        """Run hybrid retrieval over project chunks."""

        project = self._session.get(ProjectORM, project_id)
        if project is None:
            raise ResourceNotFoundError(f"Project '{project_id}' was not found")

        candidates = self._load_project_candidates(project_id=project_id)
        embedding_model = request.embedding_model or self._settings.ollama_embedding_model

        if not candidates:
            return HybridSearchResponse(
                project_id=project_id,
                query=request.query,
                embedding_model=embedding_model,
                dense_weight=request.dense_weight,
                chunks=[],
            )

        query_vector = (
            await self._embedding_client.embed_texts(
                model=embedding_model,
                texts=[request.query],
            )
        )[0]

        dense_hits = await self._qdrant_indexer.search_chunks(
            collection_name=project.qdrant_collection_name,
            query_vector=query_vector,
            limit=request.dense_top_k,
        )
        dense_scores = self._parse_dense_scores(dense_hits=dense_hits)

        sparse_scores = self._hybrid_ranker.score_sparse(
            query=request.query,
            candidates=candidates,
            top_k=request.sparse_top_k,
        )
        ranked = self._hybrid_ranker.fuse(
            candidates=candidates,
            dense_scores=dense_scores,
            sparse_scores=sparse_scores,
            top_k=request.top_k,
            dense_weight=request.dense_weight,
        )

        return HybridSearchResponse(
            project_id=project_id,
            query=request.query,
            embedding_model=embedding_model,
            dense_weight=request.dense_weight,
            chunks=[
                HybridSearchChunk(
                    rank=index + 1,
                    chunk_key=item.chunk_key,
                    document_id=item.document_id,
                    document_name=item.document_name,
                    chunk_index=item.chunk_index,
                    context_header=item.context_header,
                    text=item.text,
                    dense_score=item.dense_score,
                    sparse_score=item.sparse_score,
                    hybrid_score=item.hybrid_score,
                )
                for index, item in enumerate(ranked)
            ],
        )

    async def grounded_answer(self, project_id: str, request: GroundedAnswerRequest) -> GroundedAnswerResponse:
        """Generate a grounded answer over hybrid-ranked chunks."""

        retrieval = await self.hybrid_search(
            project_id=project_id,
            request=HybridSearchRequest(
                query=request.query,
                top_k=request.top_k,
                dense_top_k=request.dense_top_k,
                sparse_top_k=request.sparse_top_k,
                dense_weight=request.dense_weight,
                embedding_model=request.embedding_model,
            ),
        )

        answer_model = request.answer_model or self._settings.ollama_chat_model
        if not retrieval.chunks:
            return GroundedAnswerResponse(
                project_id=project_id,
                query=request.query,
                answer="No indexed chunks were found for this project yet.",
                answer_model=answer_model,
                citations=[],
            )

        context_blocks = []
        for chunk in retrieval.chunks:
            context_blocks.append(
                "\n".join(
                    [
                        f"[{chunk.chunk_key}] {chunk.document_name} (chunk {chunk.chunk_index + 1})",
                        chunk.context_header.strip() or "(no context header)",
                        chunk.text.strip(),
                    ]
                )
            )
        context_payload = "\n\n---\n\n".join(context_blocks)

        system_prompt = self._prompt_loader.load("grounded_answer.md")
        user_prompt = (
            f"QUESTION:\n{request.query}\n\n"
            f"RETRIEVED_CONTEXT:\n{context_payload}\n\n"
            "Respond with grounded facts only and include citations like [document_id:chunk_index]."
        )
        answer = await self._chat_client.complete(
            model=answer_model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        return GroundedAnswerResponse(
            project_id=project_id,
            query=request.query,
            answer=answer.strip(),
            answer_model=answer_model,
            citations=retrieval.chunks,
        )

    def _load_project_candidates(self, project_id: str) -> list[RetrievalChunkCandidate]:
        """Load chunk candidates available for sparse/hybrid ranking."""

        statement = (
            select(ChunkORM, DocumentORM.name)
            .join(DocumentORM, ChunkORM.document_id == DocumentORM.id)
            .where(DocumentORM.project_id == project_id)
            .order_by(DocumentORM.created_at.asc(), ChunkORM.chunk_index.asc())
        )
        rows = self._session.execute(statement).all()

        candidates: list[RetrievalChunkCandidate] = []
        for chunk, document_name in rows:
            chunk_key = f"{chunk.document_id}:{chunk.chunk_index}"
            candidates.append(
                RetrievalChunkCandidate(
                    chunk_key=chunk_key,
                    document_id=chunk.document_id,
                    document_name=document_name,
                    chunk_index=chunk.chunk_index,
                    context_header=(chunk.context_header or "").strip(),
                    text=chunk.contextualized_chunk,
                )
            )
        return candidates

    def _parse_dense_scores(self, dense_hits: list[object]) -> dict[str, float]:
        """Extract chunk-keyed dense scores from Qdrant results."""

        dense_scores: dict[str, float] = {}
        for hit in dense_hits:
            payload = getattr(hit, "payload", None)
            if not isinstance(payload, dict):
                continue

            chunk_key = payload.get("chunk_id")
            if not isinstance(chunk_key, str) or not chunk_key:
                continue

            score_raw = getattr(hit, "score", 0.0)
            score = float(score_raw) if isinstance(score_raw, int | float) else 0.0
            previous = dense_scores.get(chunk_key)
            if previous is None or score > previous:
                dense_scores[chunk_key] = score

        return dense_scores
