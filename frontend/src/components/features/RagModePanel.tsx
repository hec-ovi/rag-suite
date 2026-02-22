import { SectionCard } from "../ui/SectionCard"
import type { RagViewId } from "../../stores/navigation.store"

interface RagModePanelProps {
  mode: RagViewId
}

const ragModeContent: Record<
  RagViewId,
  {
    title: string
    subtitle: string
    details: string
    status: "ready" | "construction"
  }
> = {
  rag_hybrid: {
    title: "RAG - Hybrid (Sparse + Keywords)",
    subtitle: "Baseline hybrid lane for sparse + dense retrieval workflows.",
    details:
      "Boilerplate view ready. Keep this mode for the first query workflow wiring against the hybrid backend endpoints.",
    status: "ready",
  },
  rag_reranked: {
    title: "RAG - Hybrid + Re-ranked",
    subtitle: "Hybrid retrieval followed by reranking.",
    details: "Under construction. Menu and route are prepared for the reranking stage.",
    status: "construction",
  },
  rag_kg: {
    title: "RAG - Hybrid + Knowledge Graph Enhanced",
    subtitle: "Hybrid retrieval with graph-enhanced context expansion.",
    details: "Under construction. Menu and route are prepared for the graph-enhanced stage.",
    status: "construction",
  },
}

export function RagModePanel({ mode }: RagModePanelProps) {
  const content = ragModeContent[mode]
  const isConstruction = content.status === "construction"

  return (
    <SectionCard title={content.title} subtitle={content.subtitle}>
      <div className="grid gap-3">
        <div className="border border-border bg-background p-3">
          <p className="font-mono text-xs uppercase tracking-wide text-muted">Status</p>
          <p className={`mt-1 text-sm font-semibold ${isConstruction ? "text-danger" : "text-primary"}`}>
            {isConstruction ? "UNDER CONSTRUCTION" : "BOILERPLATE READY"}
          </p>
        </div>
        <div className="border border-border bg-background p-3">
          <p className="text-sm text-muted">{content.details}</p>
        </div>
      </div>
    </SectionCard>
  )
}
