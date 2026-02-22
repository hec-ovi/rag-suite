from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.core.config import load_settings
from src.core.exceptions import (
    DomainError,
    ExternalServiceError,
    ResourceNotFoundError,
    ValidationDomainError,
)
from src.core.runtime import RuntimeContainer
from src.routes.health import router as health_router
from src.routes.rag import router as rag_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize settings and runtime dependencies at startup."""

    settings = load_settings()
    runtime = RuntimeContainer(settings)

    app.state.settings = settings
    app.state.runtime = runtime

    try:
        yield
    finally:
        runtime.close()


app = FastAPI(
    title="RAG Suite RAG Backend",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ValidationDomainError)
async def handle_validation(_: Request, exc: ValidationDomainError) -> JSONResponse:
    """Map validation-domain errors to HTTP 400."""

    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(ResourceNotFoundError)
async def handle_not_found(_: Request, exc: ResourceNotFoundError) -> JSONResponse:
    """Map missing-resource domain errors to HTTP 404."""

    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ExternalServiceError)
async def handle_external(_: Request, exc: ExternalServiceError) -> JSONResponse:
    """Map external-service failures to HTTP 502."""

    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.exception_handler(DomainError)
async def handle_domain(_: Request, exc: DomainError) -> JSONResponse:
    """Map uncategorized domain errors to HTTP 400."""

    return JSONResponse(status_code=400, content={"detail": str(exc)})


app.include_router(health_router, prefix="/v1")
app.include_router(rag_router, prefix="/v1")
