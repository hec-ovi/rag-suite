import type { PipelineAutomationFlags, ProjectRecord } from "../../types/pipeline"
import { IngestionActionsPanel } from "./IngestionActionsPanel"
import { ProjectPanel } from "./ProjectPanel"
import { SourceEditorPanel } from "./SourceEditorPanel"
import { SectionCard } from "../ui/SectionCard"

interface AutoIngestionPanelProps {
  projects: ProjectRecord[]
  selectedProjectId: string
  projectNameDraft: string
  fileName: string
  rawText: string
  automation: PipelineAutomationFlags
  llmModel: string
  embeddingModel: string
  statusMessage: string
  errorMessage: string
  isBusy: boolean
  onProjectNameDraftChange: (value: string) => void
  onProjectCreate: () => Promise<void>
  onProjectSelect: (projectId: string) => void
  onRawTextChange: (value: string) => void
  onFileSelect: (file: File) => Promise<void>
  onAutomationFlagChange: (key: "normalize_text" | "agentic_chunking" | "contextual_headers", value: boolean) => void
  onLlmModelChange: (value: string) => void
  onEmbeddingModelChange: (value: string) => void
  onAutomaticPreview: () => Promise<void>
  onManualIngest: () => Promise<void>
  onAutomaticIngest: () => Promise<void>
}

export function AutoIngestionPanel({
  projects,
  selectedProjectId,
  projectNameDraft,
  fileName,
  rawText,
  automation,
  llmModel,
  embeddingModel,
  statusMessage,
  errorMessage,
  isBusy,
  onProjectNameDraftChange,
  onProjectCreate,
  onProjectSelect,
  onRawTextChange,
  onFileSelect,
  onAutomationFlagChange,
  onLlmModelChange,
  onEmbeddingModelChange,
  onAutomaticPreview,
  onManualIngest,
  onAutomaticIngest,
}: AutoIngestionPanelProps) {
  const projectReady = selectedProjectId.length > 0

  return (
    <section className="space-y-4">
      <SectionCard
        title="Auto-Ingest Mode"
        subtitle="One-shot path. Configure flags and run preview or full ingestion after project + source setup."
      >
        <p className="font-mono text-xs text-muted">Flow: Project -&gt; Source -&gt; Auto Preview -&gt; Auto Ingest</p>
      </SectionCard>

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
        projectReady={projectReady}
      />

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
        title="Auto Controls"
        subtitle="Use automation flags, then preview or ingest directly."
      />
    </section>
  )
}
