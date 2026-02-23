# Backend RAG

Dedicated FastAPI backend for hybrid RAG chat.

## Scope

Implemented in this stage:

- Hybrid retrieval (`dense vectors in Qdrant + sparse BM25 lexical scoring`)
- Project-scoped retrieval (mandatory `project_id`)
- Optional per-request document filtering (`document_ids`)
- Full source trace in API response (ordered chunks + document summaries)
- Persistent session snapshot store (SQLite) for UI session recovery
- Two chat modes:
  - Stateless (`/v1/rag/chat/stateless`)
  - Session memory (`/v1/rag/chat/session`) with LangGraph checkpoint persistence
- Transport streaming via Server-Sent Events:
  - Stateless stream (`/v1/rag/chat/stateless/stream`)
  - Session stream (`/v1/rag/chat/session/stream`)
  - Stream `delta` events are forwarded from true inference-token streaming (not synthetic chunk splitting)

## Run (local)

```bash
UV_CACHE_DIR=/tmp/uv-cache uv sync --directory backend_rag --frozen
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend_rag uvicorn src.main:app --host 0.0.0.0 --port 8020 --reload --reload-dir src
```

## API Docs

- Swagger UI: `http://localhost:8020/docs`
- OpenAPI JSON: `http://localhost:8020/openapi.json`

## Endpoints

- `GET /v1/health`
- `GET /v1/rag/status`
- `POST /v1/rag/chat/stateless`
- `POST /v1/rag/chat/session`
- `POST /v1/rag/chat/stateless/stream` (SSE)
- `POST /v1/rag/chat/session/stream` (SSE)
- `GET /v1/sessions`
- `POST /v1/sessions`
- `GET /v1/sessions/{session_id}`
- `PATCH /v1/sessions/{session_id}`
- `DELETE /v1/sessions/{session_id}`

## Prompt Injection Strategy

RAG context is injected with XML-tagged source blocks in a prompt template:

- `<source_set>` wrapper
- `<source id="Sx" ...>` per ranked chunk
- `<context_header>` + `<chunk_text>` fields

Assistant text is constrained to grounded answers without inline citation markers; source attribution remains in the
structured `sources` payload (ranked chunks + scores + document ids).

## Tests

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run --directory backend_rag pytest -q tests
```
