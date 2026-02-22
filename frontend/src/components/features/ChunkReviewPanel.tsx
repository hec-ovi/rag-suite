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

function previewSentence(text: string): string {
  const normalized = text.replace(/\s+/gu, " ").trim()
  const sentence = normalized.split(/[.!?]\s/gu)[0] || normalized
  return sentence
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
  const [viewingChunk, setViewingChunk] = useState<ChunkProposal | null>(null)

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

  return (
    <>
      <SectionCard
        title="STEP 4 - Propose Chunks"
        subtitle="Select chunking mode, optionally tune advanced settings, then generate and review chunk candidates."
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

        <section className="border border-border bg-background p-3">
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

          {!isChunking && chunks.length === 0 ? <p className="text-sm text-muted">No chunks generated yet.</p> : null}
          {selectedChunk !== null ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs text-muted">Total chunks: {chunks.length}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedChunkIndex((index) => Math.max(0, index - 1))}
                    disabled={selectedChunkIndex <= 0}
                    className="border border-border bg-surface px-2 py-1 text-xs font-semibold text-foreground disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <p className="font-mono text-xs text-muted">
                    {selectedChunkIndex + 1}/{chunks.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedChunkIndex((index) => Math.min(chunks.length - 1, index + 1))}
                    disabled={selectedChunkIndex >= chunks.length - 1}
                    className="border border-border bg-surface px-2 py-1 text-xs font-semibold text-foreground disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="border border-border bg-surface p-3">
                <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">
                  Chunk {selectedChunk.chunk_index + 1} ({selectedChunk.start_char}-{selectedChunk.end_char})
                </p>
                <p className="mb-2 text-xs text-muted">{selectedChunk.rationale ?? "No rationale provided."}</p>
                <p className="truncate text-sm text-foreground">{previewSentence(selectedChunk.text)}</p>
                <button
                  type="button"
                  onClick={() => setViewingChunk(selectedChunk)}
                  className="mt-3 border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
                >
                  View full chunk
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <button
          type="button"
          onClick={onRunChunking}
          disabled={disabled || modeMissing}
          className="mt-3 w-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Generate chunks
        </button>
      </SectionCard>

      {viewingChunk !== null ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
          <section className="w-full max-w-3xl border border-border bg-background shadow-2xl shadow-black/30">
            <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
              <p className="font-display text-lg font-semibold text-foreground">
                Chunk {viewingChunk.chunk_index + 1} ({viewingChunk.start_char}-{viewingChunk.end_char})
              </p>
              <button
                type="button"
                onClick={() => setViewingChunk(null)}
                className="border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground"
              >
                Close
              </button>
            </header>
            <div className="max-h-[70vh] overflow-auto p-4">
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
