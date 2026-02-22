from __future__ import annotations

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from src.core.exceptions import ResourceNotFoundError, ValidationDomainError
from src.models.api.project import (
    ChunkSummaryResponse,
    CreateProjectRequest,
    DeleteProjectResponse,
    DocumentSummaryResponse,
    ProjectResponse,
)
from src.models.db.chunk import ChunkORM
from src.models.db.document import DocumentORM
from src.models.db.project import ProjectORM
from src.tools.qdrant_indexer import QdrantIndexer


class ProjectService:
    """Service for project namespace management and inspection."""

    def __init__(
        self,
        session: Session,
        collection_prefix: str,
        qdrant_indexer: QdrantIndexer | None = None,
    ) -> None:
        self._session = session
        self._collection_prefix = collection_prefix
        self._qdrant_indexer = qdrant_indexer

    async def create_project(self, request: CreateProjectRequest) -> ProjectResponse:
        """Create a project and reserve its Qdrant collection name."""

        existing_project = self._session.scalar(select(ProjectORM).where(ProjectORM.name == request.name))
        if existing_project is not None:
            raise ValidationDomainError(f"Project '{request.name}' already exists")

        collection_name = f"{self._collection_prefix}_{request.name.lower().replace(' ', '_')}"
        project = ProjectORM(
            name=request.name,
            description=request.description,
            qdrant_collection_name=collection_name,
        )

        self._session.add(project)
        self._session.commit()
        self._session.refresh(project)

        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            qdrant_collection_name=project.qdrant_collection_name,
            created_at=project.created_at,
        )

    async def list_projects(self) -> list[ProjectResponse]:
        """List all projects."""

        projects = self._session.scalars(select(ProjectORM).order_by(ProjectORM.created_at.desc()))
        return [
            ProjectResponse(
                id=project.id,
                name=project.name,
                description=project.description,
                qdrant_collection_name=project.qdrant_collection_name,
                created_at=project.created_at,
            )
            for project in projects
        ]

    async def list_project_documents(self, project_id: str) -> list[DocumentSummaryResponse]:
        """List documents belonging to a project."""

        project = self._session.get(ProjectORM, project_id)
        if project is None:
            raise ResourceNotFoundError(f"Project '{project_id}' was not found")

        statement = (
            select(
                DocumentORM,
                func.count(ChunkORM.id),
                func.sum(
                    case(
                        (
                            ChunkORM.context_header.is_not(None)
                            & (func.length(func.trim(ChunkORM.context_header)) > 0),
                            1,
                        ),
                        else_=0,
                    )
                ),
            )
            .outerjoin(ChunkORM, ChunkORM.document_id == DocumentORM.id)
            .where(DocumentORM.project_id == project_id)
            .group_by(DocumentORM.id)
            .order_by(DocumentORM.created_at.desc())
        )

        rows = self._session.execute(statement)
        documents: list[DocumentSummaryResponse] = []
        for document, chunk_count, contextualized_chunk_count in rows:
            documents.append(
                DocumentSummaryResponse(
                    id=document.id,
                    name=document.name,
                    source_type=document.source_type,
                    chunk_count=int(chunk_count),
                    workflow_mode=document.workflow_mode,
                    chunking_mode=document.chunking_mode,
                    contextualization_mode=document.contextualization_mode,
                    used_normalization=document.normalized_text != document.raw_text,
                    used_agentic_chunking=document.chunking_mode == "agentic",
                    has_contextual_headers=int(contextualized_chunk_count or 0) > 0,
                    created_at=document.created_at,
                )
            )

        return documents

    async def list_document_chunks(self, document_id: str) -> list[ChunkSummaryResponse]:
        """List chunks for a document."""

        document = self._session.get(DocumentORM, document_id)
        if document is None:
            raise ResourceNotFoundError(f"Document '{document_id}' was not found")

        chunks = self._session.scalars(
            select(ChunkORM).where(ChunkORM.document_id == document_id).order_by(ChunkORM.chunk_index.asc())
        )

        return [
            ChunkSummaryResponse(
                id=chunk.id,
                chunk_index=chunk.chunk_index,
                start_char=chunk.start_char,
                end_char=chunk.end_char,
                rationale=chunk.rationale,
                context_header=chunk.context_header,
                raw_chunk=chunk.raw_chunk,
                normalized_chunk=chunk.normalized_chunk,
                contextualized_chunk=chunk.contextualized_chunk,
                created_at=chunk.created_at,
            )
            for chunk in chunks
        ]

    async def delete_project(self, project_id: str) -> DeleteProjectResponse:
        """Delete a project, dependent records, and its Qdrant collection."""

        project = self._session.get(ProjectORM, project_id)
        if project is None:
            raise ResourceNotFoundError(f"Project '{project_id}' was not found")

        deleted_document_count = int(
            self._session.scalar(select(func.count(DocumentORM.id)).where(DocumentORM.project_id == project_id)) or 0
        )

        deleted_chunk_count = int(
            self._session.scalar(
                select(func.count(ChunkORM.id))
                .select_from(ChunkORM)
                .join(DocumentORM, ChunkORM.document_id == DocumentORM.id)
                .where(DocumentORM.project_id == project_id)
            )
            or 0
        )

        collection_name = project.qdrant_collection_name

        if self._qdrant_indexer is not None:
            await self._qdrant_indexer.delete_collection(collection_name)

        self._session.delete(project)
        self._session.commit()

        return DeleteProjectResponse(
            project_id=project_id,
            qdrant_collection_name=collection_name,
            deleted_document_count=deleted_document_count,
            deleted_chunk_count=deleted_chunk_count,
        )
