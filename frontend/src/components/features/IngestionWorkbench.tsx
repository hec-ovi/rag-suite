import { useMemo, useState } from "react"

import type {
  ChunkMode,
  ChunkProposal,
  ContextMode,
  ContextualizedChunk,
  PipelineAutomationFlags,
  ProjectRecord,
} from "../../types/pipeline"
import { ChunkReviewPanel } from "./ChunkReviewPanel"
import { ContextReviewPanel } from "./ContextReviewPanel"
import { IngestionActionsPanel } from "./IngestionActionsPanel"
import { NormalizationPanel } from "./NormalizationPanel"
import { ProjectPanel } from "./ProjectPanel"
import { SourceEditorPanel } from "./SourceEditorPanel"

type IngestionTabId = "setup" | "normalize" | "chunk" | "context" | "manual" | "auto"

interface IngestionWorkbenchProps {
  projects: ProjectRecord[]
  selectedProjectId: string
  projectNameDraft: string
  fileName: string
  rawText: string
  normalizedText: string
  chunks: ChunkProposal[]
  contextualizedChunks: ContextualizedChunk[]
  chunkMode: ChunkMode
  contextMode: ContextMode
  chunkOptions: {
    maxChunkChars: number
    minChunkChars: number
    overlapChars: number
  }
  automation: PipelineAutomationFlags
  llmModel: string
  embeddingModel: string
  statusMessage: string
  errorMessage: string
  diffLines: Array<{ kind: "added" | "removed" | "unchanged"; text: string }>
  isBusy: boolean
  onProjectNameDraftChange: (value: string) => void
  onProjectCreate: () => Promise<void>
  onProjectSelect: (projectId: string) => void
  onRawTextChange: (value: string) => void
  onFileSelect: (file: File) => Promise<void>
  onNormalize: () => Promise<void>
  onChunkModeChange: (mode: ChunkMode) => void
  onChunkOptionsChange: (options: { maxChunkChars: number; minChunkChars: number; overlapChars: number }) => void
  onRunChunking: () => Promise<void>
  onContextModeChange: (mode: ContextMode) => void
  onContextualizedChunksChange: (chunks: ContextualizedChunk[]) => void
  onRunContextualization: () => Promise<void>
  onAutomationFlagChange: (key: "normalize_text" | "agentic_chunking" | "contextual_headers", value: boolean) => void
  onLlmModelChange: (value: string) => void
  onEmbeddingModelChange: (value: string) => void
  onAutomaticPreview: () => Promise<void>
  onManualIngest: () => Promise<void>
  onAutomaticIngest: () => Promise<void>
}

const tabOrder: IngestionTabId[] = ["setup", "normalize", "chunk", "context", "manual", "auto"]

const tabLabels: Record<IngestionTabId, string> = {
  setup: "1. Setup",
  normalize: "2. Normalize",
  chunk: "3. Chunk",
  context: "4. Context",
  manual: "5. Manual Ingest",
  auto: "Auto",
}

const tabHint: Record<IngestionTabId, string> = {
  setup: "Create/select project and load raw text.",
  normalize: "Clean text deterministically before splitting.",
  chunk: "Set boundaries and review chunk rationale.",
  context: "Add context headers before embedding.",
  manual: "Persist reviewed chunks manually.",
  auto: "Run full automatic pipeline in one shot.",
}

function nextTab(current: IngestionTabId): IngestionTabId {
  const index = tabOrder.indexOf(current)
  if (index < 0 || index >= tabOrder.length - 1) {
    return current
  }
  return tabOrder[index + 1]
}

function previousTab(current: IngestionTabId): IngestionTabId {
  const index = tabOrder.indexOf(current)
  if (index <= 0) {
    return current
  }
  return tabOrder[index - 1]
}

export function IngestionWorkbench({
  projects,
  selectedProjectId,
  projectNameDraft,
  fileName,
  rawText,
  normalizedText,
  chunks,
  contextualizedChunks,
  chunkMode,
  contextMode,
  chunkOptions,
  automation,
  llmModel,
  embeddingModel,
  statusMessage,
  errorMessage,
  diffLines,
  isBusy,
  onProjectNameDraftChange,
  onProjectCreate,
  onProjectSelect,
  onRawTextChange,
  onFileSelect,
  onNormalize,
  onChunkModeChange,
  onChunkOptionsChange,
  onRunChunking,
  onContextModeChange,
  onContextualizedChunksChange,
  onRunContextualization,
  onAutomationFlagChange,
  onLlmModelChange,
  onEmbeddingModelChange,
  onAutomaticPreview,
  onManualIngest,
  onAutomaticIngest,
}: IngestionWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<IngestionTabId>("setup")

  const progressLabel = useMemo(() => {
    if (activeTab === "auto") {
      return "Auto mode selected."
    }
    return "Flow: Setup -> Normalize -> Chunk -> Context -> Manual Ingest"
  }, [activeTab])

  const hasPrevious = tabOrder.indexOf(activeTab) > 0
  const hasNext = tabOrder.indexOf(activeTab) < tabOrder.length - 1

  return (
    <section className="space-y-4">
      <section className="border border-border bg-surface p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {tabOrder.map((tabId) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={`border px-3 py-2 text-sm font-semibold ${
                activeTab === tabId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-surface"
              }`}
            >
              {tabLabels[tabId]}
            </button>
          ))}
        </div>
        <p className="font-mono text-xs text-muted">{progressLabel}</p>
        <p className="text-sm text-foreground">{tabHint[activeTab]}</p>
      </section>

      {activeTab === "setup" ? (
        <>
          <ProjectPanel
            projects={projects}
            selectedProjectId={selectedProjectId}
            projectNameDraft={projectNameDraft}
            onProjectNameDraftChange={onProjectNameDraftChange}
            onProjectCreate={onProjectCreate}
            onProjectSelect={onProjectSelect}
            disabled={isBusy}
          />
          <SourceEditorPanel
            fileName={fileName}
            rawText={rawText}
            onRawTextChange={onRawTextChange}
            onFileSelect={onFileSelect}
            disabled={isBusy}
          />
        </>
      ) : null}

      {activeTab === "normalize" ? (
        <NormalizationPanel normalizedText={normalizedText} diffLines={diffLines} onNormalize={onNormalize} disabled={isBusy} />
      ) : null}

      {activeTab === "chunk" ? (
        <ChunkReviewPanel
          chunkMode={chunkMode}
          chunkOptions={chunkOptions}
          chunks={chunks}
          onChunkModeChange={onChunkModeChange}
          onChunkOptionsChange={onChunkOptionsChange}
          onRunChunking={onRunChunking}
          disabled={isBusy}
        />
      ) : null}

      {activeTab === "context" ? (
        <ContextReviewPanel
          contextMode={contextMode}
          contextualizedChunks={contextualizedChunks}
          onContextModeChange={onContextModeChange}
          onContextualizedChunksChange={onContextualizedChunksChange}
          onRunContextualization={onRunContextualization}
          disabled={isBusy}
        />
      ) : null}

      {activeTab === "manual" ? (
        <IngestionActionsPanel
          automation={automation}
          llmModel={llmModel}
          embeddingModel={embeddingModel}
          statusMessage={statusMessage}
          errorMessage={errorMessage}
          onAutomationFlagChange={onAutomationFlagChange}
          onLlmModelChange={onLlmModelChange}
          onEmbeddingModelChange={onEmbeddingModelChange}
          onAutomaticPreview={onAutomaticPreview}
          onManualIngest={onManualIngest}
          onAutomaticIngest={onAutomaticIngest}
          disabled={isBusy}
          mode="manual"
          title="Manual Ingestion"
          subtitle="Approve and persist reviewed chunks into Qdrant."
        />
      ) : null}

      {activeTab === "auto" ? (
        <IngestionActionsPanel
          automation={automation}
          llmModel={llmModel}
          embeddingModel={embeddingModel}
          statusMessage={statusMessage}
          errorMessage={errorMessage}
          onAutomationFlagChange={onAutomationFlagChange}
          onLlmModelChange={onLlmModelChange}
          onEmbeddingModelChange={onEmbeddingModelChange}
          onAutomaticPreview={onAutomaticPreview}
          onManualIngest={onManualIngest}
          onAutomaticIngest={onAutomaticIngest}
          disabled={isBusy}
          mode="automatic"
          title="Automatic Ingestion"
          subtitle="Set automation flags and run preview or one-shot ingestion."
        />
      ) : null}

      <section className="flex items-center justify-between border border-border bg-surface px-3 py-2">
        <button
          type="button"
          onClick={() => setActiveTab(previousTab(activeTab))}
          disabled={!hasPrevious}
          className="border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-40"
        >
          Previous
        </button>
        <p className="font-mono text-xs text-muted">{tabLabels[activeTab]}</p>
        <button
          type="button"
          onClick={() => setActiveTab(nextTab(activeTab))}
          disabled={!hasNext}
          className="border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-40"
        >
          Next
        </button>
      </section>
    </section>
  )
}
