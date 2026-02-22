# RAG Suite

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111111)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-DC244C)
![Ollama](https://img.shields.io/badge/Ollama-Local%20Inference-111111)
![Docker Compose](https://img.shields.io/badge/Docker%20Compose-Stack-2496ED?logo=docker&logoColor=white)

Production-focused RAG platform with a quality-first ingestion + retrieval pipeline.

## Current Scope

Stage 0 implements the data preparation control plane:

- Deterministic text normalization (no model rewriting)
- Deterministic chunking and experimental agentic chunk boundary proposals
- Context-aware retrieval headers (Anthropic-style contextual retrieval pattern)
- Embedding and vector indexing in Qdrant
- SQLite metadata registry for projects, documents, and chunk audit records
- OpenAPI backend for step-by-step and one-shot ingestion workflows
- Automatic pipeline preview endpoint for human review before persistence
- Frontend ingestion shell with PDF/DOCX/TXT extraction, diff review, and manual or automatic execution controls

Stage 1 (basic) now adds hybrid RAG retrieval:

- Hybrid search combining Qdrant dense similarity + sparse BM25 lexical scoring
- Grounded answer endpoint with inline chunk citations

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

2. Update host paths in `.env`.
   Keep `OLLAMA_MODELS_DIR` absolute (persistent model cache).
   `QDRANT_STORAGE_DIR` and `BACKEND_DATA_DIR` can stay relative (defaults in template).
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

- `.env.template` keeps `OLLAMA_MODELS_DIR` as an absolute placeholder.
- `QDRANT_STORAGE_DIR=./qdrant/storage` and `BACKEND_DATA_DIR=./backend/data` work as repository-relative defaults.
- Set `OLLAMA_MODELS_DIR` to your persistent local model store (for example `/home/.../models/ollama` in your real `.env`).

## Backend Endpoints

- `GET /v1/health`
- `POST /v1/chat/completions` (OpenAI-compatible, Ollama-backed)
- `POST /v1/completions` (OpenAI-compatible, Ollama-backed)
- `POST /v1/embeddings` (OpenAI-compatible, Ollama-backed)
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
- `POST /v1/projects/{project_id}/rag/search`
- `POST /v1/projects/{project_id}/rag/answer`

## OpenAI-Compatible Inference (Ollama-backed)

These endpoints follow OpenAI-style request/response shapes for local testing with existing client tooling:

- `POST /v1/chat/completions`
- `POST /v1/completions`
- `POST /v1/embeddings`

Example:

```bash
curl -sS http://localhost:8000/v1/chat/completions \
  -H "content-type: application/json" \
  -d '{
    "model":"gpt-oss:20b",
    "messages":[{"role":"user","content":"Reply with one word: hello"}],
    "temperature":0,
    "stream":false
  }'
```

## Incremental Roadmap

1. Stage 0: data preparation and indexing control plane (current)
2. Stage 1: basic hybrid retrieval and grounded answer endpoint (current)
3. Stage 2: reranking and quality benchmark harness (Recall@k, MRR, nDCG)
4. Stage 3: graph-augmented retrieval branch

## Frontend Workflow

The ingestion UI in `frontend/` supports:

- `Start` guide screen with cold-start checklist and execution modes
- Upload and browser-side extraction from `.pdf`, `.docx`, and `.txt`
- Raw text review and editing
- Deterministic normalization with diff visualization
- Deterministic or agentic chunk proposal review
- Context-aware retrieval header generation and manual edit
- Interrupt controls for long-running agentic chunk/context operations
- Stage-level error reporting for chunking/contextualization failures
- Manual ingest (approved chunks) or full automatic ingest
- `Projects` table with document/chunk stats, flag summaries, delete action, and chunk lineage explorer popup

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

## Hybrid Smoke Check (Tiny)

Validated against a tiny synthetic document (`Paris/Berlin/Madrid capitals`) with live Docker services:

- `POST /v1/projects` -> project created
- `POST /v1/projects/{project_id}/documents/ingest` -> `embedded_chunk_count=1`
- `POST /v1/projects/{project_id}/rag/search` -> one ranked chunk returned
- `POST /v1/projects/{project_id}/rag/answer` -> grounded answer with citation format `[document_id:chunk_index]`

## ROCm Stability Notes

If Ollama logs include messages like `Memory access fault by GPU` or the desktop briefly blanks:

- Keep `OLLAMA_NUM_PARALLEL=1`.
- Keep `OLLAMA_MAX_LOADED_MODELS=1`.
- Keep `OLLAMA_CONTEXT_LENGTH=8192` (or lower for extra stability).
- Use `Interrupt` in chunk/context steps to stop in-flight LLM work.
- If failures persist, test a smaller chat model for chunk/context operations.
