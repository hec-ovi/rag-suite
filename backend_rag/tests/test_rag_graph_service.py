from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from src.models.runtime.retrieval import (
    HybridRetrieveInput,
    HybridRetrieveResult,
    RankedSourceChunk,
    RetrievedSourceDocument,
)
from src.services.rag_graph_service import RagGraphService
from src.tools.prompt_loader import PromptLoader


class FakeRetrievalService:
    """Deterministic retrieval stub for graph tests."""

    def retrieve(self, request: HybridRetrieveInput) -> HybridRetrieveResult:
        source = RankedSourceChunk(
            rank=1,
            source_id="S1",
            chunk_key="doc-1:0",
            document_id="doc-1",
            document_name="Doc One",
            chunk_index=0,
            context_header="Policy",
            text=f"Evidence for query: {request.query}",
            dense_score=0.9,
            sparse_score=0.8,
            hybrid_score=0.88,
        )
        document = RetrievedSourceDocument(
            document_id="doc-1",
            document_name="Doc One",
            hit_count=1,
            top_rank=1,
            chunk_indices=[0],
        )
        return HybridRetrieveResult(
            project_id=request.project_id,
            query=request.query,
            embedding_model=request.embedding_model,
            sources=[source],
            documents=[document],
        )


class FakeInferenceClient:
    """Chat completion stub that records model input messages."""

    def __init__(self) -> None:
        self.calls: list[list[dict[str, str]]] = []

    def complete_chat(self, model: str, messages: list[dict[str, str]]) -> str:
        self.calls.append(messages)
        return "Grounded answer [S1]"


def _write_test_prompts(directory: Path) -> None:
    (directory / "hybrid_rag_system.md").write_text("You are grounded.", encoding="utf-8")
    (directory / "hybrid_rag_user.md").write_text(
        "Question: {question}\nContext:\n{retrieved_context}",
        encoding="utf-8",
    )


def _base_state(message: str) -> dict[str, object]:
    return {
        "mode": "session",
        "session_id": "session-1",
        "project_id": "project-1",
        "document_ids": None,
        "top_k": 6,
        "dense_top_k": 20,
        "sparse_top_k": 20,
        "dense_weight": 0.65,
        "embedding_model": "bge-m3:latest",
        "chat_model": "gpt-oss:20b",
        "history_window_messages": 8,
        "messages": [{"role": "user", "content": message}],
    }


def test_session_graph_persists_memory_between_calls() -> None:
    retrieval = FakeRetrievalService()
    inference = FakeInferenceClient()

    with TemporaryDirectory() as tmp_dir_raw:
        tmp_dir = Path(tmp_dir_raw)
        prompts_dir = tmp_dir / "prompts"
        prompts_dir.mkdir(parents=True, exist_ok=True)
        _write_test_prompts(prompts_dir)

        service = RagGraphService(
            retrieval_service=retrieval,  # type: ignore[arg-type]
            inference_client=inference,  # type: ignore[arg-type]
            prompt_loader=PromptLoader(prompts_dir=prompts_dir),
            checkpoint_path=str(tmp_dir / "rag-checkpoints.db"),
            default_history_window_messages=8,
        )
        try:
            service.invoke_session(_base_state("first question"), session_id="session-1")
            service.invoke_session(_base_state("second question"), session_id="session-1")
        finally:
            service.close()

    assert len(inference.calls) == 2
    second_call = inference.calls[1]
    roles = [item["role"] for item in second_call]
    assert roles[0] == "system"
    assert "assistant" in roles[1:-1]


def test_stateless_graph_keeps_calls_isolated() -> None:
    retrieval = FakeRetrievalService()
    inference = FakeInferenceClient()

    with TemporaryDirectory() as tmp_dir_raw:
        tmp_dir = Path(tmp_dir_raw)
        prompts_dir = tmp_dir / "prompts"
        prompts_dir.mkdir(parents=True, exist_ok=True)
        _write_test_prompts(prompts_dir)

        service = RagGraphService(
            retrieval_service=retrieval,  # type: ignore[arg-type]
            inference_client=inference,  # type: ignore[arg-type]
            prompt_loader=PromptLoader(prompts_dir=prompts_dir),
            checkpoint_path=str(tmp_dir / "rag-checkpoints.db"),
            default_history_window_messages=8,
        )
        try:
            service.invoke_stateless(_base_state("one"))
            service.invoke_stateless(_base_state("two"))
        finally:
            service.close()

    assert len(inference.calls) == 2
    second_call = inference.calls[1]
    roles = [item["role"] for item in second_call]
    assert roles == ["system", "user"]
