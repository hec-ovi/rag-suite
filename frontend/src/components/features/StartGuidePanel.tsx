import { SectionCard } from "../ui/SectionCard"
import { useNavigationStore } from "../../stores/navigation.store"

export function StartGuidePanel() {
  const setView = useNavigationStore((state) => state.setView)

  return (
    <section className="grid gap-4">
      <SectionCard title="Start Here" subtitle="Choose your vectorization path and jump directly into execution mode.">
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
              START HITL VECTORIZATION
            </button>
          </article>

          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">AUTOMATED</p>
            <p className="mb-3 text-sm text-foreground">
              Single-pass vectorization with compact mode selections and direct indexing.
            </p>
            <button
              type="button"
              onClick={() => setView("auto_ingest")}
              className="border border-border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              START AUTOMATED VECTORIZATION
            </button>
          </article>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">HITL Steps</p>
            <div className="grid gap-2">
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 01</p>
                <p className="text-sm text-muted">
                  Select an existing project or create a new namespace that will own documents, chunks, and vectors.
                </p>
              </div>
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 02</p>
                <p className="text-sm text-muted">
                  Upload a file or paste raw text. This is the source used for all following review steps.
                </p>
              </div>
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 03</p>
                <p className="text-sm text-muted">
                  Toggle normalization ON/OFF to control deterministic cleanup (spacing, blank lines, repeated short lines).
                </p>
              </div>
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 04</p>
                <p className="text-sm text-muted">
                  Choose chunk generation mode: deterministic (rule-based) or agentic (slower, better boundary judgment).
                </p>
              </div>
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 05</p>
                <p className="text-sm text-muted">
                  Select Context Retrieval Mode: Disabled, Template header, or Agent-generated header for each chunk.
                </p>
              </div>
              <div className="border border-border bg-surface p-2">
                <p className="font-mono text-xs text-foreground">STEP 06</p>
                <p className="text-sm text-muted">
                  Confirm settings and vectorize. Embeddings are generated and indexed into the project collection.
                </p>
              </div>
            </div>
          </article>
          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">AUTOMATED Form</p>
            <div className="border border-border bg-surface p-3">
              <p className="mb-2 text-sm text-foreground">
                This mode is a single compact form: select/create project, upload or paste source text, choose
                normalization + chunk generation mode + context retrieval mode, then vectorize directly.
              </p>
              <p className="text-sm text-muted">No intermediate previews are shown before indexing.</p>
            </div>
          </article>
        </div>
      </SectionCard>
    </section>
  )
}
