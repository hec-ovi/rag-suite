import type { ChunkMode, ChunkProposal } from "../../types/pipeline"
import { SectionCard } from "../ui/SectionCard"

interface ChunkReviewPanelProps {
  chunkMode: ChunkMode
  chunkOptions: {
    maxChunkChars: number
    minChunkChars: number
    overlapChars: number
  }
  chunks: ChunkProposal[]
  onChunkModeChange: (mode: ChunkMode) => void
  onChunkOptionsChange: (options: { maxChunkChars: number; minChunkChars: number; overlapChars: number }) => void
  onRunChunking: () => Promise<void>
  disabled: boolean
}

export function ChunkReviewPanel({
  chunkMode,
  chunkOptions,
  chunks,
  onChunkModeChange,
  onChunkOptionsChange,
  onRunChunking,
  disabled,
}: ChunkReviewPanelProps) {
  return (
    <SectionCard
      title="Chunk Boundary Review"
      subtitle="Pick deterministic or agentic chunk boundaries, tune chunk sizes, and review rationales."
      actions={
        <button
          type="button"
          onClick={onRunChunking}
          disabled={disabled}
          className="bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Propose chunks
        </button>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Mode
          <select
            value={chunkMode}
            onChange={(event) => onChunkModeChange(event.target.value as ChunkMode)}
            className="border border-border bg-background px-3 py-2 text-foreground"
          >
            <option value="deterministic">Deterministic</option>
            <option value="agentic">Agentic (experimental)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Max chars
          <input
            type="number"
            min={500}
            max={8000}
            value={chunkOptions.maxChunkChars}
            onChange={(event) =>
              onChunkOptionsChange({
                ...chunkOptions,
                maxChunkChars: Number(event.target.value),
              })
            }
            className="border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Min chars
          <input
            type="number"
            min={100}
            max={3000}
            value={chunkOptions.minChunkChars}
            onChange={(event) =>
              onChunkOptionsChange({
                ...chunkOptions,
                minChunkChars: Number(event.target.value),
              })
            }
            className="border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Overlap chars
          <input
            type="number"
            min={0}
            max={1000}
            value={chunkOptions.overlapChars}
            onChange={(event) =>
              onChunkOptionsChange({
                ...chunkOptions,
                overlapChars: Number(event.target.value),
              })
            }
            className="border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>
      </div>

      <div className="max-h-72 space-y-3 overflow-auto pr-1">
        {chunks.length === 0 ? <p className="text-sm text-muted">No chunks proposed yet.</p> : null}
        {chunks.map((chunk) => (
          <article key={chunk.chunk_index} className="border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-wide text-muted">
                Chunk {chunk.chunk_index + 1} ({chunk.start_char}-{chunk.end_char})
              </p>
              <p className="text-xs text-muted">{chunk.text.length} chars</p>
            </div>
            <p className="mb-2 text-xs text-muted">{chunk.rationale ?? "No rationale provided."}</p>
            <p className="max-h-28 overflow-hidden whitespace-pre-wrap text-sm text-foreground">{chunk.text}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  )
}
