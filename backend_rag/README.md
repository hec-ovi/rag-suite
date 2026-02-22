# Backend RAG

Dedicated FastAPI backend reserved for RAG workflows.

Current state: scaffold only (under construction).  
RAG implementation details will be added in the next phase.

## Run (local)

```bash
UV_CACHE_DIR=/tmp/uv-cache uv sync --directory backend_rag --frozen
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend_rag uvicorn src.main:app --host 0.0.0.0 --port 8020 --reload --reload-dir src
```

## API Docs

- Swagger UI: `http://localhost:8020/docs`
- OpenAPI JSON: `http://localhost:8020/openapi.json`

## Current Endpoints

- `GET /v1/health`
- `GET /v1/rag/status` (construction status)
