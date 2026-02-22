from __future__ import annotations

from src.models.runtime.retrieval import RetrievalChunkCandidate
from src.tools.hybrid_ranker import HybridRanker


def _candidate(chunk_key: str, text: str) -> RetrievalChunkCandidate:
    document_id, chunk_index = chunk_key.split(":")
    return RetrievalChunkCandidate(
        chunk_key=chunk_key,
        document_id=document_id,
        document_name=document_id,
        chunk_index=int(chunk_index),
        context_header="",
        text=text,
    )


def test_sparse_bm25_prefers_exact_lexical_matches() -> None:
    ranker = HybridRanker()
    candidates = [
        _candidate("doc-a:0", "mitochondria produce ATP for cellular respiration in human cells"),
        _candidate("doc-b:0", "temperature forecasts and rainfall for monday"),
        _candidate("doc-c:0", "ATP synthesis depends on mitochondria membranes"),
    ]

    sparse = ranker.score_sparse(query="mitochondria ATP", candidates=candidates, top_k=3)

    assert sparse["doc-a:0"] > 0
    assert sparse["doc-c:0"] > 0
    assert "doc-b:0" not in sparse


def test_hybrid_fusion_combines_dense_and_sparse_scores() -> None:
    ranker = HybridRanker()
    candidates = [
        _candidate("doc-a:0", "mitochondria produce ATP for cellular respiration"),
        _candidate("doc-b:0", "weather report with no biology terms"),
        _candidate("doc-c:0", "ATP and mitochondria overview"),
    ]

    sparse_scores = ranker.score_sparse(query="mitochondria ATP", candidates=candidates, top_k=3)
    dense_scores = {
        "doc-a:0": 0.35,
        "doc-b:0": 0.95,
        "doc-c:0": 0.40,
    }

    ranked = ranker.fuse(
        candidates=candidates,
        dense_scores=dense_scores,
        sparse_scores=sparse_scores,
        top_k=3,
        dense_weight=0.45,
    )

    assert ranked[0].chunk_key == "doc-c:0"
    assert ranked[-1].chunk_key == "doc-b:0"
