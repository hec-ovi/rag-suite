from __future__ import annotations

from collections import defaultdict

from src.models.runtime.retrieval import HybridRetrieveInput, RetrievedSourceDocument
from src.reranked.runtime import RerankedRetrieveInput, RerankedRetrieveResult, RerankedSourceChunk
from src.services.hybrid_retrieval_service import HybridRetrievalService
from src.tools.inference_api_client import InferenceApiClient


class RerankedRetrievalService:
    """Hybrid retrieval followed by dedicated reranker ordering."""

    def __init__(self, hybrid_retrieval_service: HybridRetrievalService, inference_client: InferenceApiClient) -> None:
        self._hybrid_retrieval_service = hybrid_retrieval_service
        self._inference_client = inference_client

    def retrieve(self, request: RerankedRetrieveInput) -> RerankedRetrieveResult:
        """Retrieve hybrid candidates, then rerank and return final top-k sources."""

        candidate_count = max(request.top_k, request.rerank_candidate_count)
        hybrid_result = self._hybrid_retrieval_service.retrieve(
            HybridRetrieveInput(
                project_id=request.project_id,
                query=request.query,
                document_ids=request.document_ids,
                top_k=candidate_count,
                dense_top_k=request.dense_top_k,
                sparse_top_k=request.sparse_top_k,
                dense_weight=request.dense_weight,
                embedding_model=request.embedding_model,
            )
        )

        hybrid_candidates = hybrid_result.sources
        if not hybrid_candidates:
            return RerankedRetrieveResult(
                project_id=request.project_id,
                query=request.query,
                embedding_model=request.embedding_model,
                rerank_model=request.rerank_model,
                hybrid_candidates=[],
                sources=[],
                documents=[],
            )

        top_n = min(request.top_k, len(hybrid_candidates))
        rerank_rows = self._inference_client.rerank(
            model=request.rerank_model,
            query=request.query,
            documents=[candidate.text for candidate in hybrid_candidates],
            top_n=top_n,
        )

        final_sources: list[RerankedSourceChunk] = []
        consumed_indexes: set[int] = set()
        for candidate_index, rerank_score in rerank_rows:
            if candidate_index < 0 or candidate_index >= len(hybrid_candidates):
                continue
            if candidate_index in consumed_indexes:
                continue

            candidate = hybrid_candidates[candidate_index]
            consumed_indexes.add(candidate_index)
            final_sources.append(
                RerankedSourceChunk(
                    chunk_key=candidate.chunk_key,
                    document_id=candidate.document_id,
                    document_name=candidate.document_name,
                    chunk_index=candidate.chunk_index,
                    context_header=candidate.context_header,
                    text=candidate.text,
                    source_id="",
                    rank=0,
                    dense_score=candidate.dense_score,
                    sparse_score=candidate.sparse_score,
                    hybrid_score=candidate.hybrid_score,
                    original_rank=candidate.rank,
                    rerank_score=rerank_score,
                )
            )
            if len(final_sources) >= top_n:
                break

        if not final_sources:
            for candidate in hybrid_candidates[:top_n]:
                final_sources.append(
                    RerankedSourceChunk(
                        chunk_key=candidate.chunk_key,
                        document_id=candidate.document_id,
                        document_name=candidate.document_name,
                        chunk_index=candidate.chunk_index,
                        context_header=candidate.context_header,
                        text=candidate.text,
                        source_id="",
                        rank=0,
                        dense_score=candidate.dense_score,
                        sparse_score=candidate.sparse_score,
                        hybrid_score=candidate.hybrid_score,
                        original_rank=candidate.rank,
                        rerank_score=0.0,
                    )
                )

        for index, source in enumerate(final_sources, start=1):
            source.rank = index
            source.source_id = f"S{index}"

        documents = self._build_document_summaries(final_sources)
        return RerankedRetrieveResult(
            project_id=request.project_id,
            query=request.query,
            embedding_model=request.embedding_model,
            rerank_model=request.rerank_model,
            hybrid_candidates=hybrid_candidates,
            sources=final_sources,
            documents=documents,
        )

    def _build_document_summaries(
        self,
        ranked: list[RerankedSourceChunk],
    ) -> list[RetrievedSourceDocument]:
        """Aggregate ranked chunks into document-level summaries."""

        grouped: dict[str, list[RerankedSourceChunk]] = defaultdict(list)
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
