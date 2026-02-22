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
    <SectionCard title="Sources + Citations" subtitle="Trace panel separated from chat.">
      {response === null ? (
        <div className="border border-border bg-background p-3">
          <p className="text-sm text-muted">No response trace yet. Send a message to inspect sources and citations.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <section className="border border-border bg-background p-3">
            <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">Response Metadata</p>
            <div className="grid gap-1 text-sm text-foreground">
              <p>Mode: {response.mode === "session" ? "Session Memory" : "Stateless"}</p>
              <p>Session: {response.session_id ?? "(none)"}</p>
              <p>Project: {response.project_id}</p>
              <p>Models: {response.chat_model} / {response.embedding_model}</p>
            </div>
          </section>

          <section className="border border-border bg-background p-3">
            <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">Citations Used</p>
            {response.citations_used.length === 0 ? (
              <p className="text-sm text-muted">No citation tags detected in answer text.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                {response.citations_used.map((citation) => (
                  <li key={citation}>
                    <button
                      type="button"
                      onClick={() => onCitationSelect(citation)}
                      className="border border-border bg-surface px-2 py-1 text-left hover:bg-background"
                    >
                      {citation}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border border-border bg-background p-3">
            <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">Documents</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
              {response.documents.map((document) => (
                <li key={document.document_id}>
                  {document.document_name} • hits {document.hit_count} • best rank {document.top_rank}
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-border bg-background p-3">
            <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">Source Chunks</p>
            <ul className="max-h-44 space-y-1 overflow-y-auto">
              {response.sources.map((source) => (
                <SourceListItem
                  key={source.source_id}
                  source={source}
                  selected={selectedSource?.source_id === source.source_id}
                  onSelect={onSourceSelect}
                />
              ))}
            </ul>
          </section>

          <section className="border border-border bg-background p-3">
            <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">Selected Source Detail</p>
            {selectedSource === null ? (
              <p className="text-sm text-muted">Select a source bullet to view full details.</p>
            ) : (
              <div className="grid gap-2">
                <div className="grid gap-1 text-sm text-foreground">
                  <p>
                    {selectedSource.source_id} • {selectedSource.document_name} • chunk {selectedSource.chunk_index + 1}
                  </p>
                  <p className="text-xs text-muted">Chunk key: {selectedSource.chunk_key}</p>
                </div>

                <div className="grid gap-1">
                  <ScoreRow label="Hybrid" value={selectedSource.hybrid_score} />
                  <ScoreRow label="Dense" value={selectedSource.dense_score} />
                  <ScoreRow label="Sparse" value={selectedSource.sparse_score} />
                </div>

                <div className="max-h-44 overflow-y-auto border border-border bg-surface p-2">
                  {selectedSource.context_header.trim().length > 0 ? (
                    <p className="mb-2 border border-border bg-background px-2 py-1 text-sm text-foreground">
                      <span className="font-mono text-[10px] uppercase tracking-wide text-muted">Header: </span>
                      {selectedSource.context_header}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">{selectedSource.text}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </SectionCard>
  )
}
