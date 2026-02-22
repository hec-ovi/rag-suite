from __future__ import annotations

from datetime import datetime, timezone

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qdrant_models

from src.core.exceptions import ExternalServiceError


class QdrantIndexer:
    """Encapsulates Qdrant collection management and point upserts."""

    def __init__(self, url: str, api_key: str | None, timeout_seconds: float) -> None:
        self._client = AsyncQdrantClient(url=url, api_key=api_key, timeout=timeout_seconds)

    async def ensure_collection(self, collection_name: str, vector_size: int) -> None:
        """Create collection if missing using cosine distance."""

        try:
            exists = await self._client.collection_exists(collection_name=collection_name)
            if exists:
                return

            await self._client.create_collection(
                collection_name=collection_name,
                vectors_config=qdrant_models.VectorParams(size=vector_size, distance=qdrant_models.Distance.COSINE),
            )
        except Exception as error:  # noqa: BLE001
            raise ExternalServiceError(f"Failed to ensure Qdrant collection '{collection_name}': {error}") from error

    async def upsert_chunks(
        self,
        collection_name: str,
        vectors: list[list[float]],
        payloads: list[dict[str, object]],
        point_ids: list[str],
    ) -> None:
        """Upsert chunk vectors and payload metadata."""

        now = datetime.now(timezone.utc).isoformat()
        points = [
            qdrant_models.PointStruct(
                id=point_id,
                vector=vector,
                payload={**payload, "indexed_at": now},
            )
            for point_id, vector, payload in zip(point_ids, vectors, payloads, strict=True)
        ]

        try:
            await self._client.upsert(collection_name=collection_name, points=points, wait=True)
        except Exception as error:  # noqa: BLE001
            raise ExternalServiceError(f"Failed to upsert vectors into Qdrant: {error}") from error

    async def delete_collection(self, collection_name: str) -> None:
        """Delete an existing collection if present."""

        try:
            exists = await self._client.collection_exists(collection_name=collection_name)
            if not exists:
                return

            await self._client.delete_collection(collection_name=collection_name)
        except Exception as error:  # noqa: BLE001
            raise ExternalServiceError(f"Failed to delete Qdrant collection '{collection_name}': {error}") from error

    async def search_chunks(
        self,
        collection_name: str,
        query_vector: list[float],
        limit: int,
    ) -> list[qdrant_models.ScoredPoint]:
        """Search vector neighbors with payloads for retrieval."""

        try:
            exists = await self._client.collection_exists(collection_name=collection_name)
            if not exists:
                return []

            response = await self._client.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=limit,
                with_payload=True,
                with_vectors=False,
            )
            points = getattr(response, "points", None)
            if isinstance(points, list):
                return points
            if isinstance(response, list):
                return response
            return []
        except Exception as error:  # noqa: BLE001
            raise ExternalServiceError(f"Failed to search Qdrant collection '{collection_name}': {error}") from error
