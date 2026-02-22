from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
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
    redoc_url=None,
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

REDOC_NOWRAP_CSS = """
.ragsuite-inline-content-type {
  white-space: nowrap !important;
}
"""

REDOC_CONTENT_TYPE_FIX_SCRIPT = """
<script>
(function () {
  const MIME_RE = /^[A-Za-z0-9!#$&^_.+-]+\\/[A-Za-z0-9!#$&^_.+-]+$/i;

  function findMimeNode(container, labelNode) {
    const tags = "div, span, code, p, strong, label";
    const inContainer = Array.from(container.querySelectorAll(tags));
    for (const candidate of inContainer) {
      if (candidate === labelNode) {
        continue;
      }
      const candidateText = (candidate.textContent || "").trim();
      if (MIME_RE.test(candidateText)) {
        return candidate;
      }
    }

    let sibling = container.nextElementSibling;
    let guard = 0;
    while (sibling && guard < 2) {
      guard += 1;
      const siblingText = (sibling.textContent || "").trim();
      if (MIME_RE.test(siblingText)) {
        return sibling;
      }
      const nested = Array.from(sibling.querySelectorAll(tags)).find((candidate) => {
        const candidateText = (candidate.textContent || "").trim();
        return MIME_RE.test(candidateText);
      });
      if (nested) {
        return nested;
      }
      sibling = sibling.nextElementSibling;
    }

    return null;
  }

  function fixContentTypeRows() {
    const nodes = document.querySelectorAll(
      ".redoc-wrap div, .redoc-wrap span, .redoc-wrap label, .redoc-wrap strong, .redoc-wrap p"
    );
    for (const node of nodes) {
      const text = (node.textContent || "").replace(/\\s+/g, " ").trim();
      if (/^Content type:\\s+[A-Za-z0-9!#$&^_.+-]+\\/[A-Za-z0-9!#$&^_.+-]+$/i.test(text)) {
        node.classList.add("ragsuite-inline-content-type");
        continue;
      }

      if (text !== "Content type") {
        continue;
      }

      const parent = node.parentElement;
      if (!parent) {
        continue;
      }

      if (node.getAttribute("data-ragsuite-content-type-patched") === "1") {
        continue;
      }

      const valueNode = findMimeNode(parent, node);
      if (!valueNode) {
        continue;
      }

      const mimeValue = (valueNode.textContent || "").trim();
      if (!MIME_RE.test(mimeValue)) {
        continue;
      }

      node.textContent = `Content type: ${mimeValue}`;
      node.classList.add("ragsuite-inline-content-type");
      node.setAttribute("data-ragsuite-content-type-patched", "1");
      valueNode.style.display = "none";
    }
  }

  const observer = new MutationObserver(fixContentTypeRows);
  window.addEventListener("load", function () {
    fixContentTypeRows();
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
</script>
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


@app.get("/redoc", include_in_schema=False)
async def custom_redoc_ui() -> HTMLResponse:
    """Serve ReDoc with CSS override so content-type labels do not wrap."""

    redoc = get_redoc_html(
        openapi_url=app.openapi_url or "/openapi.json",
        title=f"{app.title} - ReDoc",
    )
    html = redoc.body.decode("utf-8").replace(
        "</head>",
        f"<style>{REDOC_NOWRAP_CSS}</style>{REDOC_CONTENT_TYPE_FIX_SCRIPT}</head>",
    )
    return HTMLResponse(content=html, status_code=redoc.status_code)


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
