import type { ChunkModeSelection, ChunkProposal } from "../../types/pipeline"
import { SectionCard } from "../ui/SectionCard"

interface ChunkReviewPanelProps {
  chunkMode: ChunkModeSelection
  chunkOptions: {
    maxChunkChars: number
    minChunkChars: number
    overlapChars: number
  }
  chunks: ChunkProposal[]
  onChunkModeChange: (mode: ChunkModeSelection) => void
  onChunkOptionsChange: (options: { maxChunkChars: number; minChunkChars: number; overlapChars: number }) => void
  onRunChunking: () => Promise<void>
  disabled: boolean
  isChunking: boolean
}

function modeCardClass(active: boolean): string {
  if (active) {
    return "border-primary bg-primary/10"
  }
  return "border-border bg-background"
}

export function ChunkReviewPanel({
  chunkMode,
  chunkOptions,
  chunks,
  onChunkModeChange,
  onChunkOptionsChange,
  onRunChunking,
  disabled,
  isChunking,
}: ChunkReviewPanelProps) {
  const loadingLabel =
    chunkMode === "agentic" ? "Agentic chunker is analyzing boundaries..." : "Building deterministic chunks..."
  const modeMissing = chunkMode === ""

  return (
    <SectionCard
      title="STEP 4 - Propose Chunks"
      subtitle="Pick one chunking mode first, then propose boundaries and review chunk rationale."
      actions={
        <button
          type="button"
          onClick={onRunChunking}
          disabled={disabled || modeMissing}
          className="bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Propose chunks
        </button>
      }
    >
      <section className="mb-3 border border-border bg-background p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Chunking Mode (Required)</p>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onChunkModeChange("deterministic")}
            className={`border p-3 text-left ${modeCardClass(chunkMode === "deterministic")}`}
          >
            <p className="mb-1 font-semibold text-foreground">Deterministic</p>
            <p className="text-sm text-muted">Fast paragraph-aware boundaries, stable and repeatable.</p>
          </button>

          <button
            type="button"
            onClick={() => onChunkModeChange("agentic")}
            className={`border p-3 text-left ${modeCardClass(chunkMode === "agentic")}`}
          >
            <p className="mb-1 font-semibold text-foreground">Agentic (experimental)</p>
            <p className="text-sm text-muted">LLM proposes semantic boundaries when structure is noisy.</p>
          </button>
        </div>
        {modeMissing ? (
          <p className="mt-2 text-sm text-danger">Select Deterministic or Agentic to continue.</p>
        ) : null}
      </section>

      <details className="mb-4 border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">Advanced chunk settings</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
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
      </details>

      <div className="max-h-72 space-y-3 overflow-auto pr-1">
        {isChunking ? (
          <div className="border border-border bg-background p-3">
            <div className="mb-2 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 animate-spin border border-primary border-t-transparent"
              />
              <p className="text-sm font-semibold text-foreground">{loadingLabel}</p>
            </div>
            <p className="text-xs text-muted animate-pulse">Previous chunk results were cleared for this new run.</p>
          </div>
        ) : null}
        {!isChunking && chunks.length === 0 ? <p className="text-sm text-muted">No chunks proposed yet.</p> : null}
        {chunks.map((chunk) => (
          <article key={chunk.chunk_index} className="border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-wide text-muted">
                Chunk {chunk.chunk_index + 1} ({chunk.start_char}-{chunk.end_char})
              </p>
              <p className="text-xs text-muted">{chunk.text.length} chars</p>
            </div>
            <p className="mb-2 text-xs text-muted">{chunk.rationale ?? "No rationale provided."}</p>
            <p className="whitespace-pre-wrap break-words text-sm text-foreground">{chunk.text}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  )
}
