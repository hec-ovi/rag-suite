import { SectionCard } from "../../../components/ui/SectionCard"
import type { RagChatResponse, RagSourceChunk } from "../types/rag"

interface RagHybridSourcesPanelProps {
  response: RagChatResponse | null
  selectedSourceId: string | null
  onSourceSelect: (sourceId: string) => void
  onCitationSelect: (sourceId: string) => void
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 text-sm">
      <span className="font-mono text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="text-foreground">{value.toFixed(4)}</span>
    </div>
  )
}

function SourceListItem({
  source,
  selected,
  onSelect,
}: {
  source: RagSourceChunk
  selected: boolean
  onSelect: (sourceId: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(source.source_id)}
        className={`grid w-full gap-1 border px-2 py-2 text-left ${
          selected ? "border-primary bg-primary/10" : "border-border bg-background"
        }`}
      >
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
          Rank {source.rank} • {source.source_id}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{source.document_name}</p>
        <p className="text-xs text-muted">Chunk {source.chunk_index + 1}</p>
      </button>
    </li>
  )
}

export function RagHybridSourcesPanel({
  response,
  selectedSourceId,
  onSourceSelect,
  onCitationSelect,
}: RagHybridSourcesPanelProps) {
  const selectedSource =
    response?.sources.find((source) => source.source_id === selectedSourceId) ?? response?.sources[0] ?? null

  return (
    <SectionCard
      title="Sources"
      subtitle="Transparent retrieval trace for the latest answer."
      className="h-full min-h-0 flex flex-col"
      bodyClassName="min-h-0 flex-1 grid grid-rows-[auto_auto_auto_1fr] gap-3"
    >
      {response === null ? (
        <div className="border border-border bg-background p-3">
          <p className="text-sm text-muted">No trace yet. Send a message to view citations and source chunks.</p>
        </div>
      ) : (
        <>
          <section className="border border-border bg-background p-3">
            <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">Response Metadata</p>
            <div className="grid gap-1 text-sm text-foreground">
              <p>Mode: {response.mode === "session" ? "Session Memory" : "Stateless"}</p>
              <p>Session: {response.session_id ?? "(none)"}</p>
              <p>Documents hit: {response.documents.length}</p>
              <p>Sources ranked: {response.sources.length}</p>
            </div>
          </section>

          <section className="border border-border bg-background p-3">
            <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">Citations Used</p>
            {response.citations_used.length === 0 ? (
              <p className="text-sm text-muted">No explicit citation tag detected.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {response.citations_used.map((citation) => (
                  <button
                    key={citation}
                    type="button"
                    onClick={() => onCitationSelect(citation)}
                    className="border border-border bg-surface px-2 py-1 text-xs font-semibold text-foreground"
                  >
                    {citation}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="border border-border bg-background p-3">
            <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">Documents</p>
            <ul className="space-y-1 text-sm text-foreground">
              {response.documents.map((document) => (
                <li key={document.document_id} className="border border-border bg-surface px-2 py-1">
                  <p className="truncate font-medium">{document.document_name}</p>
                  <p className="text-xs text-muted">
                    {document.hit_count} hits • best rank {document.top_rank}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid min-h-0 gap-3 border border-border bg-background p-3">
            <p className="font-mono text-xs uppercase tracking-wide text-muted">Ranked Source Chunks</p>
            <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(11rem,0.9fr)_minmax(0,1.1fr)]">
              <div className="min-h-0 overflow-y-auto">
                <ul className="space-y-1 pr-1">
                  {response.sources.map((source) => (
                    <SourceListItem
                      key={source.source_id}
                      source={source}
                      selected={selectedSource?.source_id === source.source_id}
                      onSelect={onSourceSelect}
                    />
                  ))}
                </ul>
              </div>

              <div className="min-h-0 border border-border bg-surface p-2">
                {selectedSource === null ? (
                  <p className="text-sm text-muted">Select a source to inspect content.</p>
                ) : (
                  <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-2">
                    <div className="grid gap-1 text-sm text-foreground">
                      <p>
                        {selectedSource.source_id} • {selectedSource.document_name}
                      </p>
                      <p className="text-xs text-muted">Chunk {selectedSource.chunk_index + 1}</p>
                    </div>

                    <div className="grid gap-1">
                      <ScoreRow label="Hybrid" value={selectedSource.hybrid_score} />
                      <ScoreRow label="Dense" value={selectedSource.dense_score} />
                      <ScoreRow label="Sparse" value={selectedSource.sparse_score} />
                    </div>

                    <div className="min-h-0 overflow-y-auto border border-border bg-background p-2">
                      {selectedSource.context_header.trim().length > 0 ? (
                        <p className="mb-2 border border-border bg-surface px-2 py-1 text-sm text-foreground">
                          <span className="font-mono text-[10px] uppercase tracking-wide text-muted">Context: </span>
                          {selectedSource.context_header}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words text-sm text-foreground">{selectedSource.text}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </SectionCard>
  )
}
