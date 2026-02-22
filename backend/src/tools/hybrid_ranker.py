from __future__ import annotations

import math
import re
from collections import Counter

from src.models.runtime.retrieval import RankedChunkCandidate, RetrievalChunkCandidate


class HybridRanker:
    """Combines dense vector scores with sparse BM25 lexical scores."""

    _token_pattern = re.compile(r"[a-z0-9]+")

    def score_sparse(
        self,
        query: str,
        candidates: list[RetrievalChunkCandidate],
        top_k: int,
    ) -> dict[str, float]:
        """Score candidates using a compact BM25 implementation."""

        if not candidates:
            return {}

        query_terms = self._tokenize(query)
        if not query_terms:
            return {}

        tokenized_docs = [self._tokenize(candidate.text) for candidate in candidates]
        doc_lengths = [len(tokens) for tokens in tokenized_docs]
        avg_doc_length = (sum(doc_lengths) / len(doc_lengths)) if doc_lengths else 1.0
        avg_doc_length = max(avg_doc_length, 1.0)

        document_frequency: Counter[str] = Counter()
        for tokens in tokenized_docs:
            document_frequency.update(set(tokens))

        query_counter = Counter(query_terms)
        k1 = 1.5
        b = 0.75
        total_docs = len(candidates)

        scored: list[tuple[str, float]] = []
        for candidate, tokens, doc_length in zip(candidates, tokenized_docs, doc_lengths, strict=True):
            term_frequency = Counter(tokens)
            score = 0.0
            for term, query_weight in query_counter.items():
                frequency = term_frequency.get(term, 0)
                if frequency == 0:
                    continue

                docs_with_term = document_frequency.get(term, 0)
                idf = math.log(1.0 + ((total_docs - docs_with_term + 0.5) / (docs_with_term + 0.5)))
                norm = frequency + k1 * (1.0 - b + b * (doc_length / avg_doc_length))
                score += query_weight * idf * ((frequency * (k1 + 1.0)) / max(norm, 1e-9))

            if score > 0:
                scored.append((candidate.chunk_key, score))

        scored.sort(key=lambda item: item[1], reverse=True)
        return dict(scored[:top_k])

    def fuse(
        self,
        candidates: list[RetrievalChunkCandidate],
        dense_scores: dict[str, float],
        sparse_scores: dict[str, float],
        top_k: int,
        dense_weight: float,
    ) -> list[RankedChunkCandidate]:
        """Fuse normalized dense+sparse scores into a final ranked list."""

        if not candidates:
            return []

        candidate_map = {candidate.chunk_key: candidate for candidate in candidates}
        dense_positive = {key: max(0.0, value) for key, value in dense_scores.items() if key in candidate_map}
        sparse_positive = {key: max(0.0, value) for key, value in sparse_scores.items() if key in candidate_map}

        max_dense = max(dense_positive.values(), default=0.0)
        max_sparse = max(sparse_positive.values(), default=0.0)
        sparse_weight = 1.0 - dense_weight

        keys = set(dense_positive.keys()) | set(sparse_positive.keys())
        ranked: list[RankedChunkCandidate] = []
        for key in keys:
            dense_raw = dense_positive.get(key, 0.0)
            sparse_raw = sparse_positive.get(key, 0.0)

            dense_norm = dense_raw / max_dense if max_dense > 0 else 0.0
            sparse_norm = sparse_raw / max_sparse if max_sparse > 0 else 0.0
            hybrid_score = dense_weight * dense_norm + sparse_weight * sparse_norm

            candidate = candidate_map[key]
            ranked.append(
                RankedChunkCandidate(
                    chunk_key=candidate.chunk_key,
                    document_id=candidate.document_id,
                    document_name=candidate.document_name,
                    chunk_index=candidate.chunk_index,
                    context_header=candidate.context_header,
                    text=candidate.text,
                    dense_score=dense_raw,
                    sparse_score=sparse_raw,
                    hybrid_score=hybrid_score,
                )
            )

        ranked.sort(
            key=lambda item: (item.hybrid_score, item.dense_score, item.sparse_score),
            reverse=True,
        )
        return ranked[:top_k]

    def _tokenize(self, text: str) -> list[str]:
        """Lowercase alphanumeric tokenization for sparse scoring."""

        return self._token_pattern.findall(text.lower())
