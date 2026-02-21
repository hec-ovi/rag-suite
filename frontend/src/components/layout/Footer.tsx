export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-background/70">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 text-sm text-muted">
        <span>Stage 0: Normalize -&gt; Chunk -&gt; Contextualize -&gt; Embed -&gt; Index</span>
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
