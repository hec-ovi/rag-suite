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
              className="border border-border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              START HITL INGESTION
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
              START AUTOMATED INGESTION
            </button>
          </article>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">HITL Steps</p>
            <div className="grid gap-2">
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 01</p>
                <p className="text-sm text-muted">Select an existing project or create a new namespace for this corpus.</p>
              </div>
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 02</p>
                <p className="text-sm text-muted">Upload a document or paste raw text that you want to ingest.</p>
              </div>
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 03</p>
                <p className="text-sm text-muted">Toggle normalization ON/OFF to decide whether cleanup is applied.</p>
              </div>
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 04</p>
                <p className="text-sm text-muted">Choose deterministic or agentic chunking, then generate chunk candidates.</p>
              </div>
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 05</p>
                <p className="text-sm text-muted">Pick context mode (LLM, template, or disabled) and review chunk output.</p>
              </div>
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 06</p>
                <p className="text-sm text-muted">Confirm and ingest reviewed data into Qdrant.</p>
              </div>
            </div>
          </article>
          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">AUTOMATED/CLASSIC Form</p>
            <div className="border border-border bg-surface p-3">
              <p className="mb-2 text-sm text-foreground">
                This mode is a single compact form: select/create project, upload or paste source text, choose
                normalization + chunk mode + context mode, then ingest directly.
              </p>
              <p className="text-sm text-muted">No intermediate previews are shown before indexing.</p>
            </div>
          </article>
        </div>
      </SectionCard>
    </section>
  )
}
