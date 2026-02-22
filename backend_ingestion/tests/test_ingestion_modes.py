from __future__ import annotations

from pathlib import Path

import pytest

from src.core.config import Settings
from src.core.database import build_engine, build_session_factory, initialize_database
from src.core.exceptions import ValidationDomainError
from src.models.api.pipeline import (
    ApprovedChunkInput,
    ChunkingOptions,
    IngestDocumentRequest,
    PipelineAutomationFlags,
)
from src.models.db.document import DocumentORM
from src.models.db.project import ProjectORM
from src.models.runtime.pipeline import ChunkCandidate, ContextualizedChunkCandidate
from src.services.ingestion_service import IngestionService
from src.tools.deterministic_chunker import DeterministicChunker
from src.tools.normalize_text import DeterministicTextNormalizer


class _UnusedAgenticChunker:
    async def chunk(self, **_: object):  # noqa: ANN003
        raise AssertionError("Agentic chunker should not be called in these tests")


class _UnusedContextualHeaderGenerator:
    async def contextualize(self, **_: object):  # noqa: ANN003
        raise AssertionError("Contextual header generation should not be called in this test path")


class _StubAgenticChunker:
    async def chunk(  # noqa: ARG002
        self,
        text: str,
        model: str,
        max_chunk_chars: int,
        min_chunk_chars: int,
        cancel_event: object | None = None,
    ) -> list[ChunkCandidate]:
        return [
            ChunkCandidate(
                chunk_index=0,
                start_char=0,
                end_char=len(text),
                text=text,
                rationale="Agentic chunk proposal",
            )
        ]


class _StubContextualHeaderGenerator:
    async def contextualize(  # noqa: ARG002
        self,
        document_name: str,
        full_document_text: str,
        chunks: list[ChunkCandidate],
        mode: str,
        model: str,
        cancel_event: object | None = None,
    ) -> list[ContextualizedChunkCandidate]:
        return [
            ContextualizedChunkCandidate(
                chunk_index=chunk.chunk_index,
                start_char=chunk.start_char,
                end_char=chunk.end_char,
                rationale=chunk.rationale,
                chunk_text=chunk.text,
                context_header=f"Context for {document_name}",
                contextualized_text=f"Context for {document_name}\n\n{chunk.text}",
            )
            for chunk in chunks
        ]


class _StubEmbeddingClient:
    async def embed_texts(self, model: str, texts: list[str], cancel_event: object | None = None):  # noqa: ARG002
        return [[0.11, 0.22, 0.33] for _ in texts]


class _StubQdrantIndexer:
    async def ensure_collection(self, collection_name: str, vector_size: int):  # noqa: ARG002
        return None

    async def upsert_chunks(
        self,
        collection_name: str,  # noqa: ARG002
        vectors: list[list[float]],  # noqa: ARG002
        payloads: list[dict[str, object]],  # noqa: ARG002
        point_ids: list[str],  # noqa: ARG002
    ) -> None:
        return None


def _build_service(tmp_db_path: Path) -> IngestionService:
    engine = build_engine(f"sqlite:///{tmp_db_path}")
    initialize_database(engine)
    session_factory = build_session_factory(engine)
    session = session_factory()

    settings = Settings(
        database_url=f"sqlite:///{tmp_db_path}",
        qdrant_collection_prefix="test_project",
    )

    return IngestionService(
        session=session,
        settings=settings,
        normalizer=DeterministicTextNormalizer(),
        deterministic_chunker=DeterministicChunker(),
        agentic_chunker=_UnusedAgenticChunker(),
        contextual_header_generator=_UnusedContextualHeaderGenerator(),
        embedding_client=_StubEmbeddingClient(),
        qdrant_indexer=_StubQdrantIndexer(),
    )


def _build_service_with_agentic_context(tmp_db_path: Path) -> IngestionService:
    engine = build_engine(f"sqlite:///{tmp_db_path}")
    initialize_database(engine)
    session_factory = build_session_factory(engine)
    session = session_factory()

    settings = Settings(
        database_url=f"sqlite:///{tmp_db_path}",
        qdrant_collection_prefix="test_project",
    )

    return IngestionService(
        session=session,
        settings=settings,
        normalizer=DeterministicTextNormalizer(),
        deterministic_chunker=DeterministicChunker(),
        agentic_chunker=_StubAgenticChunker(),
        contextual_header_generator=_StubContextualHeaderGenerator(),
        embedding_client=_StubEmbeddingClient(),
        qdrant_indexer=_StubQdrantIndexer(),
    )


def _create_project(service: IngestionService, name: str) -> ProjectORM:
    project = ProjectORM(name=name, description=None, qdrant_collection_name=f"test_project_{name}")
    service._session.add(project)  # noqa: SLF001
    service._session.commit()  # noqa: SLF001
    service._session.refresh(project)  # noqa: SLF001
    return project


async def test_ingest_document_automatic_mode_persists_chunks(tmp_path: Path) -> None:
    service = _build_service(tmp_path / "automatic.db")
    project = _create_project(service, "automatic")

    request = IngestDocumentRequest(
        document_name="Auto Doc",
        source_type="text",
        raw_text=(
            "Section 1: Scope.\n\n"
            "This agreement defines responsibilities.\n\n"
            "Section 2: Terms.\n\n"
            "These terms apply to all parties."
        ),
        workflow_mode="automatic",
        automation=PipelineAutomationFlags(
            normalize_text=True,
            agentic_chunking=False,
            contextual_headers=False,
        ),
        chunk_options=ChunkingOptions(
            mode="deterministic",
            max_chunk_chars=550,
            min_chunk_chars=100,
            overlap_chars=40,
        ),
        contextualization_mode="template",
        embedding_model="bge-m3:latest",
    )

    response = await service.ingest_document(project.id, request)

    assert response.project_id == project.id
    assert response.embedded_chunk_count >= 1

    document = service._session.get(DocumentORM, response.document_id)  # noqa: SLF001
    assert document is not None
    assert document.workflow_mode == "automatic"
    assert document.chunking_mode == "deterministic"
    assert document.contextualization_mode == "disabled"


async def test_ingest_document_manual_hitl_mode_persists_approved_chunks(tmp_path: Path) -> None:
    service = _build_service(tmp_path / "manual.db")
    project = _create_project(service, "manual")

    request = IngestDocumentRequest(
        document_name="Manual Doc",
        source_type="text",
        raw_text="Raw sample text for manual review.",
        workflow_mode="manual",
        automation=PipelineAutomationFlags(
            normalize_text=True,
            agentic_chunking=True,
            contextual_headers=True,
        ),
        chunk_options=ChunkingOptions(
            mode="agentic",
            max_chunk_chars=550,
            min_chunk_chars=100,
            overlap_chars=40,
        ),
        contextualization_mode="template",
        normalized_text="Manual sample text for review.",
        approved_chunks=[
            ApprovedChunkInput(
                chunk_index=0,
                start_char=0,
                end_char=29,
                rationale="Approved by reviewer",
                normalized_chunk="Manual sample text for review.",
                context_header="Document summary context.",
                contextualized_chunk="Document summary context.\n\nManual sample text for review.",
            )
        ],
        embedding_model="bge-m3:latest",
    )

    response = await service.ingest_document(project.id, request)

    assert response.project_id == project.id
    assert response.embedded_chunk_count == 1

    document = service._session.get(DocumentORM, response.document_id)  # noqa: SLF001
    assert document is not None
    assert document.workflow_mode == "manual"
    assert document.chunking_mode == "agentic"
    assert document.contextualization_mode == "template"


async def test_ingest_document_manual_mode_requires_approved_chunks(tmp_path: Path) -> None:
    service = _build_service(tmp_path / "manual-error.db")
    project = _create_project(service, "manual_error")

    request = IngestDocumentRequest(
        document_name="Invalid Manual Doc",
        source_type="text",
        raw_text="Raw text.",
        workflow_mode="manual",
        automation=PipelineAutomationFlags(
            normalize_text=True,
            agentic_chunking=False,
            contextual_headers=False,
        ),
        chunk_options=ChunkingOptions(
            mode="deterministic",
            max_chunk_chars=550,
            min_chunk_chars=100,
            overlap_chars=40,
        ),
        contextualization_mode="template",
        normalized_text="Normalized text.",
        approved_chunks=None,
    )

    with pytest.raises(ValidationDomainError, match="approved_chunks is required"):
        await service.ingest_document(project.id, request)


async def test_ingest_document_manual_mode_requires_normalized_text(tmp_path: Path) -> None:
    service = _build_service(tmp_path / "manual-normalized-error.db")
    project = _create_project(service, "manual_normalized_error")

    request = IngestDocumentRequest(
        document_name="Invalid Manual Doc",
        source_type="text",
        raw_text="Raw text.",
        workflow_mode="manual",
        automation=PipelineAutomationFlags(
            normalize_text=True,
            agentic_chunking=False,
            contextual_headers=False,
        ),
        chunk_options=ChunkingOptions(
            mode="deterministic",
            max_chunk_chars=550,
            min_chunk_chars=100,
            overlap_chars=40,
        ),
        contextualization_mode="template",
        normalized_text=None,
        approved_chunks=[
            ApprovedChunkInput(
                chunk_index=0,
                start_char=0,
                end_char=8,
                rationale="approved",
                normalized_chunk="Raw text.",
                context_header=None,
                contextualized_chunk="Raw text.",
            )
        ],
    )

    with pytest.raises(ValidationDomainError, match="normalized_text is required"):
        await service.ingest_document(project.id, request)


async def test_ingest_document_automatic_agentic_with_context_headers(tmp_path: Path) -> None:
    service = _build_service_with_agentic_context(tmp_path / "automatic-agentic.db")
    project = _create_project(service, "automatic_agentic")

    request = IngestDocumentRequest(
        document_name="Auto Agentic Doc",
        source_type="text",
        raw_text="Section 1: Intro.\n\nSection 2: Details.",
        workflow_mode="automatic",
        automation=PipelineAutomationFlags(
            normalize_text=False,
            agentic_chunking=True,
            contextual_headers=True,
        ),
        chunk_options=ChunkingOptions(
            mode="deterministic",
            max_chunk_chars=550,
            min_chunk_chars=100,
            overlap_chars=40,
        ),
        contextualization_mode="llm",
        embedding_model="bge-m3:latest",
    )

    response = await service.ingest_document(project.id, request)

    assert response.project_id == project.id
    assert response.embedded_chunk_count == 1
    assert response.chunking_mode == "agentic"
    assert response.contextualization_mode == "llm"

    document = service._session.get(DocumentORM, response.document_id)  # noqa: SLF001
    assert document is not None
    assert document.chunking_mode == "agentic"
    assert document.contextualization_mode == "llm"
