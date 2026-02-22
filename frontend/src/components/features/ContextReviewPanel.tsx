import type { ContextModeSelection, ContextualizedChunk } from "../../types/pipeline"
import { SectionCard } from "../ui/SectionCard"

interface ContextReviewPanelProps {
  contextMode: ContextModeSelection
  contextualizedChunks: ContextualizedChunk[]
  hasChunkCandidates: boolean
  onContextModeChange: (mode: ContextModeSelection) => void
  onContextualizedChunksChange: (chunks: ContextualizedChunk[]) => void
  onRunContextualization: () => Promise<void>
  disabled: boolean
}

function modeCardClass(active: boolean): string {
  if (active) {
    return "border-primary bg-primary/10"
  }
  return "border-border bg-background"
}

function updateChunk(
  chunks: ContextualizedChunk[],
  chunkIndex: number,
  updates: Partial<ContextualizedChunk>,
): ContextualizedChunk[] {
  return chunks.map((chunk) => {
    if (chunk.chunk_index !== chunkIndex) {
      return chunk
    }
    return {
      ...chunk,
      ...updates,
    }
  })
}

export function ContextReviewPanel({
  contextMode,
  contextualizedChunks,
  hasChunkCandidates,
  onContextModeChange,
  onContextualizedChunksChange,
  onRunContextualization,
  disabled,
}: ContextReviewPanelProps) {
  const modeMissing = contextMode === ""

  return (
    <SectionCard
      title="STEP 5 - Contextual Retrieval"
      subtitle="Choose a context mode first, then generate and review chunk headers before embedding."
      actions={
        <button
          type="button"
          onClick={onRunContextualization}
          disabled={disabled || modeMissing || !hasChunkCandidates}
          className="bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Generate headers
        </button>
      }
    >
      <section className="mb-3 border border-border bg-background p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Context Mode (Required)</p>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onContextModeChange("llm")}
            className={`border p-3 text-left ${modeCardClass(contextMode === "llm")}`}
          >
            <p className="mb-1 font-semibold text-foreground">LLM contextual header</p>
            <p className="text-sm text-muted">Best quality contextual signal for retrieval accuracy.</p>
          </button>
          <button
            type="button"
            onClick={() => onContextModeChange("template")}
            className={`border p-3 text-left ${modeCardClass(contextMode === "template")}`}
          >
            <p className="mb-1 font-semibold text-foreground">Template header</p>
            <p className="text-sm text-muted">Fast deterministic header, useful for low-latency pipelines.</p>
          </button>
        </div>
        {modeMissing ? <p className="mt-2 text-sm text-danger">Select a context mode to continue.</p> : null}
        {!hasChunkCandidates ? (
          <p className="mt-2 text-sm text-muted">Generate chunks in Step 4 before contextualization.</p>
        ) : null}
      </section>

      <div className="my-3 border-t border-border" />

      <section className="max-h-80 space-y-3 overflow-auto pr-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Header Review</p>
        {contextualizedChunks.length === 0 ? <p className="text-sm text-muted">No contextualized chunks yet.</p> : null}
        {contextualizedChunks.map((chunk) => (
          <article key={chunk.chunk_index} className="border border-border bg-background p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">Chunk {chunk.chunk_index + 1}</p>

            <label className="mb-2 flex flex-col gap-1 text-xs text-muted">
              Header
              <textarea
                value={chunk.context_header}
                onChange={(event) => {
                  const header = event.target.value
                  const updated = updateChunk(contextualizedChunks, chunk.chunk_index, {
                    context_header: header,
                    contextualized_text: `${header}\n\n${chunk.chunk_text}`,
                  })
                  onContextualizedChunksChange(updated)
                }}
                className="h-20 border border-border bg-surface p-2 text-sm text-foreground"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted">
              Final chunk for embedding
              <textarea
                value={chunk.contextualized_text}
                onChange={(event) => {
                  const updated = updateChunk(contextualizedChunks, chunk.chunk_index, {
                    contextualized_text: event.target.value,
                  })
                  onContextualizedChunksChange(updated)
                }}
                className="h-32 border border-border bg-surface p-2 font-mono text-xs text-foreground"
              />
            </label>
          </article>
        ))}
      </section>
    </SectionCard>
  )
}
