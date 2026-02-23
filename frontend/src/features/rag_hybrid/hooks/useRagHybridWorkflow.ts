import { useEffect, useMemo, useRef, useState } from "react"

import { useQuery } from "@tanstack/react-query"

import { RagApiError } from "../services/rag-api-client"
import {
  listRagProjectDocuments,
  listRagProjects,
  streamSessionHybridChat,
  streamStatelessHybridChat,
} from "../services/rag-hybrid.service"
import type {
  RagChatMessage,
  RagChatMode,
  RagChatResponse,
  RagDocumentSummary,
  RagProjectRecord,
  RagSessionChatRequest,
  RagSessionEntry,
  RagStatelessChatRequest,
} from "../types/rag"

interface SessionSnapshot {
  messages: RagChatMessage[]
  latestResponse: RagChatResponse | null
  selectedSourceId: string | null
}

interface RagAdvancedSettingsInput {
  topK: number
  denseTopK: number
  sparseTopK: number
  denseWeight: number
  historyWindowMessages: number
  chatModelOverride: string
  embeddingModelOverride: string
}

function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createSessionId(): string {
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true
  }

  if (typeof error === "object" && error !== null && "name" in error) {
    const typed = error as { name?: unknown }
    return typed.name === "AbortError"
  }

  return false
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function clampFloat(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof RagApiError) {
    return error.message
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return "Unexpected error"
}

function normalizeSessionTitle(messages: RagChatMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user" && message.content.trim().length > 0)
  if (firstUser === undefined) {
    return "Untitled Session"
  }

  const normalized = firstUser.content.trim().replace(/\s+/g, " ")
  if (normalized.length <= 48) {
    return normalized
  }
  return `${normalized.slice(0, 48)}...`
}

function createEmptySessionSnapshot(): SessionSnapshot {
  return {
    messages: [],
    latestResponse: null,
    selectedSourceId: null,
  }
}

export interface RagHybridState {
  projects: RagProjectRecord[]
  selectedProjectId: string
  documents: RagDocumentSummary[]
  selectedDocumentIds: string[]

  chatMode: RagChatMode
  sessionId: string
  sessionEntries: RagSessionEntry[]

  topK: number
  denseTopK: number
  sparseTopK: number
  denseWeight: number
  historyWindowMessages: number

  chatModelOverride: string
  embeddingModelOverride: string

  draftMessage: string
  messages: RagChatMessage[]

  latestResponse: RagChatResponse | null
  selectedSourceId: string | null

  statusMessage: string
  errorMessage: string

  isLoadingProjects: boolean
  isLoadingDocuments: boolean
  isRequesting: boolean
  isStreaming: boolean
}

export interface RagHybridActions {
  selectProject: (projectId: string) => void
  toggleDocument: (documentId: string) => void
  setChatMode: (mode: RagChatMode) => void
  setSessionId: (value: string) => void
  selectSession: (sessionId: string) => void
  startNewSession: (projectId?: string) => void

  applyAdvancedSettings: (settings: RagAdvancedSettingsInput) => void

  setDraftMessage: (value: string) => void
  sendMessage: () => Promise<void>
  interrupt: () => void
  clearConversation: () => void
  selectSource: (sourceId: string) => void
  selectCitation: (sourceId: string) => void
}

export function useRagHybridWorkflow(): { state: RagHybridState; actions: RagHybridActions } {
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])

  const [chatMode, setChatMode] = useState<RagChatMode>("session")
  const [sessionId, setSessionId] = useState(createSessionId)
  const [sessionEntries, setSessionEntries] = useState<RagSessionEntry[]>([])
  const [sessionSnapshots, setSessionSnapshots] = useState<Record<string, SessionSnapshot>>({})

  const [topK, setTopK] = useState(6)
  const [denseTopK, setDenseTopK] = useState(24)
  const [sparseTopK, setSparseTopK] = useState(24)
  const [denseWeight, setDenseWeight] = useState(0.65)
  const [historyWindowMessages, setHistoryWindowMessages] = useState(8)

  const [chatModelOverride, setChatModelOverride] = useState("")
  const [embeddingModelOverride, setEmbeddingModelOverride] = useState("")

  const [draftMessage, setDraftMessage] = useState("")
  const [messages, setMessages] = useState<RagChatMessage[]>([])

  const [latestResponse, setLatestResponse] = useState<RagChatResponse | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)

  const [statusMessage, setStatusMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const [isRequesting, setIsRequesting] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const autoSelectedProjectRef = useRef<string>("")

  const projectsQuery = useQuery({
    queryKey: ["rag-hybrid", "projects"],
    queryFn: listRagProjects,
  })

  const documentsQuery = useQuery({
    queryKey: ["rag-hybrid", "documents", selectedProjectId],
    queryFn: () => listRagProjectDocuments(selectedProjectId),
    enabled: selectedProjectId.trim().length > 0,
  })

  const projects = projectsQuery.data ?? []
  const documents = documentsQuery.data ?? []

  function upsertSessionEntry(targetSessionId: string, nextMessages: RagChatMessage[]): void {
    const nextEntry: RagSessionEntry = {
      id: targetSessionId,
      title: normalizeSessionTitle(nextMessages),
      messageCount: nextMessages.length,
      updatedAt: new Date().toISOString(),
    }

    setSessionEntries((current) => {
      const withoutCurrent = current.filter((item) => item.id !== targetSessionId)
      return [nextEntry, ...withoutCurrent]
    })
  }

  function saveSessionSnapshot(targetSessionId: string, snapshot: SessionSnapshot): void {
    setSessionSnapshots((current) => ({
      ...current,
      [targetSessionId]: snapshot,
    }))
    upsertSessionEntry(targetSessionId, snapshot.messages)
  }

  function restoreSessionSnapshot(targetSessionId: string): void {
    const snapshot = sessionSnapshots[targetSessionId]
    if (snapshot === undefined) {
      setMessages([])
      setLatestResponse(null)
      setSelectedSourceId(null)
      return
    }

    setMessages(snapshot.messages)
    setLatestResponse(snapshot.latestResponse)
    setSelectedSourceId(snapshot.selectedSourceId)
  }

  function clearConversationState(): void {
    setMessages([])
    setLatestResponse(null)
    setSelectedSourceId(null)
  }

  function persistCurrentSessionState(targetSessionId?: string): void {
    const resolvedSessionId = (targetSessionId ?? sessionId).trim()
    if (chatMode !== "session" || resolvedSessionId.length === 0) {
      return
    }

    saveSessionSnapshot(resolvedSessionId, {
      messages,
      latestResponse,
      selectedSourceId,
    })
  }

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    upsertSessionEntry(sessionId, messages)
    // only initialize the first session entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    clearConversationState()
    setErrorMessage("")
    autoSelectedProjectRef.current = ""

    if (selectedProjectId.trim().length === 0) {
      setSelectedDocumentIds([])
      setStatusMessage("")
      return
    }

    setStatusMessage("Project selected. Loading and auto-selecting documents.")
  }, [selectedProjectId])

  useEffect(() => {
    if (selectedProjectId.trim().length === 0) {
      return
    }
    if (documentsQuery.isFetching) {
      return
    }
    if (autoSelectedProjectRef.current === selectedProjectId) {
      return
    }

    setSelectedDocumentIds(documents.map((document) => document.id))
    autoSelectedProjectRef.current = selectedProjectId
    setStatusMessage(
      documents.length === 0
        ? "Project has no documents yet. Load data first."
        : `All ${documents.length} document(s) selected by default.`,
    )
  }, [selectedProjectId, documents, documentsQuery.isFetching])

  const state: RagHybridState = useMemo(
    () => ({
      projects,
      selectedProjectId,
      documents,
      selectedDocumentIds,
      chatMode,
      sessionId,
      sessionEntries,
      topK,
      denseTopK,
      sparseTopK,
      denseWeight,
      historyWindowMessages,
      chatModelOverride,
      embeddingModelOverride,
      draftMessage,
      messages,
      latestResponse,
      selectedSourceId,
      statusMessage,
      errorMessage,
      isLoadingProjects: projectsQuery.isFetching,
      isLoadingDocuments: documentsQuery.isFetching,
      isRequesting,
      isStreaming,
    }),
    [
      projects,
      selectedProjectId,
      documents,
      selectedDocumentIds,
      chatMode,
      sessionId,
      sessionEntries,
      topK,
      denseTopK,
      sparseTopK,
      denseWeight,
      historyWindowMessages,
      chatModelOverride,
      embeddingModelOverride,
      draftMessage,
      messages,
      latestResponse,
      selectedSourceId,
      statusMessage,
      errorMessage,
      projectsQuery.isFetching,
      documentsQuery.isFetching,
      isRequesting,
      isStreaming,
    ],
  )

  function selectProject(projectId: string): void {
    if (projectId === selectedProjectId) {
      return
    }

    persistCurrentSessionState()
    setSelectedProjectId(projectId)
  }

  function toggleDocument(documentId: string): void {
    setSelectedDocumentIds((current) => {
      if (current.includes(documentId)) {
        return current.filter((item) => item !== documentId)
      }
      return [...current, documentId]
    })
  }

  function handleSetChatMode(mode: RagChatMode): void {
    if (mode === chatMode || isRequesting || isStreaming) {
      return
    }

    persistCurrentSessionState()
    setChatMode(mode)
    clearConversationState()
    setErrorMessage("")

    if (mode === "stateless") {
      setStatusMessage("Stateless mode enabled. Chat reset.")
      return
    }

    const resolvedSessionId = sessionId.trim().length > 0 ? sessionId : createSessionId()
    setSessionId(resolvedSessionId)
    restoreSessionSnapshot(resolvedSessionId)
    upsertSessionEntry(resolvedSessionId, sessionSnapshots[resolvedSessionId]?.messages ?? [])
    setStatusMessage(`Session mode enabled (${resolvedSessionId}). Chat reset.`)
  }

  function handleSetSessionId(value: string): void {
    setSessionId(value)
  }

  function selectSession(targetSessionId: string): void {
    if (targetSessionId.trim().length === 0 || isRequesting || isStreaming) {
      return
    }

    persistCurrentSessionState()

    if (chatMode !== "session") {
      setChatMode("session")
    }

    setSessionId(targetSessionId)
    restoreSessionSnapshot(targetSessionId)
    upsertSessionEntry(targetSessionId, sessionSnapshots[targetSessionId]?.messages ?? [])
    setStatusMessage(`Session loaded: ${targetSessionId}`)
    setErrorMessage("")
  }

  function startNewSession(projectId?: string): void {
    if (isRequesting || isStreaming) {
      return
    }

    persistCurrentSessionState()

    if (chatMode !== "session") {
      setChatMode("session")
    }

    if (typeof projectId === "string" && projectId.trim().length > 0 && projectId !== selectedProjectId) {
      setSelectedProjectId(projectId)
      autoSelectedProjectRef.current = ""
    }

    const freshSessionId = createSessionId()
    setSessionId(freshSessionId)
    clearConversationState()
    setSessionSnapshots((current) => ({
      ...current,
      [freshSessionId]: createEmptySessionSnapshot(),
    }))
    upsertSessionEntry(freshSessionId, [])
    setStatusMessage(`New session started: ${freshSessionId}`)
    setErrorMessage("")
  }

  function applyAdvancedSettings(settings: RagAdvancedSettingsInput): void {
    setTopK(clampInteger(settings.topK, 1, 50))
    setDenseTopK(clampInteger(settings.denseTopK, 1, 100))
    setSparseTopK(clampInteger(settings.sparseTopK, 1, 100))
    setDenseWeight(clampFloat(settings.denseWeight, 0, 1))
    setHistoryWindowMessages(clampInteger(settings.historyWindowMessages, 0, 40))
    setChatModelOverride(settings.chatModelOverride)
    setEmbeddingModelOverride(settings.embeddingModelOverride)
    setStatusMessage("Advanced settings applied.")
  }

  async function sendMessage(): Promise<void> {
    const question = draftMessage.trim()
    if (question.length === 0) {
      setErrorMessage("Type a message before sending.")
      return
    }

    if (selectedProjectId.trim().length === 0) {
      setErrorMessage("Select a project before sending a RAG query.")
      return
    }

    if (isRequesting || isStreaming) {
      return
    }

    setErrorMessage("")
    setStatusMessage("Running hybrid retrieval and generating answer...")
    setDraftMessage("")

    const userMessage: RagChatMessage = {
      id: createLocalId("user"),
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    }

    const assistantMessageId = createLocalId("assistant")
    const assistantPlaceholder: RagChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    }

    const initialMessages = [...messages, userMessage, assistantPlaceholder]
    setMessages(initialMessages)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsRequesting(true)

    try {
      const sharedPayload = {
        project_id: selectedProjectId,
        message: question,
        document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        top_k: topK,
        dense_top_k: denseTopK,
        sparse_top_k: sparseTopK,
        dense_weight: denseWeight,
        embedding_model: embeddingModelOverride.trim().length > 0 ? embeddingModelOverride.trim() : undefined,
        chat_model: chatModelOverride.trim().length > 0 ? chatModelOverride.trim() : undefined,
        history_window_messages: historyWindowMessages,
      }

      let assembledAnswer = ""
      let response: RagChatResponse
      let resolvedSessionId = sessionId.trim()
      if (chatMode === "session" && resolvedSessionId.length === 0) {
        resolvedSessionId = createSessionId()
        setSessionId(resolvedSessionId)
      }

      setIsRequesting(false)
      setIsStreaming(true)

      if (chatMode === "session") {
        const payload: RagSessionChatRequest = {
          ...sharedPayload,
          session_id: resolvedSessionId,
        }
        response = await streamSessionHybridChat(
          payload,
          {
            onDelta: ({ content }) => {
              assembledAnswer += content
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content: assembledAnswer,
                        isStreaming: true,
                      }
                    : message,
                ),
              )
            },
          },
          { signal: abortController.signal },
        )
      } else {
        const payload: RagStatelessChatRequest = sharedPayload
        response = await streamStatelessHybridChat(
          payload,
          {
            onDelta: ({ content }) => {
              assembledAnswer += content
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content: assembledAnswer,
                        isStreaming: true,
                      }
                    : message,
                ),
              )
            },
          },
          { signal: abortController.signal },
        )
      }

      if (chatMode === "session" && response.session_id !== null && response.session_id.trim().length > 0) {
        resolvedSessionId = response.session_id
        setSessionId(response.session_id)
      }

      const nextSelectedSourceId = response.sources[0]?.source_id ?? null
      const finalMessages = initialMessages.map((message) =>
        message.id === assistantMessageId
          ? {
              ...message,
              content: response.answer,
              isStreaming: false,
            }
          : message,
      )

      setLatestResponse(response)
      setSelectedSourceId(nextSelectedSourceId)
      setMessages(finalMessages)

      if (chatMode === "session" && resolvedSessionId.trim().length > 0) {
        saveSessionSnapshot(resolvedSessionId, {
          messages: finalMessages,
          latestResponse: response,
          selectedSourceId: nextSelectedSourceId,
        })
      }

      setStatusMessage(`Response ready with ${response.sources.length} traced source chunk(s).`)
    } catch (error) {
      if (isAbortError(error)) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  isStreaming: false,
                }
              : message,
          ),
        )
        setStatusMessage("Request interrupted.")
      } else {
        setMessages((current) =>
          current.filter((message) => !(message.id === assistantMessageId && message.content.trim().length === 0)),
        )
        setErrorMessage(extractErrorMessage(error))
        setStatusMessage("RAG request failed.")
      }
    } finally {
      setIsRequesting(false)
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  function interrupt(): void {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsRequesting(false)
    setIsStreaming(false)
    setStatusMessage("Request interrupted.")
  }

  function clearConversation(): void {
    clearConversationState()
    setErrorMessage("")
    setStatusMessage("Conversation cleared.")

    if (chatMode === "session" && sessionId.trim().length > 0) {
      saveSessionSnapshot(sessionId, createEmptySessionSnapshot())
    }
  }

  function selectSource(sourceId: string): void {
    setSelectedSourceId(sourceId)
  }

  function selectCitation(sourceId: string): void {
    setSelectedSourceId(sourceId)
  }

  const actions: RagHybridActions = {
    selectProject,
    toggleDocument,
    setChatMode: handleSetChatMode,
    setSessionId: handleSetSessionId,
    selectSession,
    startNewSession,
    applyAdvancedSettings,
    setDraftMessage,
    sendMessage,
    interrupt,
    clearConversation,
    selectSource,
    selectCitation,
  }

  return {
    state,
    actions,
  }
}
