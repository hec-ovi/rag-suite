from __future__ import annotations

from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

from src.core.exceptions import ExternalServiceError


class QdrantSearcher:
    """Qdrant dense search adapter."""

    def __init__(self, url: str, api_key: str | None, timeout_seconds: float) -> None:
        self._client = QdrantClient(url=url, api_key=api_key, timeout=timeout_seconds)

    def close(self) -> None:
        """Release Qdrant client resources."""

        self._client.close()

    def search_chunks(
        self,
        collection_name: str,
        query_vector: list[float],
        limit: int,
        document_ids: list[str] | None,
    ) -> list[qdrant_models.ScoredPoint]:
        """Search vector neighbors with optional document filter."""

        try:
            exists = self._client.collection_exists(collection_name=collection_name)
            if not exists:
                return []

            query_filter: qdrant_models.Filter | None = None
            if document_ids:
                query_filter = qdrant_models.Filter(
                    must=[
                        qdrant_models.FieldCondition(
                            key="document_id",
                            match=qdrant_models.MatchAny(any=document_ids),
                        )
                    ]
                )

            response = self._client.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=limit,
                query_filter=query_filter,
                with_payload=True,
                with_vectors=False,
            )
        except Exception as error:  # noqa: BLE001
            raise ExternalServiceError(
                f"Qdrant search failed for collection '{collection_name}': {error}"
            ) from error

        points = getattr(response, "points", None)
        if isinstance(points, list):
            return points
        if isinstance(response, list):
            return response
        return []
