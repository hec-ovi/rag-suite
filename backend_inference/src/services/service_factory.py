from __future__ import annotations

from src.core.config import Settings
from src.services.inference_service import InferenceService
from src.tools.ollama_inference_client import OllamaInferenceClient


def build_inference_service(settings: Settings) -> InferenceService:
    """Build OpenAI-compatible inference service backed by Ollama."""

    return InferenceService(
        ollama_client=OllamaInferenceClient(
            base_url=settings.ollama_url,
            timeout_seconds=settings.ollama_timeout_seconds,
        )
    )
