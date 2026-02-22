import { useMemo, useState } from "react"

import type {
  ChunkModeSelection,
  ChunkProposal,
  ContextModeSelection,
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
  normalizationEnabled: boolean
  chunks: ChunkProposal[]
  contextualizedChunks: ContextualizedChunk[]
  chunkMode: ChunkModeSelection
  contextMode: ContextModeSelection
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
  isChunking: boolean
  isContextualizing: boolean
  isVectorizing: boolean
  onProjectNameDraftChange: (value: string) => void
  onProjectCreate: () => Promise<void>
  onProjectSelect: (projectId: string) => void
  onFileNameChange: (value: string) => void
  onRawTextChange: (value: string) => void
  onFileSelect: (file: File) => Promise<void>
  onToggleNormalization: () => Promise<void>
  onChunksChange: (chunks: ChunkProposal[]) => void
  onChunkOptionsChange: (options: { maxChunkChars: number; minChunkChars: number; overlapChars: number }) => void
  onRunChunking: (mode?: ChunkModeSelection) => Promise<void>
  onInterruptChunking: () => Promise<void>
  onContextualizedChunksChange: (chunks: ContextualizedChunk[]) => void
  onRunContextualization: (mode?: ContextModeSelection) => Promise<void>
  onInterruptContextualization: () => Promise<void>
  onAutomationFlagChange: (key: "normalize_text" | "agentic_chunking" | "contextual_headers", value: boolean) => void
  onLlmModelChange: (value: string) => void
  onEmbeddingModelChange: (value: string) => void
  onAutomaticPreview: () => Promise<void>
  onManualIngest: () => Promise<void>
  onAutomaticIngest: () => Promise<void>
  onInterruptVectorization: () => Promise<void>
}

const tabOrder: IngestionTabId[] = ["project", "source", "normalize", "chunk", "context", "manual"]

const tabLabels: Record<IngestionTabId, string> = {
  project: "1. Project",
  source: "2. Source",
  normalize: "3. Normalize",
  chunk: "4. Chunk",
  context: "5. Context Retrieval Mode",
  manual: "6. HITL Vectorize",
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
  normalizationEnabled,
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
  isChunking,
  isContextualizing,
  isVectorizing,
  onProjectNameDraftChange,
  onProjectCreate,
  onProjectSelect,
  onFileNameChange,
  onRawTextChange,
  onFileSelect,
  onToggleNormalization,
  onChunksChange,
  onChunkOptionsChange,
  onRunChunking,
  onInterruptChunking,
  onContextualizedChunksChange,
  onRunContextualization,
  onInterruptContextualization,
  onAutomationFlagChange,
  onLlmModelChange,
  onEmbeddingModelChange,
  onAutomaticPreview,
  onManualIngest,
  onAutomaticIngest,
  onInterruptVectorization,
}: IngestionWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<IngestionTabId>("project")
  const projectReady = selectedProjectId.length > 0
  const selectedProjectName =
    projects.find((project) => project.id === selectedProjectId)?.name ??
    ""
  const sourceReady = rawText.trim().length > 0
  const chunkModeSelected = chunkMode !== ""
  const contextModeSelected = contextMode !== ""
  const contextDisabled = contextMode === "disabled"
  const contextReady = contextDisabled ? chunks.length > 0 : contextModeSelected && contextualizedChunks.length > 0

  const hasPrevious = tabOrder.indexOf(activeTab) > 0
  const hasNext = tabOrder.indexOf(activeTab) < tabOrder.length - 1
  const tabUnlocked: Record<IngestionTabId, boolean> = {
    project: true,
    source: projectReady,
    normalize: projectReady && sourceReady,
    chunk: projectReady && sourceReady,
    context: projectReady && sourceReady && chunkModeSelected && chunks.length > 0,
    manual: projectReady && sourceReady && chunkModeSelected && chunks.length > 0 && contextReady,
  }
  const canGoNext = useMemo(() => {
    if (activeTab === "project") {
      return projectReady
    }
    if (activeTab === "source") {
      return sourceReady
    }
    if (activeTab === "normalize") {
      return sourceReady
    }
    if (activeTab === "chunk") {
      return chunkModeSelected && chunks.length > 0
    }
    if (activeTab === "context") {
      return contextReady
    }
    return false
  }, [activeTab, chunkModeSelected, chunks.length, contextReady, projectReady, sourceReady])

  return (
    <section className="space-y-4">
      <section className="border border-border bg-surface p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {tabOrder.map((tabId) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                disabled={!tabUnlocked[tabId] && activeTab !== tabId}
                className={`border px-3 py-2 text-sm font-semibold ${
                  activeTab === tabId
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-surface"
                } disabled:opacity-40`}
              >
                {tabLabels[tabId]}
              </button>
            ))}
          </div>

          <p className="border border-border bg-background px-3 py-2 font-mono text-xs text-foreground">
            Project: {projectReady ? selectedProjectName : "Not selected"}
          </p>
        </div>
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
          onFileNameChange={onFileNameChange}
          rawText={rawText}
          onRawTextChange={onRawTextChange}
          onFileSelect={onFileSelect}
          statusMessage={statusMessage}
          errorMessage={errorMessage}
          disabled={isBusy}
          projectReady={projectReady}
        />
      ) : null}

      {activeTab === "normalize" ? (
        <NormalizationPanel
          rawText={rawText}
          normalizationEnabled={normalizationEnabled}
          diffLines={diffLines}
          onToggleNormalization={onToggleNormalization}
          disabled={isBusy}
        />
      ) : null}

      {activeTab === "chunk" ? (
        <ChunkReviewPanel
          chunkMode={chunkMode}
          chunkOptions={chunkOptions}
          chunks={chunks}
          onChunksChange={onChunksChange}
          onChunkOptionsChange={onChunkOptionsChange}
          onRunChunking={onRunChunking}
          onInterruptChunking={onInterruptChunking}
          statusMessage={statusMessage}
          errorMessage={errorMessage}
          disabled={isBusy}
          isChunking={isChunking}
        />
      ) : null}

      {activeTab === "context" ? (
        <ContextReviewPanel
          contextMode={contextMode}
          chunks={chunks}
          contextualizedChunks={contextualizedChunks}
          onChunksChange={onChunksChange}
          onContextualizedChunksChange={onContextualizedChunksChange}
          onRunContextualization={onRunContextualization}
          onInterruptContextualization={onInterruptContextualization}
          statusMessage={statusMessage}
          errorMessage={errorMessage}
          disabled={isBusy}
          isContextualizing={isContextualizing}
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
          onInterruptVectorization={onInterruptVectorization}
          disabled={isBusy}
          isVectorizing={isVectorizing}
          mode="manual"
          title="STEP 6 - HITL Vectorize"
          subtitle="Persist reviewed chunks into Qdrant."
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
        <button
          type="button"
          onClick={() => setActiveTab(nextTab(activeTab))}
          disabled={!hasNext || !canGoNext || isBusy}
          className="border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-40"
        >
          Next
        </button>
      </section>
    </section>
  )
}
