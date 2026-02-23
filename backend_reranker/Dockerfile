# syntax=docker/dockerfile:1.7-labs

FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-install-project --no-dev

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

# Prefer gfx1151 ROCm torch wheels; fall back to default torch wheel if unavailable.
ARG RERANK_USE_ROCM_WHEELS=1
ARG RERANK_TORCH_INDEX_URL=https://rocm.prereleases.amd.com/whl/gfx1151/
RUN --mount=type=cache,target=/root/.cache/uv \
    if [ "${RERANK_USE_ROCM_WHEELS}" = "1" ]; then \
      uv pip install --python /app/.venv/bin/python --pre --index-url "${RERANK_TORCH_INDEX_URL}" --reinstall torch || \
      uv pip install --python /app/.venv/bin/python --reinstall torch; \
    else \
      uv pip install --python /app/.venv/bin/python --reinstall torch; \
    fi

FROM python:3.12-slim AS runtime
WORKDIR /app
ENV PATH="/app/.venv/bin:$PATH"

RUN apt-get update \
    && apt-get install -y --no-install-recommends libatomic1 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app

EXPOSE 8030
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8030"]
