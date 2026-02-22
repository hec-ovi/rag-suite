import { SectionCard } from "../../../components/ui/SectionCard"
import type { RagChatMode, RagDocumentSummary, RagProjectRecord } from "../types/rag"

interface RagHybridConfigPanelProps {
  projects: RagProjectRecord[]
  selectedProjectId: string
  onProjectSelect: (projectId: string) => void
  onRefreshProjects: () => Promise<void>

  documents: RagDocumentSummary[]
  selectedDocumentIds: string[]
  onToggleDocument: (documentId: string) => void

  chatMode: RagChatMode
  onChatModeChange: (mode: RagChatMode) => void
  sessionId: string
  onSessionIdChange: (value: string) => void
  onNewSession: () => void

  topK: number
  denseTopK: number
  sparseTopK: number
  denseWeight: number
  historyWindowMessages: number
  onTopKChange: (value: number) => void
  onDenseTopKChange: (value: number) => void
  onSparseTopKChange: (value: number) => void
  onDenseWeightChange: (value: number) => void
  onHistoryWindowMessagesChange: (value: number) => void

  chatModelOverride: string
  embeddingModelOverride: string
  onChatModelOverrideChange: (value: string) => void
  onEmbeddingModelOverrideChange: (value: string) => void

  isLoadingProjects: boolean
  isLoadingDocuments: boolean
  disabled: boolean
}

function parseNumericInput(value: string): number {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    return parsed
  }
  return 0
}

export function RagHybridConfigPanel({
  projects,
  selectedProjectId,
  onProjectSelect,
  onRefreshProjects,
  documents,
  selectedDocumentIds,
  onToggleDocument,
  chatMode,
  onChatModeChange,
  sessionId,
  onSessionIdChange,
  onNewSession,
  topK,
  denseTopK,
  sparseTopK,
  denseWeight,
  historyWindowMessages,
  onTopKChange,
  onDenseTopKChange,
  onSparseTopKChange,
  onDenseWeightChange,
  onHistoryWindowMessagesChange,
  chatModelOverride,
  embeddingModelOverride,
  onChatModelOverrideChange,
  onEmbeddingModelOverrideChange,
  isLoadingProjects,
  isLoadingDocuments,
  disabled,
}: RagHybridConfigPanelProps) {
  return (
    <SectionCard
      title="Hybrid RAG Controls"
      subtitle="Project scope, retrieval settings, mode selection, and optional model overrides."
      actions={
        <button
          type="button"
          onClick={() => {
            void onRefreshProjects()
          }}
          disabled={disabled}
          className="border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-60"
        >
          Refresh Projects
        </button>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <section className="border border-border bg-background p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Project Scope</p>
          <div className="grid gap-2">
            <label className="grid gap-1 text-sm text-muted">
              Project
              <select
                value={selectedProjectId}
                onChange={(event) => onProjectSelect(event.target.value)}
                disabled={disabled}
                className="border border-border bg-background px-3 py-2 text-foreground"
              >
                <option value="">Select project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-muted">
              {isLoadingProjects ? "Loading projects..." : `${projects.length} project(s) available.`}
            </p>
          </div>
        </section>

        <section className="border border-border bg-background p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Conversation Mode</p>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChatModeChange("stateless")}
                disabled={disabled}
                className={`border px-3 py-2 text-sm font-medium ${
                  chatMode === "stateless"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground"
                } disabled:opacity-60`}
              >
                Stateless
              </button>
              <button
                type="button"
                onClick={() => onChatModeChange("session")}
                disabled={disabled}
                className={`border px-3 py-2 text-sm font-medium ${
                  chatMode === "session"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground"
                } disabled:opacity-60`}
              >
                Session Memory
              </button>
            </div>

            <label className="grid gap-1 text-sm text-muted">
              Session Id
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  value={sessionId}
                  onChange={(event) => onSessionIdChange(event.target.value)}
                  disabled={disabled || chatMode !== "session"}
                  className="border border-border bg-background px-3 py-2 text-foreground disabled:opacity-60"
                  placeholder="session-..."
                />
                <button
                  type="button"
                  onClick={onNewSession}
                  disabled={disabled || chatMode !== "session"}
                  className="border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-60"
                >
                  New
                </button>
              </div>
            </label>
          </div>
        </section>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <section className="border border-border bg-background p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Document Filter</p>
          <p className="mb-2 text-sm text-muted">Optional. Leave unselected to search every document in the project.</p>

          <div className="max-h-40 space-y-1 overflow-y-auto border border-border bg-surface p-2">
            {selectedProjectId.trim().length === 0 ? (
              <p className="text-sm text-muted">Select a project to load documents.</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted">
                {isLoadingDocuments ? "Loading documents..." : "No documents found in this project."}
              </p>
            ) : (
              documents.map((document) => {
                const checked = selectedDocumentIds.includes(document.id)
                return (
                  <label key={document.id} className="flex items-start gap-2 border border-border bg-background px-2 py-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onToggleDocument(document.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0 text-sm text-foreground">
                      <span className="block truncate font-medium">{document.name}</span>
                      <span className="text-xs text-muted">{document.chunk_count} chunk(s)</span>
                    </span>
                  </label>
                )
              })
            )}
          </div>
        </section>

        <section className="border border-border bg-background p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Retrieval + Model Settings</p>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-muted">
              Top K
              <input
                type="number"
                min={1}
                max={50}
                value={topK}
                disabled={disabled}
                onChange={(event) => onTopKChange(parseNumericInput(event.target.value))}
                className="border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <label className="grid gap-1 text-sm text-muted">
              Dense Top K
              <input
                type="number"
                min={1}
                max={100}
                value={denseTopK}
                disabled={disabled}
                onChange={(event) => onDenseTopKChange(parseNumericInput(event.target.value))}
                className="border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <label className="grid gap-1 text-sm text-muted">
              Sparse Top K
              <input
                type="number"
                min={1}
                max={100}
                value={sparseTopK}
                disabled={disabled}
                onChange={(event) => onSparseTopKChange(parseNumericInput(event.target.value))}
                className="border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <label className="grid gap-1 text-sm text-muted">
              Dense Weight
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={denseWeight}
                disabled={disabled}
                onChange={(event) => onDenseWeightChange(parseNumericInput(event.target.value))}
                className="border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <label className="grid gap-1 text-sm text-muted">
              History Window
              <input
                type="number"
                min={0}
                max={40}
                value={historyWindowMessages}
                disabled={disabled}
                onChange={(event) => onHistoryWindowMessagesChange(parseNumericInput(event.target.value))}
                className="border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <div className="grid gap-1 text-sm text-muted">
              <p>Streaming</p>
              <p className="border border-border bg-surface px-3 py-2 text-foreground">Enabled (incremental rendering)</p>
            </div>
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-muted">
              Chat Model Override
              <input
                value={chatModelOverride}
                onChange={(event) => onChatModelOverrideChange(event.target.value)}
                disabled={disabled}
                placeholder="optional"
                className="border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <label className="grid gap-1 text-sm text-muted">
              Embedding Model Override
              <input
                value={embeddingModelOverride}
                onChange={(event) => onEmbeddingModelOverrideChange(event.target.value)}
                disabled={disabled}
                placeholder="optional"
                className="border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
          </div>
        </section>
      </div>
    </SectionCard>
  )
}
