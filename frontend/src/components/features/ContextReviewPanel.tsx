import type { ContextMode, ContextualizedChunk } from "../../types/pipeline"
import { SectionCard } from "../ui/SectionCard"

interface ContextReviewPanelProps {
  contextMode: ContextMode
  contextualizedChunks: ContextualizedChunk[]
  onContextModeChange: (mode: ContextMode) => void
  onContextualizedChunksChange: (chunks: ContextualizedChunk[]) => void
  onRunContextualization: () => Promise<void>
  disabled: boolean
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
  onContextModeChange,
  onContextualizedChunksChange,
  onRunContextualization,
  disabled,
}: ContextReviewPanelProps) {
  return (
    <SectionCard
      title="Contextual Retrieval Review"
      subtitle="Add chunk-level context headers before embedding. You can edit headers manually before indexing."
      actions={
        <button
          type="button"
          onClick={onRunContextualization}
          disabled={disabled}
          className="bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Generate headers
        </button>
      }
    >
      <div className="mb-3 w-full max-w-64">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Context mode
          <select
            value={contextMode}
            onChange={(event) => onContextModeChange(event.target.value as ContextMode)}
            className="border border-border bg-background px-3 py-2 text-foreground"
          >
            <option value="llm">LLM contextual header</option>
            <option value="template">Template header</option>
          </select>
        </label>
      </div>

      <div className="max-h-80 space-y-3 overflow-auto pr-1">
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
      </div>
    </SectionCard>
  )
}
