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
qdrant/             Local persistent Qdrant storage mount point (`qdrant/storage`)
docker-compose.yml  Local stack orchestration (frontend, backend, qdrant, ollama)
.env.template       Environment and host-path template
```

## Quick Start

1. Copy environment template:

```bash
cp .env.template .env
```

2. Update absolute host paths in `.env` (`OLLAMA_MODELS_DIR`, `QDRANT_STORAGE_DIR`, `BACKEND_DATA_DIR`).
   Use your persistent Ollama model cache path so models are reused between runs.
   The `.env.template` paths are placeholders by design; run compose with your real `.env`.

3. Start stack:

```bash
docker compose --env-file .env up -d --build
```

4. Open:

- Frontend: `http://localhost:5173`
- Backend docs: `http://localhost:8000/docs`
- Qdrant: `http://localhost:6333/dashboard`

## Persistent Paths

- `.env.template` now uses generic example paths only (no machine-specific path leakage).
- Set `OLLAMA_MODELS_DIR` to your persistent local model store (for example your existing `/home/.../models/ollama` path in your real `.env`).
- `qdrant/storage/` is included for persistent vector data mounts.

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

## Audit Example (PDF-Derived TXT)

Document used: `data/2512.10398v6.txt` (generated from a PDF extraction).

Audit report: `docs/audits/2026-02-21-2512.10398v6-section-audit.md`

Key results from the 2026-02-21 run:

- Full-file normalization:
  - `source_chars=92812`
  - `normalized_chars=91393`
  - `removed_repeated_line_count=142`
  - `collapsed_whitespace_count=11224`
- Repeated marker cleanup (`<SYSTEM>`, `Agent`, `<AI>`, `Output:`) dropped to `0` occurrences after normalization.
- Deterministic chunking (section-level, `max=550`, `min=180`, `overlap=80`) produced `3` chunks: `[456, 219, 522]`.
- Agentic chunking on the same section (`gpt-oss:20b`) produced `3` chunks: `[445, 576, 165]` with semantic rationales per boundary.
- Audit finding: the agentic pass can violate size constraints (here `165 < min=180`), so manual review or post-validation remains required.

Reproduce the deterministic audit:

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend python -m scripts.run_section_audit \
  --input-file data/2512.10398v6.txt \
  --section-anchor Introduction \
  --section-length 1200 \
  --max-chars 550 \
  --min-chars 180 \
  --overlap-chars 80
```

## Backend Verification

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend ruff check src tests
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend pytest -q
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend python -c "from src.main import app; print(sorted(app.openapi()['paths'].keys()))"
```
