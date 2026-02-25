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
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false)
  const [newSessionProjectId, setNewSessionProjectId] = useState(state.selectedProjectId)

  return (
    <div className="h-full min-h-0">
      <div className="flex h-full min-h-0">
        <RagHybridSessionPanel
          isOpen={isSessionsOpen}
          activeSessionId={state.sessionId}
          sessionEntries={state.sessionEntries}
          onToggleOpen={() => setIsSessionsOpen((current) => !current)}
          onSelectSession={(sessionId) => {
            void actions.selectSession(sessionId)
          }}
          onDeleteSession={(sessionId) => {
            void actions.deleteSession(sessionId)
          }}
          disabled={state.isManagingSessions || state.isRequesting || state.isStreaming}
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
              onStartNewSession={() => {
                setNewSessionProjectId(state.selectedProjectId)
                setIsNewSessionModalOpen(true)
              }}
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
            isLoading={state.isRequesting || state.isStreaming}
            selectedSourceId={state.selectedSourceId}
            onSourceSelect={actions.selectSource}
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

      {isNewSessionModalOpen ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-md bg-surface shadow-xl">
            <header className="bg-background px-4 py-3">
              <h2 className="font-display text-lg font-semibold text-foreground">Create Session</h2>
              <p className="text-sm text-muted">Select the project for this new session.</p>
            </header>

            <div className="grid gap-3 p-4">
              <label className="grid gap-1 text-sm text-muted">
                <span className="font-medium text-foreground">Project</span>
                <select
                  value={newSessionProjectId}
                  onChange={(event) => setNewSessionProjectId(event.target.value)}
                  className="bg-background px-3 py-2 text-foreground"
                >
                  <option value="">Select project...</option>
                  {state.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="bg-background px-3 py-2 text-sm font-semibold text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={newSessionProjectId.trim().length === 0}
                  onClick={() => {
                    void actions.startNewSession(newSessionProjectId)
                    setIsNewSessionModalOpen(false)
                  }}
                  className="bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  Create Session
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
