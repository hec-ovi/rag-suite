import { useMemo, useState } from "react"

import type { RagChatResponse, RagSourceChunk } from "../types/rag"

interface RagHybridSourcesPanelProps {
  response: RagChatResponse | null
  isLoading: boolean
  selectedSourceId: string | null
  onSourceSelect: (sourceId: string) => void
}

interface NormalizedSourceScores {
  hybrid: number
  dense: number
  sparse: number
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(100, Math.max(0, value))
}

function colorByPercentage(value: number): string {
  const hue = Math.round((clampPercentage(value) / 100) * 120)
  return `hsl(${hue} 85% 42%)`
}

function normalizeValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return 50
  }
  return clampPercentage(((value - min) / (max - min)) * 100)
}

function buildNormalizedScoreMap(response: RagChatResponse | null): Record<string, NormalizedSourceScores> {
  if (response === null || response.sources.length === 0) {
    return {}
  }

  const hybridValues = response.sources.map((source) => source.hybrid_score)
  const denseValues = response.sources.map((source) => source.dense_score)
  const sparseValues = response.sources.map((source) => source.sparse_score)

  const hybridMin = Math.min(...hybridValues)
  const hybridMax = Math.max(...hybridValues)
  const denseMin = Math.min(...denseValues)
  const denseMax = Math.max(...denseValues)
  const sparseMin = Math.min(...sparseValues)
  const sparseMax = Math.max(...sparseValues)

  return response.sources.reduce<Record<string, NormalizedSourceScores>>((accumulator, source) => {
    accumulator[source.source_id] = {
      hybrid: normalizeValue(source.hybrid_score, hybridMin, hybridMax),
      dense: normalizeValue(source.dense_score, denseMin, denseMax),
      sparse: normalizeValue(source.sparse_score, sparseMin, sparseMax),
    }
    return accumulator
  }, {})
}

function GaugeRow({ label, percentage }: { label: string; percentage: number }) {
  const color = colorByPercentage(percentage)

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-mono text-xs uppercase tracking-wide text-muted">{label}</span>
        <span style={{ color }} className="font-semibold">
          {percentage.toFixed(1)}%
        </span>
      </div>

      <div className="relative h-3 bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#d93025_0%,#fbbc04_50%,#188038_100%)] opacity-70" />
        <div className="absolute bottom-0 top-0 w-0.5 bg-foreground" style={{ left: `${percentage}%` }} />
      </div>
    </div>
  )
}

function SourceDetailModal({
  source,
  normalizedScores,
  onClose,
}: {
  source: RagSourceChunk
  normalizedScores: NormalizedSourceScores
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/45 p-4">
      <div className="w-full max-w-3xl bg-surface shadow-xl">
        <header className="flex items-center justify-between bg-background px-4 py-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {source.source_id} • {source.document_name}
            </h3>
            <p className="text-sm text-muted">Chunk {source.chunk_index + 1}</p>
          </div>
          <button type="button" onClick={onClose} className="bg-surface px-3 py-2 text-sm font-semibold text-foreground">
            Close
          </button>
        </header>

        <div className="grid gap-3 p-4">
          <section className="grid gap-2 bg-background p-3">
            <GaugeRow label="Hybrid" percentage={normalizedScores.hybrid} />
            <GaugeRow label="Dense" percentage={normalizedScores.dense} />
            <GaugeRow label="Sparse" percentage={normalizedScores.sparse} />
          </section>

          <section className="grid gap-1 bg-background p-3 text-sm text-foreground">
            <p>
              <span className="font-mono text-xs uppercase tracking-wide text-muted">Document:</span> {source.document_name}
            </p>
            <p>
              <span className="font-mono text-xs uppercase tracking-wide text-muted">Source Id:</span> {source.source_id}
            </p>
            <p>
              <span className="font-mono text-xs uppercase tracking-wide text-muted">Chunk Key:</span> {source.chunk_key}
            </p>
            <p>
              <span className="font-mono text-xs uppercase tracking-wide text-muted">Rank:</span> {source.rank}
            </p>
          </section>

          <section className="bg-background p-3">
            {source.context_header.trim().length > 0 ? (
              <p className="mb-2 bg-surface px-2 py-1 text-sm text-foreground">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted">Context: </span>
                {source.context_header}
              </p>
            ) : null}
            <div className="max-h-[36vh] overflow-y-auto bg-surface p-2">
              <p className="whitespace-pre-wrap break-words text-sm text-foreground">{source.text}</p>
            </div>
          </section>
        </div>
      </div>

      <button type="button" className="absolute inset-0 -z-10" onClick={onClose} aria-label="Close source details" />
    </div>
  )
}

export function RagHybridSourcesPanel({
  response,
  isLoading,
  selectedSourceId,
  onSourceSelect,
}: RagHybridSourcesPanelProps) {
  const [detailSourceId, setDetailSourceId] = useState<string | null>(null)

  const normalizedScoreMap = useMemo(() => buildNormalizedScoreMap(response), [response])
  const detailSource =
    detailSourceId === null || response === null
      ? null
      : response.sources.find((source) => source.source_id === detailSourceId) ?? null

  return (
    <aside className="flex h-full min-h-0 w-[25rem] flex-col border-l border-border bg-surface">
      <header className="border-b border-border bg-background px-4 py-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Sources</h2>
      </header>

      <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {response === null ? (
          <div className="grid h-full place-items-center py-6">
            {isLoading ? (
              <div className="flex items-center gap-1.5 text-muted">
                <span className="h-2 w-2 animate-pulse bg-muted [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-pulse bg-muted [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-pulse bg-muted [animation-delay:240ms]" />
              </div>
            ) : (
              <p className="text-sm text-muted">No sources yet. Run a query to populate this panel.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 pt-3">
            <section className="grid grid-cols-2 gap-2 bg-background p-3">
              <div className="bg-surface px-2 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Mode</p>
                <p className="text-sm font-semibold text-foreground">
                  {response.mode === "session" ? "Session Memory" : "Stateless"}
                </p>
              </div>
              <div className="bg-surface px-2 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Session</p>
                <p className="truncate text-sm font-semibold text-foreground">{response.session_id ?? "none"}</p>
              </div>
              <div className="bg-surface px-2 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Documents</p>
                <p className="text-sm font-semibold text-foreground">{response.documents.length}</p>
              </div>
              <div className="bg-surface px-2 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Sources</p>
                <p className="text-sm font-semibold text-foreground">{response.sources.length}</p>
              </div>
            </section>

            <section className="bg-background p-3">
              <p className="mb-2 bg-surface px-2 py-2 font-mono text-xs uppercase tracking-wide text-muted">
                Citations - Ranked Sources
              </p>
              <ul className="space-y-1">
                {response.sources.map((source) => {
                  const normalized = normalizedScoreMap[source.source_id] ?? { hybrid: 0, dense: 0, sparse: 0 }
                  return (
                    <li key={source.source_id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSourceSelect(source.source_id)
                          setDetailSourceId(source.source_id)
                        }}
                        className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-2 text-left ${
                          selectedSourceId === source.source_id ? "bg-primary/10" : "bg-surface"
                        }`}
                      >
                        <span className="!rounded-full h-2.5 w-2.5 bg-primary" />
                        <span className="truncate text-sm font-medium text-foreground">
                          {source.source_id} - Rank {source.rank}
                        </span>
                        <span style={{ color: colorByPercentage(normalized.hybrid) }} className="text-xs font-semibold">
                          {normalized.hybrid.toFixed(0)}%
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
        )}
      </div>

      {detailSource !== null ? (
        <SourceDetailModal
          source={detailSource}
          normalizedScores={normalizedScoreMap[detailSource.source_id] ?? { hybrid: 0, dense: 0, sparse: 0 }}
          onClose={() => setDetailSourceId(null)}
        />
      ) : null}
    </aside>
  )
}
