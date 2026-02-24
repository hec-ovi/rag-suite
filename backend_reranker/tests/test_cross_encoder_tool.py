from __future__ import annotations

from collections.abc import Sequence

from src.tools.cross_encoder_reranker import CrossEncoderReranker


class _FakeModel:
    def predict(  # noqa: ARG002
        self,
        sentences: Sequence[tuple[str, str]],
        batch_size: int = 16,
        show_progress_bar: bool = False,
    ) -> list[float]:
        return [0.2, 0.95, 0.5][: len(sentences)]


def _fake_loader(model_name: str, device: str, max_length: int, use_fp16: bool) -> _FakeModel:  # noqa: ARG001
    return _FakeModel()


def test_cross_encoder_tool_resolves_alias_and_sorts_desc() -> None:
    tool = CrossEncoderReranker(
        default_model="bge-reranker-v2-m3:latest",
        configured_device="cpu",
        max_length=512,
        batch_size=8,
        use_fp16=False,
        model_loader=_fake_loader,
    )

    result = tool.rerank(
        model="bge-reranker-v2-m3:latest",
        query="gift",
        documents=["doc0", "doc1", "doc2"],
        top_n=2,
    )

    assert result.resolved_model == "BAAI/bge-reranker-v2-m3"
    assert [row.index for row in result.results] == [1, 2]
    assert len(result.results) == 2


def test_cross_encoder_tool_tracks_loaded_models() -> None:
    tool = CrossEncoderReranker(
        default_model="BAAI/bge-reranker-v2-m3",
        configured_device="cpu",
        max_length=512,
        batch_size=8,
        use_fp16=False,
        model_loader=_fake_loader,
    )

    assert tool.loaded_models() == []


def test_cross_encoder_tool_unloads_after_request_by_default() -> None:
    tool = CrossEncoderReranker(
        default_model="BAAI/bge-reranker-v2-m3",
        configured_device="cpu",
        max_length=512,
        batch_size=8,
        use_fp16=False,
        model_loader=_fake_loader,
    )

    tool.rerank(
        model="BAAI/bge-reranker-v2-m3",
        query="gift",
        documents=["doc a", "doc b"],
        top_n=1,
    )

    assert tool.loaded_models() == []


def test_cross_encoder_tool_can_keep_model_loaded_when_configured() -> None:
    tool = CrossEncoderReranker(
        default_model="BAAI/bge-reranker-v2-m3",
        configured_device="cpu",
        max_length=512,
        batch_size=8,
        use_fp16=False,
        unload_after_request=False,
        model_loader=_fake_loader,
    )

    tool.rerank(
        model="BAAI/bge-reranker-v2-m3",
        query="gift",
        documents=["doc a", "doc b"],
        top_n=1,
    )

    assert tool.loaded_models() == ["BAAI/bge-reranker-v2-m3"]
