import { RagHybridChatPanel } from "./RagHybridChatPanel"
import { RagHybridConfigPanel } from "./RagHybridConfigPanel"
import { RagHybridSourcesPanel } from "./RagHybridSourcesPanel"
import type { RagHybridActions, RagHybridState } from "../hooks/useRagHybridWorkflow"

interface RagHybridWorkbenchProps {
  state: RagHybridState
  actions: RagHybridActions
}

export function RagHybridWorkbench({ state, actions }: RagHybridWorkbenchProps) {
  const disableConfig = state.isRequesting || state.isStreaming
  const disableChatInput = disableConfig || state.selectedProjectId.trim().length === 0

  return (
    <div className="h-full min-h-0">
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="min-h-0">
          <RagHybridConfigPanel
            projects={state.projects}
            selectedProjectId={state.selectedProjectId}
            onProjectSelect={actions.selectProject}
            onRefreshProjects={actions.refreshProjects}
            documents={state.documents}
            selectedDocumentIds={state.selectedDocumentIds}
            onToggleDocument={actions.toggleDocument}
            chatMode={state.chatMode}
            onChatModeChange={actions.setChatMode}
            sessionId={state.sessionId}
            onSessionIdChange={actions.setSessionId}
            onNewSession={actions.startNewSession}
            topK={state.topK}
            denseTopK={state.denseTopK}
            sparseTopK={state.sparseTopK}
            denseWeight={state.denseWeight}
            historyWindowMessages={state.historyWindowMessages}
            onTopKChange={actions.setTopK}
            onDenseTopKChange={actions.setDenseTopK}
            onSparseTopKChange={actions.setSparseTopK}
            onDenseWeightChange={actions.setDenseWeight}
            onHistoryWindowMessagesChange={actions.setHistoryWindowMessages}
            chatModelOverride={state.chatModelOverride}
            embeddingModelOverride={state.embeddingModelOverride}
            onChatModelOverrideChange={actions.setChatModelOverride}
            onEmbeddingModelOverrideChange={actions.setEmbeddingModelOverride}
            isLoadingProjects={state.isLoadingProjects}
            isLoadingDocuments={state.isLoadingDocuments}
            disabled={disableConfig}
          />
        </aside>

        <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)]">
          <div className="min-h-0 min-w-0">
            <RagHybridChatPanel
              messages={state.messages}
              draftMessage={state.draftMessage}
              onDraftMessageChange={actions.setDraftMessage}
              onSendMessage={actions.sendMessage}
              onInterrupt={actions.interrupt}
              onClearConversation={actions.clearConversation}
              statusMessage={state.statusMessage}
              errorMessage={state.errorMessage}
              disabled={disableChatInput}
              isRequesting={state.isRequesting}
              isStreaming={state.isStreaming}
            />
          </div>

          <div className="min-h-0 min-w-0">
            <RagHybridSourcesPanel
              response={state.latestResponse}
              selectedSourceId={state.selectedSourceId}
              onSourceSelect={actions.selectSource}
              onCitationSelect={actions.selectCitation}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
