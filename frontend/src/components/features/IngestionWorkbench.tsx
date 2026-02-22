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

type IngestionTabId = "project" | "source" | "normalize" | "chunk" | "context" | "manual"

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

const tabOrder: IngestionTabId[] = ["project", "source", "normalize", "chunk", "context", "manual"]

const tabLabels: Record<IngestionTabId, string> = {
  project: "1. Project",
  source: "2. Source",
  normalize: "3. Normalize",
  chunk: "4. Chunk",
  context: "5. Context",
  manual: "6. Manual Ingest",
}

const tabHint: Record<IngestionTabId, string> = {
  project: "Create or select project namespace first.",
  source: "Load source file/text only after project setup.",
  normalize: "Clean text deterministically before splitting.",
  chunk: "Set boundaries and review chunk rationale.",
  context: "Add context headers before embedding.",
  manual: "Persist reviewed chunks manually.",
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
  const [activeTab, setActiveTab] = useState<IngestionTabId>("project")
  const projectReady = selectedProjectId.length > 0

  const progressLabel = useMemo(() => {
    return "Flow: Project -> Source -> Normalize -> Chunk -> Context -> Manual Ingest"
  }, [])

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

      {activeTab === "project" ? (
        <ProjectPanel
          projects={projects}
          selectedProjectId={selectedProjectId}
          projectNameDraft={projectNameDraft}
          onProjectNameDraftChange={onProjectNameDraftChange}
          onProjectCreate={onProjectCreate}
          onProjectSelect={onProjectSelect}
          disabled={isBusy}
        />
      ) : null}

      {activeTab === "source" ? (
        <SourceEditorPanel
          fileName={fileName}
          rawText={rawText}
          onRawTextChange={onRawTextChange}
          onFileSelect={onFileSelect}
          disabled={isBusy}
          projectReady={projectReady}
        />
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
