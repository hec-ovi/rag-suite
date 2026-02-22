from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.get("/status")
async def rag_status() -> dict[str, str]:
    """Expose scaffold state for the dedicated RAG backend."""

    return {
        "status": "under_construction",
        "message": "RAG implementation will be added in the next stage.",
    }
