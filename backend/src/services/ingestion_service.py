from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.config import Settings
from src.core.exceptions import ResourceNotFoundError, ValidationDomainError
from src.models.api.pipeline import (
    AutomaticPipelinePreviewRequest,
    AutomaticPipelinePreviewResponse,
    ChunkProposal,
    ChunkTextRequest,
    ChunkTextResponse,
    ContextualizeChunksRequest,
    ContextualizeChunksResponse,
    ContextualizedChunk,
    IngestDocumentRequest,
    IngestedDocumentResponse,
    NormalizeTextRequest,
    NormalizeTextResponse,
)
from src.models.db.chunk import ChunkORM
from src.models.db.document import DocumentORM
from src.models.db.project import ProjectORM
from src.models.runtime.pipeline import ChunkCandidate, ContextualizedChunkCandidate
from src.tools.agentic_chunker import AgenticChunker
from src.tools.contextual_header_generator import ContextualHeaderGenerator
from src.tools.deterministic_chunker import DeterministicChunker
from src.tools.normalize_text import DeterministicTextNormalizer
from src.tools.ollama_embedding_client import OllamaEmbeddingClient
from src.tools.qdrant_indexer import QdrantIndexer


class IngestionService:
    """Service implementing the ingestion preparation workflows."""

    def __init__(
        self,
        session: Session,
        settings: Settings,
        normalizer: DeterministicTextNormalizer,
        deterministic_chunker: DeterministicChunker,
        agentic_chunker: AgenticChunker,
        contextual_header_generator: ContextualHeaderGenerator,
        embedding_client: OllamaEmbeddingClient,
        qdrant_indexer: QdrantIndexer,
    ) -> None:
        self._session = session
        self._settings = settings
        self._normalizer = normalizer
        self._deterministic_chunker = deterministic_chunker
        self._agentic_chunker = agentic_chunker
        self._contextual_header_generator = contextual_header_generator
        self._embedding_client = embedding_client
        self._qdrant_indexer = qdrant_indexer

    async def normalize_text(self, request: NormalizeTextRequest) -> NormalizeTextResponse:
        """Normalize text using deterministic cleanup rules."""

        result = self._normalizer.normalize(
            text=request.text,
            max_blank_lines=request.max_blank_lines,
            remove_repeated_short_lines=request.remove_repeated_short_lines,
        )

        return NormalizeTextResponse(
            normalized_text=result.normalized_text,
            removed_repeated_line_count=result.removed_repeated_line_count,
            collapsed_whitespace_count=result.collapsed_whitespace_count,
        )

    async def chunk_text(self, request: ChunkTextRequest) -> ChunkTextResponse:
        """Create chunk proposals using selected mode."""

        chunks = await self._chunk_runtime(
            text=request.text,
            mode=request.mode,
            max_chunk_chars=request.max_chunk_chars,
            min_chunk_chars=request.min_chunk_chars,
            overlap_chars=request.overlap_chars,
            llm_model=request.llm_model,
        )

        return ChunkTextResponse(
            mode=request.mode,
            chunks=[
                ChunkProposal(
                    chunk_index=chunk.chunk_index,
                    start_char=chunk.start_char,
                    end_char=chunk.end_char,
                    text=chunk.text,
                    rationale=chunk.rationale,
                )
                for chunk in chunks
            ],
        )

    async def contextualize_chunks(self, request: ContextualizeChunksRequest) -> ContextualizeChunksResponse:
        """Contextualize chunk proposals with headers."""

        runtime_chunks = [
            ChunkCandidate(
                chunk_index=chunk.chunk_index,
                start_char=chunk.start_char,
                end_char=chunk.end_char,
                text=chunk.text,
                rationale=chunk.rationale,
            )
            for chunk in request.chunks
        ]

        model_name = request.llm_model or self._settings.ollama_chat_model
        contextualized = await self._contextual_header_generator.contextualize(
            document_name=request.document_name,
            full_document_text=request.full_document_text,
            chunks=runtime_chunks,
            mode=request.mode,
            model=model_name,
        )

        return ContextualizeChunksResponse(
            mode=request.mode,
            chunks=[
                ContextualizedChunk(
                    chunk_index=item.chunk_index,
                    start_char=item.start_char,
                    end_char=item.end_char,
                    rationale=item.rationale,
                    chunk_text=item.chunk_text,
                    context_header=item.context_header,
                    contextualized_text=item.contextualized_text,
                )
                for item in contextualized
            ],
        )

    async def preview_automatic_pipeline(
        self,
        request: AutomaticPipelinePreviewRequest,
    ) -> AutomaticPipelinePreviewResponse:
        """Run normalize/chunk/contextualize without persistence or embeddings."""

        normalized_text = request.raw_text
        if request.automation.normalize_text:
            normalized = self._normalizer.normalize(
                text=request.raw_text,
                max_blank_lines=1,
                remove_repeated_short_lines=True,
            )
            normalized_text = normalized.normalized_text

        if request.automation.agentic_chunking:
            chunk_mode = "agentic"
        else:
            chunk_mode = request.chunk_options.mode

        runtime_chunks = await self._chunk_runtime(
            text=normalized_text,
            mode=chunk_mode,
            max_chunk_chars=request.chunk_options.max_chunk_chars,
            min_chunk_chars=request.chunk_options.min_chunk_chars,
            overlap_chars=request.chunk_options.overlap_chars,
            llm_model=request.llm_model,
        )

        contextualized_chunks = await self._contextual_header_generator.contextualize(
            document_name=request.document_name,
            full_document_text=normalized_text,
            chunks=runtime_chunks,
            mode=request.contextualization_mode if request.automation.contextual_headers else "template",
            model=request.llm_model or self._settings.ollama_chat_model,
        )

        return AutomaticPipelinePreviewResponse(
            normalized_text=normalized_text,
            chunking_mode=chunk_mode,
            contextualization_mode=(
                request.contextualization_mode if request.automation.contextual_headers else "disabled"
            ),
            chunks=[
                ChunkProposal(
                    chunk_index=item.chunk_index,
                    start_char=item.start_char,
                    end_char=item.end_char,
                    text=item.text,
                    rationale=item.rationale,
                )
                for item in runtime_chunks
            ],
            contextualized_chunks=[
                ContextualizedChunk(
                    chunk_index=item.chunk_index,
                    start_char=item.start_char,
                    end_char=item.end_char,
                    rationale=item.rationale,
                    chunk_text=item.chunk_text,
                    context_header=item.context_header,
                    contextualized_text=item.contextualized_text,
                )
                for item in contextualized_chunks
            ],
        )

    async def ingest_document(self, project_id: str, request: IngestDocumentRequest) -> IngestedDocumentResponse:
        """Persist document and index contextualized chunk vectors."""

        project = self._session.scalar(select(ProjectORM).where(ProjectORM.id == project_id))
        if project is None:
            raise ResourceNotFoundError(f"Project '{project_id}' was not found")

        if request.workflow_mode == "automatic":
            normalized_text = self._build_automatic_normalized_text(request=request)
            if request.automation.agentic_chunking:
                chunk_mode = "agentic"
            else:
                chunk_mode = request.chunk_options.mode
            runtime_chunks = await self._chunk_runtime(
                text=normalized_text,
                mode=chunk_mode,
                max_chunk_chars=request.chunk_options.max_chunk_chars,
                min_chunk_chars=request.chunk_options.min_chunk_chars,
                overlap_chars=request.chunk_options.overlap_chars,
                llm_model=request.llm_model,
            )
            contextualized_chunks = await self._automatic_contextualization(
                request=request,
                normalized_text=normalized_text,
                runtime_chunks=runtime_chunks,
            )
            chunking_mode = chunk_mode
            if request.automation.contextual_headers:
                contextualization_mode = request.contextualization_mode
            else:
                contextualization_mode = "disabled"
        else:
            if request.normalized_text is None:
                raise ValidationDomainError("normalized_text is required when workflow_mode is 'manual'")
            if not request.approved_chunks:
                raise ValidationDomainError("approved_chunks is required when workflow_mode is 'manual'")

            normalized_text = request.normalized_text
            contextualized_chunks = [
                ContextualizedChunkCandidate(
                    chunk_index=chunk.chunk_index,
                    start_char=chunk.start_char,
                    end_char=chunk.end_char,
                    rationale=chunk.rationale,
                    chunk_text=chunk.normalized_chunk,
                    context_header=chunk.context_header or "",
                    contextualized_text=chunk.contextualized_chunk,
                )
                for chunk in request.approved_chunks
            ]
            chunking_mode = "manual"
            contextualization_mode = "manual"

        if not contextualized_chunks:
            raise ValidationDomainError("No chunks available for embedding")

        embedding_model = request.embedding_model or self._settings.ollama_embedding_model
        vectors = await self._embedding_client.embed_texts(
            model=embedding_model,
            texts=[chunk.contextualized_text for chunk in contextualized_chunks],
        )

        vector_size = len(vectors[0])
        await self._qdrant_indexer.ensure_collection(project.qdrant_collection_name, vector_size)

        document = DocumentORM(
            project_id=project.id,
            name=request.document_name,
            source_type=request.source_type,
            raw_text=request.raw_text,
            normalized_text=normalized_text,
            workflow_mode=request.workflow_mode,
            chunking_mode=chunking_mode,
            contextualization_mode=contextualization_mode,
            normalization_version=self._settings.normalization_version,
            chunking_version=self._settings.chunking_version,
            contextualization_version=self._settings.contextualization_version,
            embedding_model=embedding_model,
        )

        self._session.add(document)
        self._session.flush()

        point_ids = [str(uuid.uuid4()) for _ in contextualized_chunks]
        payloads: list[dict[str, object]] = []
        chunk_rows: list[ChunkORM] = []

        for point_id, chunk in zip(point_ids, contextualized_chunks, strict=True):
            payload = {
                "project_id": project.id,
                "document_id": document.id,
                "document_name": document.name,
                "chunk_id": f"{document.id}:{chunk.chunk_index}",
                "chunk_index": chunk.chunk_index,
                "start_char": chunk.start_char,
                "end_char": chunk.end_char,
                "source_type": request.source_type,
            }
            payloads.append(payload)

            chunk_rows.append(
                ChunkORM(
                    document_id=document.id,
                    chunk_index=chunk.chunk_index,
                    start_char=chunk.start_char,
                    end_char=chunk.end_char,
                    rationale=chunk.rationale,
                    raw_chunk=self._extract_raw_chunk_snapshot(
                        raw_text=request.raw_text,
                        normalized_text=normalized_text,
                        chunk_start=chunk.start_char,
                        chunk_end=chunk.end_char,
                        fallback_chunk=chunk.chunk_text,
                    ),
                    normalized_chunk=chunk.chunk_text,
                    context_header=chunk.context_header,
                    contextualized_chunk=chunk.contextualized_text,
                    approved=True,
                    qdrant_point_id=point_id,
                    payload=payload,
                )
            )

        await self._qdrant_indexer.upsert_chunks(
            collection_name=project.qdrant_collection_name,
            vectors=vectors,
            payloads=payloads,
            point_ids=point_ids,
        )

        self._session.add_all(chunk_rows)
        self._session.commit()
        self._session.refresh(document)

        return IngestedDocumentResponse(
            project_id=project.id,
            document_id=document.id,
            qdrant_collection_name=project.qdrant_collection_name,
            embedded_chunk_count=len(chunk_rows),
            embedding_model=embedding_model,
            chunking_mode=chunking_mode,
            contextualization_mode=contextualization_mode,
            created_at=document.created_at,
        )

    def _build_automatic_normalized_text(self, request: IngestDocumentRequest) -> str:
        """Build normalized text for automatic mode."""

        if request.automation.normalize_text:
            result = self._normalizer.normalize(
                text=request.raw_text,
                max_blank_lines=1,
                remove_repeated_short_lines=True,
            )
            return result.normalized_text
        return request.raw_text

    async def _chunk_runtime(
        self,
        text: str,
        mode: str,
        max_chunk_chars: int,
        min_chunk_chars: int,
        overlap_chars: int,
        llm_model: str | None,
    ) -> list[ChunkCandidate]:
        """Execute deterministic or agentic chunk selection."""

        if mode == "deterministic":
            return self._deterministic_chunker.chunk(
                text=text,
                max_chunk_chars=max_chunk_chars,
                min_chunk_chars=min_chunk_chars,
                overlap_chars=overlap_chars,
            )

        model_name = llm_model or self._settings.ollama_chat_model
        return await self._agentic_chunker.chunk(
            text=text,
            model=model_name,
            max_chunk_chars=max_chunk_chars,
            min_chunk_chars=min_chunk_chars,
        )

    async def _automatic_contextualization(
        self,
        request: IngestDocumentRequest,
        normalized_text: str,
        runtime_chunks: list[ChunkCandidate],
    ) -> list[ContextualizedChunkCandidate]:
        """Contextualize chunks for automatic mode when enabled."""

        if request.automation.contextual_headers:
            mode = request.contextualization_mode
            model_name = request.llm_model or self._settings.ollama_chat_model
            return await self._contextual_header_generator.contextualize(
                document_name=request.document_name,
                full_document_text=normalized_text,
                chunks=runtime_chunks,
                mode=mode,
                model=model_name,
            )

        return [
            ContextualizedChunkCandidate(
                chunk_index=chunk.chunk_index,
                start_char=chunk.start_char,
                end_char=chunk.end_char,
                rationale=chunk.rationale,
                chunk_text=chunk.text,
                context_header="",
                contextualized_text=chunk.text,
            )
            for chunk in runtime_chunks
        ]

    def _extract_raw_chunk_snapshot(
        self,
        raw_text: str,
        normalized_text: str,
        chunk_start: int,
        chunk_end: int,
        fallback_chunk: str,
    ) -> str:
        """Best-effort raw chunk snapshot for lineage view."""

        if chunk_start < 0 or chunk_end <= chunk_start:
            return fallback_chunk

        if chunk_end <= len(raw_text):
            raw_slice = raw_text[chunk_start:chunk_end]
            if raw_slice.strip():
                return raw_slice

        if raw_text == normalized_text and chunk_start < len(raw_text):
            return raw_text[chunk_start : min(chunk_end, len(raw_text))]

        return fallback_chunk
