from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy import Select, select
from sqlalchemy.orm import Session, sessionmaker

from src.core.exceptions import ResourceNotFoundError, ValidationDomainError
from src.models.session_db.rag_reranked_session import RagRerankedSessionORM
from src.reranked.models import (
    RagRerankedChatResponse,
    RagRerankedSessionCreateRequest,
    RagRerankedSessionListResponse,
    RagRerankedSessionMessage,
    RagRerankedSessionRecord,
    RagRerankedSessionSummary,
    RagRerankedSessionUpdateRequest,
)


class RagRerankedSessionStoreService:
    """CRUD + snapshot persistence for reranked RAG chat sessions."""

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def list_sessions(self, project_id: str | None = None) -> RagRerankedSessionListResponse:
        """Return reranked session summaries sorted by recency."""

        with self._session_factory() as db:
            statement: Select[tuple[RagRerankedSessionORM]] = select(RagRerankedSessionORM).order_by(
                RagRerankedSessionORM.updated_at.desc()
            )
            if isinstance(project_id, str) and project_id.strip():
                statement = statement.where(RagRerankedSessionORM.project_id == project_id.strip())

            rows = db.execute(statement).scalars().all()
            return RagRerankedSessionListResponse(sessions=[self._to_summary(row) for row in rows])

    def create_session(
        self,
        request: RagRerankedSessionCreateRequest,
        *,
        session_id: str | None = None,
    ) -> RagRerankedSessionRecord:
        """Create a new persisted reranked session row."""

        now = datetime.now(timezone.utc)
        resolved_id = session_id.strip() if isinstance(session_id, str) and session_id.strip() else str(uuid4())
        project_id = self._normalize_project_id(request.project_id)
        title = self._normalize_title(request.title, messages=[])
        selected_document_ids = request.selected_document_ids or []

        with self._session_factory() as db:
            existing = db.get(RagRerankedSessionORM, resolved_id)
            if existing is not None:
                raise ValidationDomainError(f"Session already exists: {resolved_id}")

            row = RagRerankedSessionORM(
                id=resolved_id,
                project_id=project_id,
                title=title,
                message_count=0,
                messages=[],
                selected_document_ids=selected_document_ids,
                selected_source_id=None,
                latest_response=None,
                created_at=now,
                updated_at=now,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return self._to_record(row)

    def get_session(self, session_id: str) -> RagRerankedSessionRecord:
        """Return full persisted snapshot for one reranked session."""

        resolved_id = self._normalize_session_id(session_id)
        with self._session_factory() as db:
            row = db.get(RagRerankedSessionORM, resolved_id)
            if row is None:
                raise ResourceNotFoundError(f"Session not found: {resolved_id}")
            return self._to_record(row)

    def update_session(self, session_id: str, request: RagRerankedSessionUpdateRequest) -> RagRerankedSessionRecord:
        """Patch one reranked session snapshot."""

        resolved_id = self._normalize_session_id(session_id)
        with self._session_factory() as db:
            row = db.get(RagRerankedSessionORM, resolved_id)
            if row is None:
                raise ResourceNotFoundError(f"Session not found: {resolved_id}")

            fields_set = request.model_fields_set

            if "project_id" in fields_set:
                row.project_id = self._normalize_project_id(request.project_id)

            if "messages" in fields_set:
                messages = request.messages or []
                row.messages = [message.model_dump(mode="json") for message in messages]
                row.message_count = len(messages)

                if "title" not in fields_set and self._title_is_default(row.title):
                    row.title = self._normalize_title(None, messages=messages)

            if "selected_document_ids" in fields_set:
                row.selected_document_ids = request.selected_document_ids or []

            if "selected_source_id" in fields_set:
                row.selected_source_id = self._normalize_source_id(request.selected_source_id)

            if "latest_response" in fields_set:
                row.latest_response = (
                    request.latest_response.model_dump(mode="json")
                    if request.latest_response is not None
                    else None
                )

            if "title" in fields_set:
                row.title = self._normalize_title(request.title, messages=self._load_message_models(row))

            row.updated_at = datetime.now(timezone.utc)
            db.add(row)
            db.commit()
            db.refresh(row)
            return self._to_record(row)

    def delete_session(self, session_id: str) -> None:
        """Delete one persisted reranked session and all snapshots in that row."""

        resolved_id = self._normalize_session_id(session_id)
        with self._session_factory() as db:
            row = db.get(RagRerankedSessionORM, resolved_id)
            if row is None:
                raise ResourceNotFoundError(f"Session not found: {resolved_id}")

            db.delete(row)
            db.commit()

    def append_turn(
        self,
        *,
        session_id: str,
        project_id: str,
        user_message: str,
        assistant_message: str,
        selected_document_ids: list[str] | None,
        latest_response: RagRerankedChatResponse,
    ) -> RagRerankedSessionRecord:
        """Append one user/assistant turn and snapshot the latest reranked response."""

        resolved_id = self._normalize_session_id(session_id)
        resolved_project_id = self._normalize_project_id(project_id)
        now = datetime.now(timezone.utc)

        with self._session_factory() as db:
            row = db.get(RagRerankedSessionORM, resolved_id)
            if row is None:
                row = RagRerankedSessionORM(
                    id=resolved_id,
                    project_id=resolved_project_id,
                    title="Untitled Session",
                    message_count=0,
                    messages=[],
                    selected_document_ids=selected_document_ids or [],
                    selected_source_id=None,
                    latest_response=None,
                    created_at=now,
                    updated_at=now,
                )
                db.add(row)

            messages = self._load_message_models(row)
            user_content = user_message.strip()
            if user_content:
                messages.append(self._build_message(role="user", content=user_content, created_at=now))

            assistant_content = assistant_message.strip()
            if assistant_content:
                messages.append(self._build_message(role="assistant", content=assistant_content, created_at=now))

            row.project_id = resolved_project_id
            row.messages = [message.model_dump(mode="json") for message in messages]
            row.message_count = len(messages)
            row.selected_document_ids = selected_document_ids or []
            row.latest_response = latest_response.model_dump(mode="json")
            row.selected_source_id = latest_response.sources[0].source_id if latest_response.sources else None
            if self._title_is_default(row.title):
                row.title = self._normalize_title(None, messages=messages)
            row.updated_at = now

            db.add(row)
            db.commit()
            db.refresh(row)
            return self._to_record(row)

    def _to_summary(self, row: RagRerankedSessionORM) -> RagRerankedSessionSummary:
        """Map ORM row to list summary schema."""

        return RagRerankedSessionSummary(
            id=row.id,
            project_id=row.project_id,
            title=row.title,
            message_count=int(row.message_count),
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def _to_record(self, row: RagRerankedSessionORM) -> RagRerankedSessionRecord:
        """Map ORM row to full reranked session schema."""

        latest_response = self._load_latest_response(row.latest_response)
        messages = self._load_message_models(row)

        return RagRerankedSessionRecord(
            id=row.id,
            project_id=row.project_id,
            title=row.title,
            message_count=int(row.message_count),
            created_at=row.created_at,
            updated_at=row.updated_at,
            selected_document_ids=self._load_selected_document_ids(row.selected_document_ids),
            selected_source_id=row.selected_source_id,
            latest_response=latest_response,
            messages=messages,
        )

    def _load_message_models(self, row: RagRerankedSessionORM) -> list[RagRerankedSessionMessage]:
        """Decode persisted message JSON into validated message models."""

        normalized: list[RagRerankedSessionMessage] = []
        raw_messages = row.messages if isinstance(row.messages, list) else []
        for item in raw_messages:
            if not isinstance(item, dict):
                continue
            try:
                normalized.append(RagRerankedSessionMessage.model_validate(item))
            except ValidationError:
                continue
        return normalized

    def _load_latest_response(self, payload: dict[str, object] | None) -> RagRerankedChatResponse | None:
        """Decode persisted latest response payload when available."""

        if not isinstance(payload, dict):
            return None
        try:
            return RagRerankedChatResponse.model_validate(payload)
        except ValidationError:
            return None

    def _load_selected_document_ids(self, payload: list[str] | object) -> list[str]:
        """Normalize persisted selected-document payload."""

        if not isinstance(payload, list):
            return []
        return [str(item) for item in payload if isinstance(item, str) and item.strip()]

    def _build_message(
        self,
        *,
        role: Literal["user", "assistant"],
        content: str,
        created_at: datetime,
    ) -> RagRerankedSessionMessage:
        """Create one persisted chat message object."""

        return RagRerankedSessionMessage(
            id=f"msg-{uuid4()}",
            role=role,
            content=content,
            created_at=created_at,
        )

    def _normalize_session_id(self, session_id: str | None) -> str:
        """Validate and normalize session identifier."""

        if not isinstance(session_id, str) or not session_id.strip():
            raise ValidationDomainError("session_id must be a non-empty string")
        return session_id.strip()

    def _normalize_project_id(self, project_id: str | None) -> str:
        """Validate and normalize project identifier."""

        if not isinstance(project_id, str) or not project_id.strip():
            raise ValidationDomainError("project_id must be a non-empty string")
        return project_id.strip()

    def _normalize_title(self, title: str | None, *, messages: list[RagRerankedSessionMessage]) -> str:
        """Resolve title from explicit value or first user message."""

        if isinstance(title, str) and title.strip():
            return title.strip()[:200]

        for message in messages:
            if message.role != "user":
                continue
            candidate = message.content.strip().replace("\n", " ")
            if not candidate:
                continue
            return candidate[:64] if len(candidate) > 64 else candidate

        return "Untitled Session"

    def _normalize_source_id(self, source_id: str | None) -> str | None:
        """Normalize source id optional field."""

        if not isinstance(source_id, str):
            return None
        cleaned = source_id.strip()
        return cleaned if cleaned else None

    def _title_is_default(self, title: str | None) -> bool:
        """Return true when title is unset or default placeholder."""

        if not isinstance(title, str):
            return True
        cleaned = title.strip()
        return cleaned == "" or cleaned == "Untitled Session"
