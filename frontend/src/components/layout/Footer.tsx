export function Footer() {
  return (
    <footer className="shrink-0 border-t border-border/80 bg-background/70">
      <div className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-4 text-sm text-muted md:grid-cols-3">
        <section className="text-center">
          <p className="mb-1 font-semibold text-foreground">Inference Backend</p>
          <div className="flex items-center justify-center gap-4">
            <a className="hover:text-foreground" href="http://localhost:8010/docs" target="_blank" rel="noreferrer">
              Swagger
            </a>
            <a className="hover:text-foreground" href="http://localhost:8010/redoc" target="_blank" rel="noreferrer">
              ReDoc
            </a>
          </div>
        </section>

        <section className="text-center">
          <p className="mb-1 font-semibold text-foreground">Ingestion Backend</p>
          <div className="flex items-center justify-center gap-4">
            <a className="hover:text-foreground" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
              Swagger
            </a>
            <a className="hover:text-foreground" href="http://localhost:8000/redoc" target="_blank" rel="noreferrer">
              ReDoc
            </a>
          </div>
        </section>

        <section className="text-center">
          <p className="mb-1 font-semibold text-foreground">RAG Backend</p>
          <div className="flex items-center justify-center gap-4">
            <a className="hover:text-foreground" href="http://localhost:8020/docs" target="_blank" rel="noreferrer">
              Swagger
            </a>
            <a className="hover:text-foreground" href="http://localhost:8020/redoc" target="_blank" rel="noreferrer">
              ReDoc
            </a>
          </div>
        </section>
      </div>
    </footer>
  )
}
