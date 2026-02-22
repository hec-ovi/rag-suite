import type { ChunkModeSelection, ContextModeSelection, PipelineAutomationFlags, ProjectRecord } from "../../types/pipeline"
import { SectionCard } from "../ui/SectionCard"

interface AutoIngestionPanelProps {
  projects: ProjectRecord[]
  selectedProjectId: string
  projectNameDraft: string
  fileName: string
  rawText: string
  automation: PipelineAutomationFlags
  chunkMode: ChunkModeSelection
  contextMode: ContextModeSelection
  statusMessage: string
  errorMessage: string
  isBusy: boolean
  isVectorizing: boolean
  onProjectNameDraftChange: (value: string) => void
  onProjectCreate: () => Promise<void>
  onProjectSelect: (projectId: string) => void
  onFileNameChange: (value: string) => void
  onRawTextChange: (value: string) => void
  onFileSelect: (file: File) => Promise<void>
  onAutomationFlagChange: (key: "normalize_text" | "agentic_chunking" | "contextual_headers", value: boolean) => void
  onChunkModeChange: (mode: ChunkModeSelection) => void
  onContextModeChange: (mode: ContextModeSelection) => void
  onAutomaticIngest: () => Promise<void>
}

export function AutoIngestionPanel({
  projects,
  selectedProjectId,
  projectNameDraft,
  fileName,
  rawText,
  automation,
  chunkMode,
  contextMode,
  statusMessage,
  errorMessage,
  isBusy,
  isVectorizing,
  onProjectNameDraftChange,
  onProjectCreate,
  onProjectSelect,
  onFileNameChange,
  onRawTextChange,
  onFileSelect,
  onAutomationFlagChange,
  onChunkModeChange,
  onContextModeChange,
  onAutomaticIngest,
}: AutoIngestionPanelProps) {
  const projectReady = selectedProjectId.length > 0
  const sourceReady = rawText.trim().length > 0
  const canCreate = projectNameDraft.trim().length >= 2
  const canIngest = projectReady && sourceReady && chunkMode !== "" && contextMode !== ""

  return (
    <section className="space-y-4">
      <SectionCard title="AUTOMATED/CLASSIC" subtitle="">
        <div className="grid gap-3 md:grid-cols-2">
          <section className="border border-border bg-background p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Existing Project</p>
            <select
              value={selectedProjectId}
              onChange={(event) => onProjectSelect(event.target.value)}
              className="w-full border border-border bg-background px-3 py-2 text-foreground"
            >
              <option value="">Select project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </section>

          <section className="border border-border bg-background p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Create Project</p>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={projectNameDraft}
                onChange={(event) => onProjectNameDraftChange(event.target.value)}
                className="border border-border bg-background px-3 py-2 text-foreground"
                placeholder="Project name"
              />
              <button
                type="button"
                onClick={onProjectCreate}
                disabled={isBusy || !canCreate}
                className="bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                Create
              </button>
            </div>
          </section>
        </div>

        <section className="mt-3 border border-border bg-background p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Source</p>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <label
              className={`inline-flex items-center gap-2 border border-border px-3 py-2 text-sm font-medium ${
                isBusy || !projectReady
                  ? "cursor-not-allowed bg-background text-muted"
                  : "cursor-pointer bg-surface text-foreground"
              }`}
            >
              <input
                type="file"
                accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file !== undefined) {
                    void onFileSelect(file)
                  }
                }}
                disabled={isBusy || !projectReady}
                className="hidden"
              />
              Upload
            </label>
            <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-sm text-muted">
              Source name
              <input
                value={fileName}
                onChange={(event) => onFileNameChange(event.target.value)}
                disabled={isBusy || !projectReady}
                className="border border-border bg-background px-3 py-2 text-foreground"
                placeholder="Untitled Document"
              />
            </label>
          </div>
          <textarea
            value={rawText}
            onChange={(event) => onRawTextChange(event.target.value)}
            disabled={isBusy || !projectReady}
            className="h-40 w-full border border-border bg-background p-3 font-mono text-sm text-foreground"
            placeholder="Paste source text..."
          />
        </section>

        <section className="mt-3 grid gap-3 md:grid-cols-3">
          <fieldset className="border border-border bg-background p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">Normalization</legend>
            <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="auto-normalization"
                checked={automation.normalize_text}
                onChange={() => onAutomationFlagChange("normalize_text", true)}
              />
              Enabled
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="auto-normalization"
                checked={!automation.normalize_text}
                onChange={() => onAutomationFlagChange("normalize_text", false)}
              />
              Disabled
            </label>
          </fieldset>

          <fieldset className="border border-border bg-background p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">Chunk Mode</legend>
            <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="auto-chunk-mode"
                checked={chunkMode === "deterministic"}
                onChange={() => onChunkModeChange("deterministic")}
              />
              Deterministic
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="auto-chunk-mode"
                checked={chunkMode === "agentic"}
                onChange={() => onChunkModeChange("agentic")}
              />
              Agentic (drastically increases time on big data)
            </label>
          </fieldset>

          <fieldset className="border border-border bg-background p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Context-Aware Retrieval
            </legend>
            <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="auto-context-mode"
                checked={contextMode === "disabled"}
                onChange={() => {
                  onContextModeChange("disabled")
                  onAutomationFlagChange("contextual_headers", false)
                }}
              />
              Disabled
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="auto-context-mode"
                checked={contextMode === "template"}
                onChange={() => {
                  onContextModeChange("template")
                  onAutomationFlagChange("contextual_headers", true)
                }}
              />
              Template
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="auto-context-mode"
                checked={contextMode === "llm"}
                onChange={() => {
                  onContextModeChange("llm")
                  onAutomationFlagChange("contextual_headers", true)
                }}
              />
              Agentic (drastically increases time on big data)
            </label>
          </fieldset>
        </section>

        <button
          type="button"
          onClick={onAutomaticIngest}
          disabled={isBusy || !canIngest}
          className="mt-3 w-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Vectorize
        </button>

        {isVectorizing ? (
          <div className="mt-3 border border-border bg-background px-3 py-2">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 animate-spin border border-primary border-t-transparent"
              />
              <p className="text-sm font-semibold text-foreground">Vectorization in progress...</p>
            </div>
          </div>
        ) : null}

        <div className="mt-3 border border-border bg-background px-3 py-2">
          <p className="font-mono text-xs text-muted">{statusMessage}</p>
          {errorMessage.length > 0 ? <p className="mt-1 font-mono text-xs text-danger">Error: {errorMessage}</p> : null}
        </div>
      </SectionCard>
    </section>
  )
}
