export function Footer() {
  return (
    <footer className="shrink-0 border-t border-border/80 bg-background/70">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-muted">
        <span>Normalize -&gt; Chunk -&gt; Contextualize -&gt; Embed -&gt; Index</span>
        <div className="flex items-center gap-4">
          <a className="hover:text-foreground" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
            Swagger
          </a>
          <a className="hover:text-foreground" href="http://localhost:8000/redoc" target="_blank" rel="noreferrer">
            ReDoc
          </a>
        </div>
      </div>
    </footer>
  )
}
