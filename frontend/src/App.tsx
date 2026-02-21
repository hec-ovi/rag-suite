import { Footer } from "./components/layout/Footer"
import { Header } from "./components/layout/Header"
import { MainContent } from "./components/layout/MainContent"
import { ChunkReviewPanel } from "./components/features/ChunkReviewPanel"
import { ContextReviewPanel } from "./components/features/ContextReviewPanel"
import { IngestionActionsPanel } from "./components/features/IngestionActionsPanel"
import { NormalizationPanel } from "./components/features/NormalizationPanel"
import { ProjectPanel } from "./components/features/ProjectPanel"
import { ProjectsExplorer } from "./components/features/ProjectsExplorer"
import { SourceEditorPanel } from "./components/features/SourceEditorPanel"
import { useIngestionWorkflow } from "./hooks/useIngestionWorkflow"
import { useThemeMode } from "./hooks/useThemeMode"
import { useNavigationStore } from "./stores/navigation.store"

function App() {
  const { mode, setMode } = useThemeMode()
  const currentView = useNavigationStore((state) => state.currentView)
  const setView = useNavigationStore((state) => state.setView)

  const { state, actions } = useIngestionWorkflow()

  const ingestionView = (
    <>
      <ProjectPanel
        projects={state.projects}
        selectedProjectId={state.selectedProjectId}
        projectNameDraft={state.projectNameDraft}
        onProjectNameDraftChange={actions.setProjectNameDraft}
        onProjectCreate={actions.createProject}
        onProjectSelect={actions.setSelectedProjectId}
        disabled={state.isBusy}
      />

      <SourceEditorPanel
        fileName={state.fileName}
        rawText={state.rawText}
        onRawTextChange={actions.setRawText}
        onFileSelect={actions.handleFileSelected}
        disabled={state.isBusy}
      />

      <NormalizationPanel
        normalizedText={state.normalizedText}
        diffLines={state.diffLines}
        onNormalize={actions.runNormalize}
        disabled={state.isBusy}
      />

      <ChunkReviewPanel
        chunkMode={state.chunkMode}
        chunkOptions={state.chunkOptions}
        chunks={state.chunks}
        onChunkModeChange={actions.setChunkMode}
        onChunkOptionsChange={actions.setChunkOptions}
        onRunChunking={actions.runChunking}
        disabled={state.isBusy}
      />

      <ContextReviewPanel
        contextMode={state.contextMode}
        contextualizedChunks={state.contextualizedChunks}
        onContextModeChange={actions.setContextMode}
        onContextualizedChunksChange={actions.setContextualizedChunks}
        onRunContextualization={actions.runContextualization}
        disabled={state.isBusy}
      />

      <IngestionActionsPanel
        automation={state.automation}
        llmModel={state.llmModel}
        embeddingModel={state.embeddingModel}
        statusMessage={state.statusMessage}
        errorMessage={state.errorMessage}
        onAutomationFlagChange={actions.setAutomationFlag}
        onLlmModelChange={actions.setLlmModel}
        onEmbeddingModelChange={actions.setEmbeddingModel}
        onAutomaticPreview={actions.runAutomaticPreview}
        onManualIngest={actions.runManualIngest}
        onAutomaticIngest={actions.runAutomaticIngest}
        disabled={state.isBusy}
      />
    </>
  )

  const projectsView = <ProjectsExplorer projects={state.projects} />

  return (
    <div className="min-h-screen bg-grid-gradient text-foreground">
      <Header currentView={currentView} onViewChange={setView} themeMode={mode} onThemeModeChange={setMode} />
      <MainContent currentView={currentView} ingestionView={ingestionView} projectsView={projectsView} />
      <Footer />
    </div>
  )
}

export default App
