# RAG Suite Reranker Backend

Dedicated reranker microservice used by `backend_inference` for `/v1/rerank`.

## What It Does
- Loads a cross-encoder reranker model (`BAAI/bge-reranker-v2-m3` by default)
- Scores query-document pairs
- Returns ranked rows in OpenAI-style `index + relevance_score` format

## API
- `GET /v1/health`
- `POST /v1/rerank`

## Environment
- `RERANK_DEFAULT_MODEL` (default: `BAAI/bge-reranker-v2-m3`)
- `RERANK_DEVICE` (default: `auto`)
- `RERANK_MAX_LENGTH` (default: `1024`)
- `RERANK_BATCH_SIZE` (default: `16`)
- `RERANK_USE_FP16` (default: `true`)
- `RERANK_UNLOAD_AFTER_REQUEST` (default: `true`)
- `HF_HOME` (default: `/cache/huggingface`)

## Notes
The Dockerfile attempts ROCm gfx1151 PyTorch wheels first and falls back to standard torch wheels when unavailable.
With `RERANK_UNLOAD_AFTER_REQUEST=true`, the reranker unloads model weights after each request and clears torch GPU cache to reduce ROCm overlap risk with Ollama.
