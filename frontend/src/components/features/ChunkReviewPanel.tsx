import { useEffect, useMemo, useState } from "react"

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
  onRunChunking: (mode?: ChunkModeSelection) => Promise<void>
  disabled: boolean
  isChunking: boolean
}

function modeCardClass(active: boolean): string {
  if (active) {
    return "border-primary bg-primary/10"
  }
  return "border-border bg-background"
}

function compactPreview(text: string, maxChars = 120): string {
  const normalized = text.replace(/\s+/gu, " ").trim()
  if (normalized.length <= maxChars) {
    return normalized
  }
  return `${normalized.slice(0, maxChars - 3)}...`
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
  const [selectedChunkIndex, setSelectedChunkIndex] = useState(0)
  const [viewingChunkIndex, setViewingChunkIndex] = useState<number | null>(null)

  useEffect(() => {
    if (chunks.length === 0) {
      setSelectedChunkIndex(0)
      return
    }
    setSelectedChunkIndex((current) => Math.min(current, chunks.length - 1))
  }, [chunks])

  const selectedChunk = useMemo(() => {
    if (chunks.length === 0) {
      return null
    }
    return chunks[selectedChunkIndex] ?? chunks[0]
  }, [chunks, selectedChunkIndex])
  const chunkTotal = chunks.length
  const chunkDisplayNumber = selectedChunk !== null ? selectedChunk.chunk_index + 1 : 0
  const chunkDisplayPosition = selectedChunk !== null ? selectedChunkIndex + 1 : 0
  const canMovePrev = chunkTotal > 0 && selectedChunkIndex > 0
  const canMoveNext = chunkTotal > 0 && selectedChunkIndex < chunkTotal - 1
  const viewingChunk = useMemo(() => {
    if (viewingChunkIndex === null) {
      return null
    }
    return chunks[viewingChunkIndex] ?? null
  }, [chunks, viewingChunkIndex])
  const viewingIndex = viewingChunk !== null && viewingChunkIndex !== null ? viewingChunkIndex : 0
  const viewingChunkPosition = viewingChunk !== null ? viewingIndex + 1 : 0
  const canMoveViewingPrev = viewingChunk !== null && viewingIndex > 0
  const canMoveViewingNext = viewingChunk !== null && viewingIndex < chunkTotal - 1

  return (
    <>
      <SectionCard
        title="STEP 4 - Propose Chunks"
        subtitle="Select chunking mode, optionally tune advanced settings, then generate and review chunk candidates."
      >
        <section className="mb-3 border border-border bg-background p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Chunking Mode (Required)</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div
              onClick={() => onChunkModeChange("")}
              className={`flex h-full cursor-pointer flex-col border p-3 text-left ${modeCardClass(chunkMode === "")}`}
            >
              <p className="mb-1 font-semibold text-foreground">Disabled (default)</p>
              <p className="text-sm text-muted">No chunk mode selected yet.</p>
            </div>

            <div
              onClick={() => onChunkModeChange("deterministic")}
              className={`flex h-full cursor-pointer flex-col border p-3 text-left ${modeCardClass(chunkMode === "deterministic")}`}
            >
              <p className="mb-1 font-semibold text-foreground">Deterministic</p>
              <p className="text-sm text-muted">Fast paragraph-aware boundaries, stable and repeatable.</p>
              <div className="mt-auto flex justify-start pt-3">
                <button
                  type="button"
                  onClick={() => void onRunChunking("deterministic")}
                  disabled={disabled}
                  className="bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  Generate
                </button>
              </div>
            </div>

            <div
              onClick={() => onChunkModeChange("agentic")}
              className={`flex h-full cursor-pointer flex-col border p-3 text-left ${modeCardClass(chunkMode === "agentic")}`}
            >
              <p className="mb-1 font-semibold text-foreground">Agentic (experimental)</p>
              <p className="text-sm text-muted">Agent proposes semantic boundaries when structure is noisy.</p>
              <div className="mt-auto flex justify-start pt-3">
                <button
                  type="button"
                  onClick={() => void onRunChunking("agentic")}
                  disabled={disabled}
                  className="bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  Generate
                </button>
              </div>
            </div>
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

        <section className="max-w-full overflow-hidden border border-border bg-background p-3">
          {isChunking ? (
            <div>
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

          <div className="grid min-w-0 gap-3">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border border-border bg-surface px-3 py-2">
              <button
                type="button"
                onClick={() => setSelectedChunkIndex((index) => Math.max(0, index - 1))}
                disabled={!canMovePrev}
                className="border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground disabled:opacity-40"
              >
                Prev
              </button>
              <p className="font-mono text-xs text-foreground">
                Chunk {chunkDisplayNumber} ({chunkDisplayPosition}/{chunkTotal})
              </p>
              <button
                type="button"
                onClick={() => setSelectedChunkIndex((index) => Math.min(chunkTotal - 1, index + 1))}
                disabled={!canMoveNext}
                className="border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground disabled:opacity-40"
              >
                Next
              </button>
            </div>

            <p className="font-mono text-xs text-muted">Total chunks: {chunkTotal}</p>

            <div className="min-w-0 max-w-full overflow-hidden border border-border bg-surface p-3">
              {selectedChunk === null ? (
                <p className="text-sm text-muted">No chunk generated yet.</p>
              ) : (
                <>
                  <p className="mb-2 break-all font-mono text-xs uppercase tracking-wide text-muted">
                    Chunk {selectedChunk.chunk_index + 1} ({selectedChunk.start_char}-{selectedChunk.end_char})
                  </p>
                  <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm text-foreground">
                    {compactPreview(selectedChunk.text)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewingChunkIndex(selectedChunkIndex)}
                    className="mt-3 border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
                  >
                    View full chunk
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

      </SectionCard>

      {viewingChunk !== null ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
          <section className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden border border-border bg-background shadow-2xl shadow-black/30">
            <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingChunkIndex((index) => Math.max(0, (index ?? 0) - 1))}
                  disabled={!canMoveViewingPrev}
                  className="border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground disabled:opacity-40"
                >
                  Prev
                </button>
                <p className="font-mono text-xs text-foreground">
                  Chunk {viewingChunk.chunk_index + 1} ({viewingChunkPosition}/{chunkTotal})
                </p>
                <button
                  type="button"
                  onClick={() => setViewingChunkIndex((index) => Math.min(chunkTotal - 1, (index ?? 0) + 1))}
                  disabled={!canMoveViewingNext}
                  className="border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground disabled:opacity-40"
                >
                  Next
                </button>
              </div>
              <button
                type="button"
                onClick={() => setViewingChunkIndex(null)}
                className="border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground"
              >
                Close
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <p className="mb-2 text-xs text-muted">{viewingChunk.rationale ?? "No rationale provided."}</p>
              <pre className="whitespace-pre-wrap break-words border border-border bg-surface p-3 text-sm text-foreground">
                {viewingChunk.text}
              </pre>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
