from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncEngine

from src.core.config import load_settings
from src.core.database import build_engine, build_session_factory, initialize_database
from src.core.exceptions import DomainError, ExternalServiceError, ResourceNotFoundError, ValidationDomainError
from src.routes.health import router as health_router
from src.routes.pipeline import router as pipeline_router
from src.routes.projects import router as projects_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize infrastructure dependencies during app startup."""

    settings = load_settings()
    engine = build_engine(settings.database_url)
    session_factory = build_session_factory(engine)

    await initialize_database(engine)

    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory

    yield

    stored_engine: AsyncEngine = app.state.engine
    await stored_engine.dispose()


app = FastAPI(
    title="RAG Suite Backend",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


@app.exception_handler(ResourceNotFoundError)
async def handle_not_found(_: Request, exc: ResourceNotFoundError) -> JSONResponse:
    """Map domain not-found errors to HTTP 404."""

    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ValidationDomainError)
async def handle_validation(_: Request, exc: ValidationDomainError) -> JSONResponse:
    """Map domain validation errors to HTTP 400."""

    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(ExternalServiceError)
async def handle_external_service(_: Request, exc: ExternalServiceError) -> JSONResponse:
    """Map external service failures to HTTP 502."""

    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.exception_handler(DomainError)
async def handle_domain(_: Request, exc: DomainError) -> JSONResponse:
    """Map uncategorized domain errors to HTTP 400."""

    return JSONResponse(status_code=400, content={"detail": str(exc)})


app.include_router(health_router, prefix="/v1")
app.include_router(projects_router, prefix="/v1")
app.include_router(pipeline_router, prefix="/v1")
