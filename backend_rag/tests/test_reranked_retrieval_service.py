from __future__ import annotations

from src.models.runtime.retrieval import HybridRetrieveResult, RankedSourceChunk, RetrievedSourceDocument
from src.reranked.retrieval_service import RerankedRetrievalService
from src.reranked.runtime import RerankedRetrieveInput


class _StubHybridRetrievalService:
    def retrieve(self, request):  # noqa: ANN001, ANN201
        assert request.top_k == 4
        return HybridRetrieveResult(
            project_id=request.project_id,
            query=request.query,
            embedding_model=request.embedding_model,
            sources=[
                RankedSourceChunk(
                    chunk_key="doc-1:0",
                    document_id="doc-1",
                    document_name="Doc One",
                    chunk_index=0,
                    context_header="h0",
                    text="chunk zero",
                    source_id="S1",
                    rank=1,
                    dense_score=0.91,
                    sparse_score=0.42,
                    hybrid_score=0.85,
                ),
                RankedSourceChunk(
                    chunk_key="doc-2:0",
                    document_id="doc-2",
                    document_name="Doc Two",
                    chunk_index=0,
                    context_header="h1",
                    text="chunk one",
                    source_id="S2",
                    rank=2,
                    dense_score=0.88,
                    sparse_score=0.55,
                    hybrid_score=0.83,
                ),
                RankedSourceChunk(
                    chunk_key="doc-3:0",
                    document_id="doc-3",
                    document_name="Doc Three",
                    chunk_index=0,
                    context_header="h2",
                    text="chunk two",
                    source_id="S3",
                    rank=3,
                    dense_score=0.77,
                    sparse_score=0.66,
                    hybrid_score=0.79,
                ),
                RankedSourceChunk(
                    chunk_key="doc-4:0",
                    document_id="doc-4",
                    document_name="Doc Four",
                    chunk_index=0,
                    context_header="h3",
                    text="chunk three",
                    source_id="S4",
                    rank=4,
                    dense_score=0.63,
                    sparse_score=0.61,
                    hybrid_score=0.68,
                ),
            ],
            documents=[
                RetrievedSourceDocument(
                    document_id="doc-1",
                    document_name="Doc One",
                    hit_count=1,
                    top_rank=1,
                    chunk_indices=[0],
                )
            ],
        )


class _StubInferenceClient:
    def rerank(self, *, model: str, query: str, documents: list[str], top_n: int | None):  # noqa: ARG002
        assert model == "bge-reranker-v2-m3:latest"
        assert query == "what changed"
        assert documents == ["chunk zero", "chunk one", "chunk two", "chunk three"]
        assert top_n == 2
        return [(2, 0.97), (0, 0.91)]


def test_reranked_retrieval_reorders_hybrid_candidates() -> None:
    service = RerankedRetrievalService(
        hybrid_retrieval_service=_StubHybridRetrievalService(),
        inference_client=_StubInferenceClient(),
    )

    result = service.retrieve(
        RerankedRetrieveInput(
            project_id="project-1",
            query="what changed",
            document_ids=None,
            top_k=2,
            dense_top_k=20,
            sparse_top_k=20,
            dense_weight=0.65,
            embedding_model="bge-m3:latest",
            rerank_model="bge-reranker-v2-m3:latest",
            rerank_candidate_count=4,
        )
    )

    assert len(result.hybrid_candidates) == 4
    assert len(result.sources) == 2
    assert result.sources[0].chunk_key == "doc-3:0"
    assert result.sources[0].source_id == "S1"
    assert result.sources[0].original_rank == 3
    assert result.sources[0].rerank_score == 0.97
    assert result.sources[1].chunk_key == "doc-1:0"
    assert result.sources[1].source_id == "S2"
    assert result.sources[1].original_rank == 1
