import { SectionCard } from "../ui/SectionCard"
import { useNavigationStore } from "../../stores/navigation.store"

export function StartGuidePanel() {
  const setView = useNavigationStore((state) => state.setView)

  return (
    <section className="grid gap-4">
      <SectionCard title="Start Here" subtitle="Choose your ingestion path and jump directly into execution mode.">
        <div className="grid gap-3 md:grid-cols-2">
          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">HITL</p>
            <p className="mb-3 text-sm text-foreground">
              Human-in-the-loop review for each stage before persisting chunks.
            </p>
            <button
              type="button"
              onClick={() => setView("ingestion")}
              className="border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-background"
            >
              Open HITL
            </button>
          </article>

          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">AUTOMATED/CLASSIC</p>
            <p className="mb-3 text-sm text-foreground">
              Single-pass ingestion with compact mode selections and direct indexing.
            </p>
            <button
              type="button"
              onClick={() => setView("auto_ingest")}
              className="border border-border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Open AUTOMATED/CLASSIC
            </button>
          </article>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">HITL Steps</p>
            <div className="grid gap-1 text-sm text-foreground">
              <p>1. Select or create project.</p>
              <p>2. Upload/paste source text.</p>
              <p>3. Toggle normalization ON/OFF.</p>
              <p>4. Choose chunk mode and generate chunks.</p>
              <p>5. Choose context option and review.</p>
              <p>6. Ingest data to Qdrant.</p>
            </div>
          </article>
          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">AUTOMATED/CLASSIC Steps</p>
            <div className="grid gap-1 text-sm text-foreground">
              <p>1. Select or create project.</p>
              <p>2. Upload/paste source text.</p>
              <p>3. Select normalization/chunk/context modes.</p>
              <p>4. Ingest in one action.</p>
            </div>
          </article>
        </div>
      </SectionCard>
    </section>
  )
}
