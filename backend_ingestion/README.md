# Backend Ingestion

FastAPI backend dedicated to ingestion/vectorization workflows.

This service does not call Ollama directly. It delegates model operations to `backend_inference`.

## Run (local)

```bash
UV_CACHE_DIR=/tmp/uv-cache uv sync --directory backend_ingestion --frozen
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend_ingestion uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir src
```

## API Docs

- Swagger UI: `http://localhost:8000/docs` (ingestion only)
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Ingestion Endpoints

- `GET /v1/health`
- `POST /v1/projects`
- `GET /v1/projects`
- `DELETE /v1/projects/{project_id}`
- `GET /v1/projects/{project_id}/documents`
- `GET /v1/projects/documents/{document_id}/chunks`
- `POST /v1/pipeline/normalize`
- `POST /v1/pipeline/chunk`
- `POST /v1/pipeline/contextualize`
- `POST /v1/pipeline/operations/{operation_id}/cancel`
- `POST /v1/pipeline/preview-automatic`
- `POST /v1/projects/{project_id}/documents/ingest`

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
