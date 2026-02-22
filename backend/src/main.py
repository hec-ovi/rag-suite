from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy import Engine

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

    initialize_database(engine)

    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory

    yield

    stored_engine: Engine = app.state.engine
    stored_engine.dispose()


app = FastAPI(
    title="RAG Suite Backend",
    version="0.1.0",
    docs_url=None,
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

SWAGGER_NOWRAP_CSS = """
.opblock .opblock-section-header label,
.opblock .opblock-section-header select,
.opblock .tab-header .tab-item {
  white-space: nowrap !important;
}
"""


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui() -> HTMLResponse:
    """Serve Swagger UI with CSS override so media types stay on one line."""

    swagger = get_swagger_ui_html(
        openapi_url=app.openapi_url or "/openapi.json",
        title=f"{app.title} - Swagger UI",
    )
    html = swagger.body.decode("utf-8").replace(
        "</head>",
        f"<style>{SWAGGER_NOWRAP_CSS}</style></head>",
    )
    return HTMLResponse(content=html, status_code=swagger.status_code)


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
