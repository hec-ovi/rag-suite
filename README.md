# RAG Suite

Production-focused RAG platform with a quality-first ingestion pipeline.

## Stage 0 Scope

Current stage implements the data preparation control plane:

- Deterministic text normalization (no model rewriting)
- Deterministic chunking and experimental agentic chunk boundary proposals
- Contextual chunk headers (Anthropic-style contextual retrieval pattern)
- Embedding and vector indexing in Qdrant
- SQLite metadata registry for projects, documents, and chunk audit records
- OpenAPI backend for step-by-step and one-shot ingestion workflows

## Why Qdrant (and not FAISS-only)

FAISS is an excellent vector search library, but this project needs production database capabilities from day one (metadata filtering, persistence, API layer, and operational controls). Qdrant provides those as a full open-source vector database while still supporting high-performance ANN retrieval.

FAISS is kept as a future benchmark/tuning path, not as the primary persistence and API layer.

## Repository Layout

```text
backend/            FastAPI ingestion API + SQLite control plane + Qdrant/Ollama adapters
frontend/           React ingestion UI shell
ollama/             ROCm Ollama startup scripts
docker-compose.yml  Local stack orchestration (frontend, backend, qdrant, ollama)
.env.template       Environment and host-path template
```

## Quick Start

1. Copy environment template:

```bash
cp .env.template .env
```

2. Update absolute host paths in `.env` (`OLLAMA_MODELS_DIR`, `QDRANT_STORAGE_DIR`, `BACKEND_DATA_DIR`).

3. Start stack:

```bash
docker compose --env-file .env up -d --build
```

4. Open:

- Frontend: `http://localhost:5173`
- Backend docs: `http://localhost:8000/docs`
- Qdrant: `http://localhost:6333/dashboard`

## Stage 0 Backend Endpoints

- `POST /v1/projects`
- `GET /v1/projects`
- `GET /v1/projects/{project_id}/documents`
- `GET /v1/projects/documents/{document_id}/chunks`
- `POST /v1/pipeline/normalize`
- `POST /v1/pipeline/chunk`
- `POST /v1/pipeline/contextualize`
- `POST /v1/projects/{project_id}/documents/ingest`

## Backend Verification

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend ruff check src tests
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend pytest -q
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend python -c "from src.main import app; print(sorted(app.openapi()['paths'].keys()))"
```
