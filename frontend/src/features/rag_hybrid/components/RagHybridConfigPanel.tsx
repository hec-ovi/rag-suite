import { useEffect, useState } from "react"

interface RagHybridConfigPanelProps {
  isOpen: boolean
  onClose: () => void

  projects: Array<{ id: string; name: string }>
  selectedProjectId: string
  onProjectSelect: (projectId: string) => void

  documents: Array<{ id: string; name: string; chunk_count: number }>
  selectedDocumentIds: string[]
  onToggleDocument: (documentId: string) => void

  topK: number
  denseTopK: number
  sparseTopK: number
  denseWeight: number
  historyWindowMessages: number
  chatModelOverride: string
  embeddingModelOverride: string
  onApplyAdvancedSettings: (settings: {
    topK: number
    denseTopK: number
    sparseTopK: number
    denseWeight: number
    historyWindowMessages: number
    chatModelOverride: string
    embeddingModelOverride: string
  }) => void

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
  isOpen,
  onClose,
  projects,
  selectedProjectId,
  onProjectSelect,
  documents,
  selectedDocumentIds,
  onToggleDocument,
  topK,
  denseTopK,
  sparseTopK,
  denseWeight,
  historyWindowMessages,
  chatModelOverride,
  embeddingModelOverride,
  onApplyAdvancedSettings,
  isLoadingProjects,
  isLoadingDocuments,
  disabled,
}: RagHybridConfigPanelProps) {
  const [draftTopK, setDraftTopK] = useState(topK)
  const [draftDenseTopK, setDraftDenseTopK] = useState(denseTopK)
  const [draftSparseTopK, setDraftSparseTopK] = useState(sparseTopK)
  const [draftDenseWeight, setDraftDenseWeight] = useState(denseWeight)
  const [draftHistoryWindow, setDraftHistoryWindow] = useState(historyWindowMessages)
  const [draftChatModel, setDraftChatModel] = useState(chatModelOverride)
  const [draftEmbeddingModel, setDraftEmbeddingModel] = useState(embeddingModelOverride)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setDraftTopK(topK)
    setDraftDenseTopK(denseTopK)
    setDraftSparseTopK(sparseTopK)
    setDraftDenseWeight(denseWeight)
    setDraftHistoryWindow(historyWindowMessages)
    setDraftChatModel(chatModelOverride)
    setDraftEmbeddingModel(embeddingModelOverride)
  }, [
    isOpen,
    topK,
    denseTopK,
    sparseTopK,
    denseWeight,
    historyWindowMessages,
    chatModelOverride,
    embeddingModelOverride,
  ])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/45 p-4">
      <div className="w-full max-w-3xl border border-border bg-surface shadow-xl">
        <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Chat Settings</h2>
            <p className="text-sm text-muted">Project scope and retrieval configuration.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground"
          >
            Close
          </button>
        </header>

        <div className="max-h-[80vh] overflow-y-auto p-4">
          <form className="grid gap-3">
            <section className="border border-border bg-background p-3">
              <label className="grid gap-1 text-sm text-muted">
                <span className="font-medium text-foreground">Project</span>
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

            <details className="border border-border bg-background p-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                Documents ({selectedDocumentIds.length} selected)
              </summary>
              <div className="mt-3 max-h-52 space-y-1 overflow-y-auto pr-1">
                {selectedProjectId.trim().length === 0 ? (
                  <p className="text-sm text-muted">Select a project first.</p>
                ) : isLoadingDocuments ? (
                  <p className="text-sm text-muted">Loading documents...</p>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-muted">No documents in this project.</p>
                ) : (
                  documents.map((document) => {
                    const checked = selectedDocumentIds.includes(document.id)
                    return (
                      <label
                        key={document.id}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border border-border bg-surface px-2 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => onToggleDocument(document.id)}
                        />
                        <span className="min-w-0 text-sm text-foreground">
                          <span className="block truncate">{document.name}</span>
                        </span>
                        <span className="text-xs text-muted">{document.chunk_count} chunks</span>
                      </label>
                    )
                  })
                )}
              </div>
            </details>

            <details className="border border-border bg-background p-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">Advanced Settings</summary>
              <div className="mt-3 grid gap-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="grid gap-1 text-sm text-muted">
                    <span className="font-medium text-foreground">Top K</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={draftTopK}
                      onChange={(event) => setDraftTopK(parseNumericInput(event.target.value))}
                      disabled={disabled}
                      className="border border-border bg-background px-3 py-2 text-foreground"
                    />
                  </label>

                  <label className="grid gap-1 text-sm text-muted">
                    <span className="font-medium text-foreground">Dense Top K</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={draftDenseTopK}
                      onChange={(event) => setDraftDenseTopK(parseNumericInput(event.target.value))}
                      disabled={disabled}
                      className="border border-border bg-background px-3 py-2 text-foreground"
                    />
                  </label>

                  <label className="grid gap-1 text-sm text-muted">
                    <span className="font-medium text-foreground">Sparse Top K</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={draftSparseTopK}
                      onChange={(event) => setDraftSparseTopK(parseNumericInput(event.target.value))}
                      disabled={disabled}
                      className="border border-border bg-background px-3 py-2 text-foreground"
                    />
                  </label>

                  <label className="grid gap-1 text-sm text-muted">
                    <span className="font-medium text-foreground">Dense Weight</span>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={draftDenseWeight}
                      onChange={(event) => setDraftDenseWeight(parseNumericInput(event.target.value))}
                      disabled={disabled}
                      className="border border-border bg-background px-3 py-2 text-foreground"
                    />
                  </label>

                  <label className="grid gap-1 text-sm text-muted">
                    <span className="font-medium text-foreground">History Window</span>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={draftHistoryWindow}
                      onChange={(event) => setDraftHistoryWindow(parseNumericInput(event.target.value))}
                      disabled={disabled}
                      className="border border-border bg-background px-3 py-2 text-foreground"
                    />
                  </label>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <label className="grid gap-1 text-sm text-muted">
                    <span className="font-medium text-foreground">Chat Model Override</span>
                    <input
                      value={draftChatModel}
                      onChange={(event) => setDraftChatModel(event.target.value)}
                      disabled={disabled}
                      placeholder="optional"
                      className="border border-border bg-background px-3 py-2 text-foreground"
                    />
                  </label>

                  <label className="grid gap-1 text-sm text-muted">
                    <span className="font-medium text-foreground">Embedding Model Override</span>
                    <input
                      value={draftEmbeddingModel}
                      onChange={(event) => setDraftEmbeddingModel(event.target.value)}
                      disabled={disabled}
                      placeholder="optional"
                      className="border border-border bg-background px-3 py-2 text-foreground"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onApplyAdvancedSettings({
                        topK: draftTopK,
                        denseTopK: draftDenseTopK,
                        sparseTopK: draftSparseTopK,
                        denseWeight: draftDenseWeight,
                        historyWindowMessages: draftHistoryWindow,
                        chatModelOverride: draftChatModel,
                        embeddingModelOverride: draftEmbeddingModel,
                      })
                    }
                    className="bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </details>
          </form>
        </div>
      </div>

      <button type="button" className="absolute inset-0 -z-10" onClick={onClose} aria-label="Close settings overlay" />
    </div>
  )
}
