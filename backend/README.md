# Backend

FastAPI backend for Stage 0 ingestion plus Stage 1 basic hybrid RAG retrieval.

## Run (local)

```bash
UV_CACHE_DIR=/tmp/uv-cache uv sync --directory backend --frozen
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir src
```

## API Docs

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Hybrid RAG Endpoints

- `POST /v1/projects/{project_id}/rag/search`
- `POST /v1/projects/{project_id}/rag/answer`

## Section Audit Script

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend python -m scripts.run_section_audit \
  --input-file data/2512.10398v6.txt \
  --section-anchor Introduction \
  --section-length 1200 \
  --max-chars 550 \
  --min-chars 180 \
  --overlap-chars 80
```
