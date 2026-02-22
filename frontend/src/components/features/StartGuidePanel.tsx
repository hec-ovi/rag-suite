import { SectionCard } from "../ui/SectionCard"
import { useNavigationStore } from "../../stores/navigation.store"

export function StartGuidePanel() {
  const setView = useNavigationStore((state) => state.setView)

  return (
    <section className="grid gap-4">
      <SectionCard title="Start Here" subtitle="Choose your ingestion path and jump directly into execution mode.">
        <div className="grid gap-3 md:grid-cols-2">
          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">Manual Ingestion</p>
            <p className="mb-3 text-sm text-foreground">
              Step-by-step review: project selection, source input, normalization, chunking, contextual retrieval, then
              manual ingest.
            </p>
            <button
              type="button"
              onClick={() => setView("ingestion")}
              className="border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-background"
            >
              Open Ingest
            </button>
          </article>

          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">Automatic Ingestion</p>
            <p className="mb-3 text-sm text-foreground">
              One-shot execution with automation flags and optional preview before indexing to Qdrant.
            </p>
            <button
              type="button"
              onClick={() => setView("auto_ingest")}
              className="border border-border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Open Auto-Ingest
            </button>
          </article>
        </div>
      </SectionCard>
    </section>
  )
}
