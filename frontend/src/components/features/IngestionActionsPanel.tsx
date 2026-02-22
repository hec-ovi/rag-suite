import type { PipelineAutomationFlags } from "../../types/pipeline"
import { SectionCard } from "../ui/SectionCard"

interface IngestionActionsPanelProps {
  automation: PipelineAutomationFlags
  llmModel: string
  embeddingModel: string
  statusMessage: string
  errorMessage: string
  onAutomationFlagChange: (key: "normalize_text" | "agentic_chunking" | "contextual_headers", value: boolean) => void
  onLlmModelChange: (value: string) => void
  onEmbeddingModelChange: (value: string) => void
  onAutomaticPreview: () => Promise<void>
  onManualIngest: () => Promise<void>
  onAutomaticIngest: () => Promise<void>
  disabled: boolean
  isVectorizing: boolean
  mode?: "all" | "manual" | "automatic"
  title?: string
  subtitle?: string
}

export function IngestionActionsPanel({
  automation,
  llmModel,
  embeddingModel,
  statusMessage,
  errorMessage,
  onAutomationFlagChange,
  onLlmModelChange,
  onEmbeddingModelChange,
  onAutomaticPreview,
  onManualIngest,
  onAutomaticIngest,
  disabled,
  isVectorizing,
  mode = "all",
  title = "Execution Controls",
  subtitle = "Run preview or persist chunks into Qdrant using manual or full-auto mode.",
}: IngestionActionsPanelProps) {
  const showAutomationControls = mode !== "manual"
  const showManualAction = mode !== "automatic"
  const showAutomaticActions = mode !== "manual"
  const showLlmOverride = mode !== "manual"

  return (
    <SectionCard title={title} subtitle={subtitle}>
      {showAutomationControls ? (
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <label className="flex items-center justify-between gap-3 border border-border bg-background px-3 py-2 text-sm text-foreground">
            Normalize
            <input
              type="checkbox"
              checked={automation.normalize_text}
              onChange={(event) => onAutomationFlagChange("normalize_text", event.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 border border-border bg-background px-3 py-2 text-sm text-foreground">
            Agentic chunking
            <input
              type="checkbox"
              checked={automation.agentic_chunking}
              onChange={(event) => onAutomationFlagChange("agentic_chunking", event.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 border border-border bg-background px-3 py-2 text-sm text-foreground">
            Context headers
            <input
              type="checkbox"
              checked={automation.contextual_headers}
              onChange={(event) => onAutomationFlagChange("contextual_headers", event.target.checked)}
            />
          </label>
        </div>
      ) : null}

      <div className={`mb-4 grid gap-3 ${showLlmOverride ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
        {showLlmOverride ? (
          <label className="flex flex-col gap-1 text-sm text-muted">
            LLM model override
            <input
              value={llmModel}
              onChange={(event) => onLlmModelChange(event.target.value)}
              placeholder="qwen3:8b"
              className="border border-border bg-background px-3 py-2 text-foreground"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm text-muted">
          Embedding model override
          <input
            value={embeddingModel}
            onChange={(event) => onEmbeddingModelChange(event.target.value)}
            placeholder="bge-m3:latest"
            className="border border-border bg-background px-3 py-2 text-foreground"
          />
          <span className="text-xs text-muted">Default: backend embedding model (`OLLAMA_EMBEDDING_MODEL`).</span>
        </label>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {showAutomaticActions ? (
          <button
            type="button"
            onClick={onAutomaticPreview}
            disabled={disabled}
            className="border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
          >
            Preview automatic pipeline
          </button>
        ) : null}

        {showManualAction ? (
          <button
            type="button"
            onClick={onManualIngest}
            disabled={disabled}
            className="bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Vectorize data
          </button>
        ) : null}

        {showAutomaticActions ? (
          <button
            type="button"
            onClick={onAutomaticIngest}
            disabled={disabled}
            className="border border-border bg-primary/10 px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
          >
            Vectorize full automatic mode
          </button>
        ) : null}
      </div>

      {isVectorizing ? (
        <div className="mb-3 border border-border bg-background px-3 py-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 animate-spin border border-primary border-t-transparent"
            />
            <p className="text-sm font-semibold text-foreground">Vectorization in progress...</p>
          </div>
        </div>
      ) : null}

      <div className="border border-border bg-background px-3 py-2">
        <p className="font-mono text-xs text-muted">{statusMessage}</p>
        {errorMessage.length > 0 ? <p className="mt-1 font-mono text-xs text-danger">Error: {errorMessage}</p> : null}
      </div>
    </SectionCard>
  )
}
