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

function ModeButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border px-3 py-2 text-sm font-medium ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"
      } disabled:opacity-60`}
    >
      {label}
    </button>
  )
}

function RetrievalNumberField({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  return (
    <label className="grid gap-1 text-sm text-muted">
      <span className="font-medium text-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(parseNumericInput(event.target.value))}
        className="border border-border bg-background px-3 py-2 text-foreground"
      />
    </label>
  )
}

function DocumentSelection({
  selectedProjectId,
  documents,
  selectedDocumentIds,
  disabled,
  isLoadingDocuments,
  onToggleDocument,
}: {
  selectedProjectId: string
  documents: RagDocumentSummary[]
  selectedDocumentIds: string[]
  disabled: boolean
  isLoadingDocuments: boolean
  onToggleDocument: (documentId: string) => void
}) {
  if (selectedProjectId.trim().length === 0) {
    return <p className="text-sm text-muted">Choose a project first.</p>
  }

  if (isLoadingDocuments) {
    return <p className="text-sm text-muted">Loading project documents...</p>
  }

  if (documents.length === 0) {
    return <p className="text-sm text-muted">This project has no documents yet.</p>
  }

  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
      {documents.map((document) => {
        const checked = selectedDocumentIds.includes(document.id)
        return (
          <li key={document.id}>
            <label className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border border-border bg-background px-2 py-2">
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => onToggleDocument(document.id)}
                className="mt-0.5"
              />
              <span className="min-w-0 text-sm text-foreground">
                <span className="block truncate font-medium">{document.name}</span>
                <span className="text-xs text-muted">{document.chunk_count} chunks</span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted">{document.workflow_mode}</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
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
  const selectedCount = selectedDocumentIds.length

  return (
    <SectionCard
      title="Chat Settings"
      subtitle="Set retrieval scope and models before asking questions."
      className="h-full min-h-0 flex flex-col"
      bodyClassName="min-h-0 flex-1 overflow-y-auto pr-1"
      actions={
        <button
          type="button"
          onClick={() => {
            void onRefreshProjects()
          }}
          disabled={disabled}
          className="border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-60"
        >
          Refresh
        </button>
      }
    >
      <div className="grid gap-3">
        <section className="border border-border bg-background p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">1. Project</p>
          <label className="grid gap-1 text-sm text-muted">
            <span className="font-medium text-foreground">Project Namespace</span>
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
          <p className="mt-1 text-xs text-muted">
            {isLoadingProjects ? "Loading projects..." : `${projects.length} project(s) available.`}
          </p>
        </section>

        <section className="border border-border bg-background p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">2. Conversation</p>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <ModeButton
                label="Stateless"
                active={chatMode === "stateless"}
                disabled={disabled}
                onClick={() => onChatModeChange("stateless")}
              />
              <ModeButton
                label="Session"
                active={chatMode === "session"}
                disabled={disabled}
                onClick={() => onChatModeChange("session")}
              />
            </div>

            <label className="grid gap-1 text-sm text-muted">
              <span className="font-medium text-foreground">Session Id</span>
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

        <section className="border border-border bg-background p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">3. Document Scope</p>
            <span className="font-mono text-[11px] text-muted">{selectedCount} selected</span>
          </div>
          <p className="mb-2 text-xs text-muted">No selection means all project documents are searchable.</p>
          <DocumentSelection
            selectedProjectId={selectedProjectId}
            documents={documents}
            selectedDocumentIds={selectedDocumentIds}
            disabled={disabled}
            isLoadingDocuments={isLoadingDocuments}
            onToggleDocument={onToggleDocument}
          />
        </section>

        <section className="border border-border bg-background p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">4. Retrieval Parameters</p>
          <div className="grid gap-2 md:grid-cols-2">
            <RetrievalNumberField
              label="Top K"
              value={topK}
              min={1}
              max={50}
              disabled={disabled}
              onChange={onTopKChange}
            />
            <RetrievalNumberField
              label="Dense Top K"
              value={denseTopK}
              min={1}
              max={100}
              disabled={disabled}
              onChange={onDenseTopKChange}
            />
            <RetrievalNumberField
              label="Sparse Top K"
              value={sparseTopK}
              min={1}
              max={100}
              disabled={disabled}
              onChange={onSparseTopKChange}
            />
            <RetrievalNumberField
              label="Dense Weight"
              value={denseWeight}
              min={0}
              max={1}
              step={0.01}
              disabled={disabled}
              onChange={onDenseWeightChange}
            />
            <RetrievalNumberField
              label="History Window"
              value={historyWindowMessages}
              min={0}
              max={40}
              disabled={disabled}
              onChange={onHistoryWindowMessagesChange}
            />
          </div>
        </section>

        <section className="border border-border bg-background p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">5. Model Overrides</p>
          <div className="grid gap-2">
            <label className="grid gap-1 text-sm text-muted">
              <span className="font-medium text-foreground">Chat Model (Optional)</span>
              <input
                value={chatModelOverride}
                onChange={(event) => onChatModelOverrideChange(event.target.value)}
                disabled={disabled}
                placeholder="gpt-oss:20b"
                className="border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <label className="grid gap-1 text-sm text-muted">
              <span className="font-medium text-foreground">Embedding Model (Optional)</span>
              <input
                value={embeddingModelOverride}
                onChange={(event) => onEmbeddingModelOverrideChange(event.target.value)}
                disabled={disabled}
                placeholder="bge-m3:latest"
                className="border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
          </div>
        </section>
      </div>
    </SectionCard>
  )
}
