# Backend Inference

Dedicated FastAPI backend for model inference.

Scope:

- `POST /v1/chat/completions`
- `POST /v1/completions`
- `POST /v1/embeddings`
- `POST /v1/rerank`
- `GET /v1/health`

This service is the only component that talks directly to Ollama for chat/completions/embeddings.
`POST /v1/chat/completions` supports OpenAI-style SSE when `stream=true`.
`POST /v1/rerank` proxies a dedicated reranker backend (`backend_reranker`) and keeps the same OpenAI-style schema.
By default, it forwards `keep_alive=0s` to Ollama requests to avoid model residency overlap on ROCm.

## Run (local)

```bash
UV_CACHE_DIR=/tmp/uv-cache uv sync --directory backend_inference --frozen
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend_inference uvicorn src.main:app --host 0.0.0.0 --port 8010 --reload --reload-dir src
```

## API Docs

- Swagger UI: `http://localhost:8010/docs`
- OpenAPI JSON: `http://localhost:8010/openapi.json`
