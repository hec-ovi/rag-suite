# Backend

FastAPI backend for Stage 0 ingestion pipeline.

## Run (local)

```bash
UV_CACHE_DIR=/tmp/uv-cache uv sync --directory backend --frozen
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir src
```

## API Docs

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
