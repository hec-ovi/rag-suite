import { useState } from "react"

import { RagHybridChatPanel } from "./RagHybridChatPanel"
import { RagHybridConfigPanel } from "./RagHybridConfigPanel"
import { RagHybridSessionPanel } from "./RagHybridSessionPanel"
import { RagHybridSourcesPanel } from "./RagHybridSourcesPanel"
import type { RagHybridActions, RagHybridState } from "../hooks/useRagHybridWorkflow"

interface RagHybridWorkbenchProps {
  state: RagHybridState
  actions: RagHybridActions
}

export function RagHybridWorkbench({ state, actions }: RagHybridWorkbenchProps) {
  const disableConfig = state.isRequesting || state.isStreaming
  const disableChatInput = state.selectedProjectId.trim().length === 0

  const [isSessionsOpen, setIsSessionsOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <div className="h-full min-h-0">
      <div className="flex h-full min-h-0">
        <RagHybridSessionPanel
          isOpen={isSessionsOpen}
          activeSessionId={state.sessionId}
          sessionEntries={state.sessionEntries}
          onToggleOpen={() => setIsSessionsOpen((current) => !current)}
          onSelectSession={actions.selectSession}
        />

        <div className="flex min-h-0 flex-1 bg-surface">
          <div className="min-h-0 min-w-0 flex-1">
            <RagHybridChatPanel
              messages={state.messages}
              draftMessage={state.draftMessage}
              onDraftMessageChange={actions.setDraftMessage}
              onSendMessage={actions.sendMessage}
              onInterrupt={actions.interrupt}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onToggleStateless={() => actions.setChatMode(state.chatMode === "stateless" ? "session" : "stateless")}
              onStartNewSession={actions.startNewSession}
              chatMode={state.chatMode}
              statusMessage={state.statusMessage}
              errorMessage={state.errorMessage}
              isInputDisabled={disableChatInput}
              isBusy={state.isRequesting}
              isStreaming={state.isStreaming}
            />
          </div>

          <RagHybridSourcesPanel
            response={state.latestResponse}
            selectedSourceId={state.selectedSourceId}
            onSourceSelect={actions.selectSource}
            onCitationSelect={actions.selectCitation}
          />
        </div>
      </div>

      <RagHybridConfigPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        projects={state.projects}
        selectedProjectId={state.selectedProjectId}
        onProjectSelect={actions.selectProject}
        documents={state.documents}
        selectedDocumentIds={state.selectedDocumentIds}
        onToggleDocument={actions.toggleDocument}
        topK={state.topK}
        denseTopK={state.denseTopK}
        sparseTopK={state.sparseTopK}
        denseWeight={state.denseWeight}
        historyWindowMessages={state.historyWindowMessages}
        chatModelOverride={state.chatModelOverride}
        embeddingModelOverride={state.embeddingModelOverride}
        onApplyAdvancedSettings={actions.applyAdvancedSettings}
        isLoadingProjects={state.isLoadingProjects}
        isLoadingDocuments={state.isLoadingDocuments}
        disabled={disableConfig}
      />
    </div>
  )
}
