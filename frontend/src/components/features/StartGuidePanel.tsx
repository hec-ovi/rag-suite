import { SectionCard } from "../ui/SectionCard"

const steps = [
  {
    title: "1. Create Project Namespace",
    description: "Create a project first. This becomes the persistent namespace for documents and vectors in Qdrant.",
    checklist: ["Set a clear project name", "Confirm collection mapping", "Keep one project per domain/corpus"],
  },
  {
    title: "2. Run Ingestion Pipeline",
    description: "Upload or paste raw text, normalize, chunk, contextualize, then embed and index.",
    checklist: ["Review normalization diff", "Validate chunk boundaries", "Approve contextual headers"],
  },
  {
    title: "3. Audit Stored Results",
    description: "Open Projects to inspect documents, chunk lineage, and processing flags before retrieval stage starts.",
    checklist: ["Check document/chunk counts", "Inspect raw vs normalized vs contextualized chunk text", "Remove stale test projects"],
  },
]

export function StartGuidePanel() {
  return (
    <section className="grid gap-4">
      <SectionCard
        title="Start Here"
        subtitle="Production-first ingestion flow. Review every stage before indexing to maximize retrieval quality."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.title} className="border border-border bg-background p-3">
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mb-3 text-sm text-muted">{step.description}</p>
              <ul className="space-y-1 font-mono text-xs text-foreground">
                {step.checklist.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Execution Modes"
        subtitle="Choose strict manual review or full automatic ingestion based on compliance and speed requirements."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">Manual Reviewed</p>
            <p className="text-sm text-foreground">
              You approve normalization, chunk boundaries, and contextual headers before persistence. Use for legal,
              medical, or high-audit workloads.
            </p>
          </article>
          <article className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">Full Automatic</p>
            <p className="text-sm text-foreground">
              Pipeline executes end-to-end in one pass using your flags (normalize, agentic chunking, contextual
              headers). Use when throughput matters and review is sampled.
            </p>
          </article>
        </div>
      </SectionCard>
    </section>
  )
}
