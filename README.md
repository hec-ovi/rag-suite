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
- Automatic pipeline preview endpoint for human review before persistence
- Frontend ingestion shell with PDF/DOCX/TXT extraction, diff review, and manual or automatic execution controls

## Why Qdrant (and not FAISS-only)

FAISS is an excellent vector search library, but this project needs production database capabilities from day one (metadata filtering, persistence, API layer, and operational controls). Qdrant provides those as a full open-source vector database while still supporting high-performance ANN retrieval.

FAISS is kept as a future benchmark/tuning path, not as the primary persistence and API layer.

## Architecture Rationale (Stage 0)

- Keep `raw_text` immutable for auditability.
- Apply deterministic normalization before chunking to avoid model-induced text drift.
- Run chunk proposal as deterministic by default; keep agentic boundaries as optional experimental mode.
- Generate contextual headers as an additive step before embedding.
- Store control-plane metadata in SQLite and vectors in Qdrant.
- Expose every stage via OpenAPI so manual and automatic modes share the same contracts.

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
- `POST /v1/pipeline/preview-automatic`
- `POST /v1/projects/{project_id}/documents/ingest`

## Incremental Roadmap

1. Stage 0: data preparation and indexing control plane (current)
2. Stage 1: retrieval and grounded answer endpoint with citations
3. Stage 2: reranking and quality benchmark harness (Recall@k, MRR, nDCG)
4. Stage 3: graph-augmented retrieval branch

## Frontend Workflow

The ingestion UI in `frontend/` supports:

- Upload and browser-side extraction from `.pdf`, `.docx`, and `.txt`
- Raw text review and editing
- Deterministic normalization with diff visualization
- Deterministic or agentic chunk proposal review
- Contextual header generation and manual edit
- Manual ingest (approved chunks) or full automatic ingest

## Backend Verification

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend ruff check src tests
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend pytest -q
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend python -c "from src.main import app; print(sorted(app.openapi()['paths'].keys()))"
```
