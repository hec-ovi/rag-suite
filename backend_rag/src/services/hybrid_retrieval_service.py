from __future__ import annotations

from collections import defaultdict

from qdrant_client.http import models as qdrant_models
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from src.core.exceptions import ResourceNotFoundError, ValidationDomainError
from src.models.db.chunk import ChunkORM
from src.models.db.document import DocumentORM
from src.models.db.project import ProjectORM
from src.models.runtime.retrieval import (
    HybridRetrieveInput,
    HybridRetrieveResult,
    RankedSourceChunk,
    RetrievalChunkCandidate,
    RetrievedSourceDocument,
)
from src.tools.hybrid_ranker import HybridRanker
from src.tools.inference_api_client import InferenceApiClient
from src.tools.qdrant_searcher import QdrantSearcher


class HybridRetrievalService:
    """Project-scoped dense+sparse hybrid retrieval."""

    def __init__(
        self,
        session_factory: sessionmaker[Session],
        inference_client: InferenceApiClient,
        qdrant_searcher: QdrantSearcher,
        hybrid_ranker: HybridRanker,
    ) -> None:
        self._session_factory = session_factory
        self._inference_client = inference_client
        self._qdrant_searcher = qdrant_searcher
        self._hybrid_ranker = hybrid_ranker

    def retrieve(self, request: HybridRetrieveInput) -> HybridRetrieveResult:
        """Retrieve ranked chunks and document summaries for one query."""

        with self._session_factory() as session:
            project = session.get(ProjectORM, request.project_id)
            if project is None:
                raise ResourceNotFoundError(f"Project '{request.project_id}' was not found")

            filter_document_ids = self._validate_document_filter(
                session=session,
                project_id=request.project_id,
                document_ids=request.document_ids,
            )
            candidates = self._load_candidates(
                session=session,
                project_id=request.project_id,
                document_ids=filter_document_ids,
            )

            if not candidates:
                return HybridRetrieveResult(
                    project_id=request.project_id,
                    query=request.query,
                    embedding_model=request.embedding_model,
                    sources=[],
                    documents=[],
                )

            query_vector = self._inference_client.embed_texts(
                model=request.embedding_model,
                texts=[request.query],
            )[0]

            dense_hits = self._qdrant_searcher.search_chunks(
                collection_name=project.qdrant_collection_name,
                query_vector=query_vector,
                limit=request.dense_top_k,
                document_ids=filter_document_ids,
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

            documents = self._build_document_summaries(ranked)
            return HybridRetrieveResult(
                project_id=request.project_id,
                query=request.query,
                embedding_model=request.embedding_model,
                sources=ranked,
                documents=documents,
            )

    def _validate_document_filter(
        self,
        session: Session,
        project_id: str,
        document_ids: list[str] | None,
    ) -> list[str] | None:
        """Validate optional document-id filter against project ownership."""

        if not document_ids:
            return None

        deduplicated = list(dict.fromkeys(document_ids))
        statement = select(DocumentORM.id).where(
            DocumentORM.project_id == project_id,
            DocumentORM.id.in_(deduplicated),
        )
        rows = session.execute(statement).all()
        existing_ids = {row[0] for row in rows}

        missing = [item for item in deduplicated if item not in existing_ids]
        if missing:
            missing_joined = ", ".join(missing)
            raise ValidationDomainError(
                "Some document_ids do not belong to the selected project: "
                f"{missing_joined}"
            )

        return deduplicated

    def _load_candidates(
        self,
        session: Session,
        project_id: str,
        document_ids: list[str] | None,
    ) -> list[RetrievalChunkCandidate]:
        """Load approved project chunks for sparse and hybrid ranking."""

        statement = (
            select(ChunkORM, DocumentORM.name)
            .join(DocumentORM, ChunkORM.document_id == DocumentORM.id)
            .where(
                DocumentORM.project_id == project_id,
                ChunkORM.approved.is_(True),
            )
            .order_by(DocumentORM.created_at.asc(), ChunkORM.chunk_index.asc())
        )

        if document_ids:
            statement = statement.where(DocumentORM.id.in_(document_ids))

        rows = session.execute(statement).all()

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

    def _parse_dense_scores(self, dense_hits: list[qdrant_models.ScoredPoint]) -> dict[str, float]:
        """Extract chunk-keyed dense scores from Qdrant search hits."""

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

    def _build_document_summaries(self, ranked: list[RankedSourceChunk]) -> list[RetrievedSourceDocument]:
        """Aggregate ranked chunks into document-level summaries."""

        grouped: dict[str, list[RankedSourceChunk]] = defaultdict(list)
        for row in ranked:
            grouped[row.document_id].append(row)

        documents: list[RetrievedSourceDocument] = []
        for document_id, rows in grouped.items():
            rows.sort(key=lambda item: item.rank)
            documents.append(
                RetrievedSourceDocument(
                    document_id=document_id,
                    document_name=rows[0].document_name,
                    hit_count=len(rows),
                    top_rank=rows[0].rank,
                    chunk_indices=[item.chunk_index for item in rows],
                )
            )

        documents.sort(key=lambda item: item.top_rank)
        return documents
