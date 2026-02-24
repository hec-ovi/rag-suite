from __future__ import annotations

from collections.abc import Callable, Sequence
import gc
import threading
from typing import Protocol

import numpy as np

from src.core.exceptions import ExternalServiceError
from src.models.runtime.rerank import RerankResult, RerankRunResult


class _CrossEncoderModel(Protocol):
    """Minimal protocol required from sentence-transformers CrossEncoder."""

    def predict(  # noqa: PLR0913
        self,
        sentences: Sequence[tuple[str, str]],
        batch_size: int = 16,
        show_progress_bar: bool = False,
    ) -> object: ...


ModelLoader = Callable[[str, str, int, bool], _CrossEncoderModel]


MODEL_ALIASES: dict[str, str] = {
    "bge-reranker-v2-m3": "BAAI/bge-reranker-v2-m3",
    "bge-reranker-v2-m3:latest": "BAAI/bge-reranker-v2-m3",
    "BAAI/bge-reranker-v2-m3:latest": "BAAI/bge-reranker-v2-m3",
}


class CrossEncoderReranker:
    """Cross-encoder reranker with lazy model loading and alias resolution."""

    def __init__(
        self,
        default_model: str,
        configured_device: str,
        max_length: int,
        batch_size: int,
        use_fp16: bool,
        unload_after_request: bool = True,
        model_loader: ModelLoader | None = None,
    ) -> None:
        self._default_model = default_model
        self._resolved_device = self._resolve_device(configured_device)
        self._max_length = max(max_length, 64)
        self._batch_size = max(batch_size, 1)
        self._use_fp16 = use_fp16
        self._unload_after_request = unload_after_request
        self._model_loader = model_loader or self._load_model

        self._model_cache: dict[str, _CrossEncoderModel] = {}
        self._cache_lock = threading.Lock()

    @property
    def resolved_device(self) -> str:
        """Return active compute device string."""

        return self._resolved_device

    @property
    def default_model(self) -> str:
        """Return configured default model name."""

        return self._default_model

    def loaded_models(self) -> list[str]:
        """Return resolved model ids currently cached in memory."""

        return sorted(self._model_cache.keys())

    @property
    def unload_after_request(self) -> bool:
        """Return whether models are unloaded after each rerank call."""

        return self._unload_after_request

    def resolve_model_name(self, model: str) -> str:
        """Resolve aliases into canonical model identifiers."""

        candidate = model.strip()
        if not candidate:
            return MODEL_ALIASES.get(self._default_model, self._default_model)

        return MODEL_ALIASES.get(candidate, candidate)

    def rerank(
        self,
        *,
        model: str,
        query: str,
        documents: list[str],
        top_n: int | None,
    ) -> RerankRunResult:
        """Score query-document pairs and return descending relevance rows."""

        resolved_model = self.resolve_model_name(model)
        encoder: _CrossEncoderModel | None = None
        try:
            encoder = self._get_or_load_model(resolved_model)

            sentence_pairs = [(query, document) for document in documents]
            raw_scores = encoder.predict(
                sentence_pairs,
                self._batch_size,
                False,
            )

            scores = self._normalize_scores(raw_scores=raw_scores, expected_count=len(documents))
            ranked_indices = sorted(range(len(scores)), key=lambda idx: scores[idx], reverse=True)

            limit = len(ranked_indices) if top_n is None else min(max(top_n, 1), len(ranked_indices))
            results = [
                RerankResult(
                    index=index,
                    relevance_score=float(scores[index]),
                )
                for index in ranked_indices[:limit]
            ]

            return RerankRunResult(
                resolved_model=resolved_model,
                results=results,
            )
        finally:
            if self._unload_after_request:
                encoder = None
                self.unload_model(resolved_model)

    def _get_or_load_model(self, model_name: str) -> _CrossEncoderModel:
        """Return cached model instance or load it once per process."""

        cached = self._model_cache.get(model_name)
        if cached is not None:
            return cached

        with self._cache_lock:
            cached = self._model_cache.get(model_name)
            if cached is not None:
                return cached

            try:
                loaded = self._model_loader(
                    model_name,
                    self._resolved_device,
                    self._max_length,
                    self._use_fp16,
                )
            except Exception as error:  # noqa: BLE001
                raise ExternalServiceError(
                    "Cross-encoder model load failed. "
                    f"model={model_name} device={self._resolved_device} details={error}"
                ) from error

            self._model_cache[model_name] = loaded
            return loaded

    def unload_model(self, model_name: str) -> bool:
        """Unload one model from cache and release accelerator memory."""

        resolved_model = self.resolve_model_name(model_name)
        with self._cache_lock:
            removed = self._model_cache.pop(resolved_model, None)

        if removed is None:
            return False

        self._release_accelerator_memory()
        return True

    def unload_all_models(self) -> int:
        """Unload all cached models and release accelerator memory once."""

        with self._cache_lock:
            count = len(self._model_cache)
            self._model_cache.clear()

        if count > 0:
            self._release_accelerator_memory()

        return count

    def _load_model(self, model_name: str, device: str, max_length: int, use_fp16: bool) -> _CrossEncoderModel:
        """Load a sentence-transformers CrossEncoder model."""

        from sentence_transformers import CrossEncoder

        model = CrossEncoder(model_name=model_name, device=device, max_length=max_length)

        # On ROCm, torch.cuda path is reused; fp16 can reduce memory pressure.
        if use_fp16 and device.startswith("cuda"):
            try:
                model.model.half()
            except Exception:  # noqa: BLE001
                pass

        return model

    def _release_accelerator_memory(self) -> None:
        """Best-effort release of Python and torch GPU caches."""

        gc.collect()
        try:
            import torch

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                ipc_collect = getattr(torch.cuda, "ipc_collect", None)
                if callable(ipc_collect):
                    ipc_collect()
        except Exception:  # noqa: BLE001
            pass

    def _normalize_scores(self, raw_scores: object, expected_count: int) -> list[float]:
        """Normalize score payload into a float list with strict length check."""

        try:
            scores = np.asarray(raw_scores, dtype=float).reshape(-1)
        except Exception as error:  # noqa: BLE001
            raise ExternalServiceError("Cross-encoder returned malformed score payload") from error

        if scores.size != expected_count:
            raise ExternalServiceError(
                "Cross-encoder returned unexpected score count. "
                f"expected={expected_count} got={scores.size}"
            )

        return [float(item) for item in scores.tolist()]

    def _resolve_device(self, configured_device: str) -> str:
        """Resolve auto/cuda/cpu preference at runtime."""

        candidate = configured_device.strip().lower() or "auto"
        if candidate != "auto":
            return candidate

        try:
            import torch

            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:  # noqa: BLE001
            return "cpu"
