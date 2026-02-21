#!/usr/bin/env bash
set -euo pipefail

ollama serve &
SERVER_PID=$!

for _ in $(seq 1 120); do
  if ollama list >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! ollama list >/dev/null 2>&1; then
  echo "Ollama server did not become healthy in time" >&2
  exit 1
fi

if [ -n "${OLLAMA_CHAT_MODEL:-}" ]; then
  ollama pull "${OLLAMA_CHAT_MODEL}"
fi

if [ -n "${OLLAMA_EMBEDDING_MODEL:-}" ]; then
  ollama pull "${OLLAMA_EMBEDDING_MODEL}"
fi

wait "${SERVER_PID}"
