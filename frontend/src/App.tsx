import { AutoIngestionPanel } from "./components/features/AutoIngestionPanel"
import { Footer } from "./components/layout/Footer"
import { Header } from "./components/layout/Header"
import { MainContent } from "./components/layout/MainContent"
import { IngestionWorkbench } from "./components/features/IngestionWorkbench"
import { ProjectsExplorer } from "./components/features/ProjectsExplorer"
import { StartGuidePanel } from "./components/features/StartGuidePanel"
import { useIngestionWorkflow } from "./hooks/useIngestionWorkflow"
import { useThemeMode } from "./hooks/useThemeMode"
import { useNavigationStore } from "./stores/navigation.store"

function App() {
  const { mode, setMode } = useThemeMode()
  const currentView = useNavigationStore((state) => state.currentView)
  const setView = useNavigationStore((state) => state.setView)

  const { state, actions } = useIngestionWorkflow()

  const ingestionView = (
    <IngestionWorkbench
      projects={state.projects}
      selectedProjectId={state.selectedProjectId}
      projectNameDraft={state.projectNameDraft}
      fileName={state.fileName}
      rawText={state.rawText}
      normalizationEnabled={state.normalizationEnabled}
      chunks={state.chunks}
      contextualizedChunks={state.contextualizedChunks}
      chunkMode={state.chunkMode}
      contextMode={state.contextMode}
      chunkOptions={state.chunkOptions}
      automation={state.automation}
      llmModel={state.llmModel}
      embeddingModel={state.embeddingModel}
      statusMessage={state.statusMessage}
      errorMessage={state.errorMessage}
      diffLines={state.diffLines}
      isBusy={state.isBusy}
      isChunking={state.isChunking}
      onProjectNameDraftChange={actions.setProjectNameDraft}
      onProjectCreate={actions.createProject}
      onProjectSelect={actions.setSelectedProjectId}
      onRawTextChange={actions.setRawText}
      onFileSelect={actions.handleFileSelected}
      onToggleNormalization={actions.runNormalize}
      onChunkModeChange={actions.setChunkMode}
      onChunkOptionsChange={actions.setChunkOptions}
      onRunChunking={actions.runChunking}
      onContextModeChange={actions.setContextMode}
      onContextualizedChunksChange={actions.setContextualizedChunks}
      onRunContextualization={actions.runContextualization}
      onAutomationFlagChange={actions.setAutomationFlag}
      onLlmModelChange={actions.setLlmModel}
      onEmbeddingModelChange={actions.setEmbeddingModel}
      onAutomaticPreview={actions.runAutomaticPreview}
      onManualIngest={actions.runManualIngest}
      onAutomaticIngest={actions.runAutomaticIngest}
    />
  )

  const autoIngestView = (
    <AutoIngestionPanel
      projects={state.projects}
      selectedProjectId={state.selectedProjectId}
      projectNameDraft={state.projectNameDraft}
      fileName={state.fileName}
      rawText={state.rawText}
      automation={state.automation}
      chunkMode={state.chunkMode}
      contextMode={state.contextMode}
      statusMessage={state.statusMessage}
      errorMessage={state.errorMessage}
      isBusy={state.isBusy}
      onProjectNameDraftChange={actions.setProjectNameDraft}
      onProjectCreate={actions.createProject}
      onProjectSelect={actions.setSelectedProjectId}
      onRawTextChange={actions.setRawText}
      onFileSelect={actions.handleFileSelected}
      onAutomationFlagChange={actions.setAutomationFlag}
      onChunkModeChange={actions.setChunkMode}
      onContextModeChange={actions.setContextMode}
      onAutomaticIngest={actions.runAutomaticIngest}
    />
  )

  const startView = <StartGuidePanel />
  const projectsView = <ProjectsExplorer projects={state.projects} onProjectsRefresh={actions.refreshProjects} />

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-grid-gradient text-foreground">
      <Header currentView={currentView} onViewChange={setView} themeMode={mode} onThemeModeChange={setMode} />
      <MainContent
        currentView={currentView}
        startView={startView}
        ingestionView={ingestionView}
        autoIngestView={autoIngestView}
        projectsView={projectsView}
      />
      <Footer />
    </div>
  )
}

export default App
