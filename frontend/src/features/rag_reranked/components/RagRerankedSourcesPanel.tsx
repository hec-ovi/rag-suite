import { useMemo, useState } from "react"

import type { RagChatResponse, RagSourceChunk } from "../types/rag"

interface RagRerankedSourcesPanelProps {
  response: RagChatResponse | null
  isLoading: boolean
  selectedSourceId: string | null
  onSourceSelect: (sourceId: string) => void
}

interface NormalizedSourceScores {
  rerank: number
  hybrid: number
  dense: number
  sparse: number
}

interface AfterRerankRow {
  key: string
  sourceLabel: string
  originalRank: number
  percentage: number | null
  kept: boolean
  sourceId: string | null
}

interface DetailModalState {
  source: RagSourceChunk
  normalizedScores: NormalizedSourceScores
  showRerank: boolean
}

function compactSourceLabel(sourceId: string | undefined, fallbackRank: number): string {
  if (typeof sourceId === "string" && /^S\d+$/i.test(sourceId.trim())) {
    return sourceId.trim().toUpperCase()
  }
  return `S${fallbackRank}`
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

  const rerankValues = response.sources.map((source) => source.rerank_score)
  const hybridValues = response.sources.map((source) => source.hybrid_score)
  const denseValues = response.sources.map((source) => source.dense_score)
  const sparseValues = response.sources.map((source) => source.sparse_score)

  const rerankMin = Math.min(...rerankValues)
  const rerankMax = Math.max(...rerankValues)
  const hybridMin = Math.min(...hybridValues)
  const hybridMax = Math.max(...hybridValues)
  const denseMin = Math.min(...denseValues)
  const denseMax = Math.max(...denseValues)
  const sparseMin = Math.min(...sparseValues)
  const sparseMax = Math.max(...sparseValues)

  return response.sources.reduce<Record<string, NormalizedSourceScores>>((accumulator, source) => {
    accumulator[source.source_id] = {
      rerank: normalizeValue(source.rerank_score, rerankMin, rerankMax),
      hybrid: normalizeValue(source.hybrid_score, hybridMin, hybridMax),
      dense: normalizeValue(source.dense_score, denseMin, denseMax),
      sparse: normalizeValue(source.sparse_score, sparseMin, sparseMax),
    }
    return accumulator
  }, {})
}

function buildNormalizedHybridCandidateMap(response: RagChatResponse | null): Record<string, Omit<NormalizedSourceScores, "rerank">> {
  if (response === null || response.hybrid_candidates.length === 0) {
    return {}
  }

  const hybridValues = response.hybrid_candidates.map((candidate) => candidate.hybrid_score)
  const denseValues = response.hybrid_candidates.map((candidate) => candidate.dense_score)
  const sparseValues = response.hybrid_candidates.map((candidate) => candidate.sparse_score)
  const hybridMin = Math.min(...hybridValues)
  const hybridMax = Math.max(...hybridValues)
  const denseMin = Math.min(...denseValues)
  const denseMax = Math.max(...denseValues)
  const sparseMin = Math.min(...sparseValues)
  const sparseMax = Math.max(...sparseValues)

  return response.hybrid_candidates.reduce<Record<string, Omit<NormalizedSourceScores, "rerank">>>((accumulator, candidate) => {
    accumulator[candidate.chunk_key] = {
      hybrid: normalizeValue(candidate.hybrid_score, hybridMin, hybridMax),
      dense: normalizeValue(candidate.dense_score, denseMin, denseMax),
      sparse: normalizeValue(candidate.sparse_score, sparseMin, sparseMax),
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
  showRerank,
  onClose,
}: {
  source: RagSourceChunk
  normalizedScores: NormalizedSourceScores
  showRerank: boolean
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
            {showRerank ? <GaugeRow label="Rerank" percentage={normalizedScores.rerank} /> : null}
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
            {showRerank ? (
              <>
                <p>
                  <span className="font-mono text-xs uppercase tracking-wide text-muted">Final Rank:</span> {source.rank}
                </p>
                <p>
                  <span className="font-mono text-xs uppercase tracking-wide text-muted">Original Hybrid Rank:</span>{" "}
                  {source.original_rank}
                </p>
                <p>
                  <span className="font-mono text-xs uppercase tracking-wide text-muted">Rerank Score:</span>{" "}
                  {source.rerank_score.toFixed(4)}
                </p>
              </>
            ) : (
              <p>
                <span className="font-mono text-xs uppercase tracking-wide text-muted">Hybrid Rank:</span> {source.rank}
              </p>
            )}
          </section>

          <section className="bg-background p-3">
            {source.context_header.trim().length > 0 ? (
              <p className="mb-2 bg-surface px-2 py-1 text-sm text-foreground">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted">Context: </span>
                {source.context_header}
              </p>
            ) : null}
            <div className="max-h-[24vh] overflow-y-auto bg-surface p-2">
              <p className="whitespace-pre-wrap break-words text-sm text-foreground">{source.text}</p>
            </div>
          </section>
        </div>
      </div>

      <button type="button" className="absolute inset-0 -z-10" onClick={onClose} aria-label="Close source details" />
    </div>
  )
}

export function RagRerankedSourcesPanel({
  response,
  isLoading,
  selectedSourceId,
  onSourceSelect,
}: RagRerankedSourcesPanelProps) {
  const [detailModalState, setDetailModalState] = useState<DetailModalState | null>(null)

  const normalizedScoreMap = useMemo(() => buildNormalizedScoreMap(response), [response])
  const normalizedHybridCandidateMap = useMemo(() => buildNormalizedHybridCandidateMap(response), [response])
  const sourceById = useMemo(() => {
    if (response === null) {
      return {}
    }
    return response.sources.reduce<Record<string, RagSourceChunk>>((accumulator, source) => {
      accumulator[source.source_id] = source
      return accumulator
    }, {})
  }, [response])

  const keptChunkKeys = useMemo(() => {
    if (response === null) {
      return new Set<string>()
    }
    return new Set(response.sources.map((source) => source.chunk_key))
  }, [response])

  const removedCount =
    response === null
      ? 0
      : response.hybrid_candidates.filter((candidate) => !keptChunkKeys.has(candidate.chunk_key)).length

  const afterRerankRows = useMemo<AfterRerankRow[]>(() => {
    if (response === null) {
      return []
    }

    const keptRows: AfterRerankRow[] = response.sources.map((source) => ({
      key: source.chunk_key,
      sourceLabel: compactSourceLabel(source.source_id, source.rank),
      originalRank: source.original_rank,
      percentage: normalizedScoreMap[source.source_id]?.rerank ?? 0,
      kept: true,
      sourceId: source.source_id,
    }))

    const removedRows: AfterRerankRow[] = response.hybrid_candidates
      .filter((candidate) => !keptChunkKeys.has(candidate.chunk_key))
      .map((candidate) => ({
        key: candidate.chunk_key,
        sourceLabel: compactSourceLabel(candidate.source_id, candidate.rank),
        originalRank: candidate.rank,
        percentage: null,
        kept: false,
        sourceId: null,
      }))

    return [...keptRows, ...removedRows]
  }, [response, normalizedScoreMap, keptChunkKeys, normalizedHybridCandidateMap])

  function openRerankSource(sourceId: string): void {
    const source = sourceById[sourceId]
    if (source === undefined) {
      return
    }
    onSourceSelect(source.source_id)
    setDetailModalState({
      source,
      normalizedScores: normalizedScoreMap[source.source_id] ?? { rerank: 0, hybrid: 0, dense: 0, sparse: 0 },
      showRerank: true,
    })
  }

  function openHybridCandidate(candidate: RagChatResponse["hybrid_candidates"][number]): void {
    if (response === null) {
      return
    }

    const keptSource = response.sources.find((source) => source.chunk_key === candidate.chunk_key)
    if (keptSource !== undefined) {
      openRerankSource(keptSource.source_id)
      return
    }

    const fallbackSource: RagSourceChunk = {
      rank: candidate.rank,
      source_id: compactSourceLabel(candidate.source_id, candidate.rank),
      chunk_key: candidate.chunk_key,
      document_id: candidate.document_id,
      document_name: candidate.document_name,
      chunk_index: candidate.chunk_index,
      context_header: candidate.context_header,
      text: candidate.text,
      dense_score: candidate.dense_score,
      sparse_score: candidate.sparse_score,
      hybrid_score: candidate.hybrid_score,
      original_rank: candidate.rank,
      rerank_score: 0,
    }
    const normalizedHybrid = normalizedHybridCandidateMap[candidate.chunk_key] ?? { hybrid: 0, dense: 0, sparse: 0 }
    setDetailModalState({
      source: fallbackSource,
      normalizedScores: { rerank: 0, ...normalizedHybrid },
      showRerank: false,
    })
  }

  return (
    <aside className="h-full w-[26rem] border-l border-border bg-surface/90 p-3">
      <header className="mb-3 flex items-center gap-2 border-b border-border bg-background px-2 py-2">
        <h2 className="font-display text-lg font-semibold text-foreground">Sources</h2>
      </header>

      <div className="chat-scrollbar h-[calc(100%-4.25rem)] overflow-y-auto pr-1">
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
          <div className="grid gap-3">
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
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Hybrid Candidates</p>
                <p className="text-sm font-semibold text-foreground">{response.hybrid_candidates.length}</p>
              </div>
              <div className="bg-surface px-2 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Removed by Rerank</p>
                <p className="text-sm font-semibold text-foreground">{removedCount}</p>
              </div>
            </section>

            <section className="bg-background p-3">
              <p className="mb-2 bg-surface px-2 py-2 font-mono text-xs uppercase tracking-wide text-muted">
                Citations - Ranked Sources
              </p>
              <div className="grid gap-2 md:grid-cols-2 md:items-stretch">
                <div className="grid min-h-[14rem] gap-1">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted">HYBRID</p>
                  <ul className="chat-scrollbar h-[14rem] space-y-1 overflow-y-auto pr-1">
                    {response.hybrid_candidates.map((candidate) => {
                      const sourceLabel = compactSourceLabel(candidate.source_id, candidate.rank)
                      const hybridPercentage = normalizedHybridCandidateMap[candidate.chunk_key]?.hybrid ?? 0
                      return (
                        <li key={`hybrid-${candidate.chunk_key}`}>
                          <button
                            type="button"
                            onClick={() => openHybridCandidate(candidate)}
                            className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 bg-surface px-2 py-2 text-left"
                          >
                            <span className="h-2.5 w-2.5 !rounded-full bg-primary" />
                            <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                              <span className="shrink-0">{sourceLabel}</span>
                              <span className="truncate text-xs text-muted">H{candidate.rank}</span>
                            </span>
                            <span
                              style={{ color: colorByPercentage(hybridPercentage) }}
                              className="text-xs font-semibold"
                            >
                              {hybridPercentage.toFixed(0)}%
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div className="grid min-h-[14rem] gap-1">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted">RERANK</p>
                  <ul className="chat-scrollbar h-[14rem] space-y-1 overflow-y-auto pr-1">
                    {afterRerankRows.map((row) => {
                      return (
                        <li key={`rerank-${row.key}`}>
                          <button
                            type="button"
                            disabled={!row.kept}
                            onClick={() => {
                              if (row.sourceId === null) {
                                return
                              }
                              openRerankSource(row.sourceId)
                            }}
                            className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-2 text-left ${
                              row.kept
                                ? selectedSourceId === row.sourceId
                                  ? "bg-primary/10"
                                  : "bg-surface"
                                : "bg-surface opacity-40"
                            }`}
                          >
                            <span className={`h-2.5 w-2.5 !rounded-full ${row.kept ? "bg-primary" : "bg-muted"}`} />
                            <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                              <span className="shrink-0">{row.sourceLabel}</span>
                              <span className="truncate text-xs text-muted">
                                H{row.originalRank} {row.kept ? "" : "- Removed"}
                              </span>
                            </span>
                            <span
                              style={{ color: row.percentage === null ? undefined : colorByPercentage(row.percentage) }}
                              className={`text-xs font-semibold ${row.kept ? "" : "text-muted"}`}
                            >
                              {row.percentage === null ? "--" : `${row.percentage.toFixed(0)}%`}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {detailModalState !== null ? (
        <SourceDetailModal
          source={detailModalState.source}
          normalizedScores={detailModalState.normalizedScores}
          showRerank={detailModalState.showRerank}
          onClose={() => setDetailModalState(null)}
        />
      ) : null}
    </aside>
  )
}
