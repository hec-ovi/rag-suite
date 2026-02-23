import { useEffect, useMemo, useRef, useState } from "react"

import { useQuery } from "@tanstack/react-query"

import { RagApiError } from "../services/rag-api-client"
import {
  createRagSession,
  deleteRagSession,
  getRagSession,
  listRagProjectDocuments,
  listRagProjects,
  listRagSessions,
  streamSessionHybridChat,
  streamStatelessHybridChat,
  updateRagSession,
} from "../services/rag-hybrid.service"
import type {
  RagChatMessage,
  RagChatMode,
  RagChatResponse,
  RagDocumentSummary,
  RagProjectRecord,
  RagSessionChatRequest,
  RagSessionEntry,
  RagSessionMessageRecord,
  RagSessionSummaryRecord,
  RagStatelessChatRequest,
} from "../types/rag"

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

function mapSessionEntry(record: RagSessionSummaryRecord): RagSessionEntry {
  return {
    id: record.id,
    projectId: record.project_id,
    title: record.title,
    messageCount: record.message_count,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function toStoredMessage(message: RagChatMessage): RagSessionMessageRecord {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    created_at: message.createdAt,
  }
}

function fromStoredMessage(message: RagSessionMessageRecord): RagChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
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
  isLoadingSessions: boolean
  isManagingSessions: boolean
  isRequesting: boolean
  isStreaming: boolean
}

export interface RagHybridActions {
  selectProject: (projectId: string) => void
  toggleDocument: (documentId: string) => void
  setChatMode: (mode: RagChatMode) => void
  setSessionId: (value: string) => void
  selectSession: (sessionId: string) => Promise<void>
  startNewSession: (projectId?: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>

  applyAdvancedSettings: (settings: RagAdvancedSettingsInput) => void

  setDraftMessage: (value: string) => void
  sendMessage: () => Promise<void>
  interrupt: () => void
  clearConversation: () => Promise<void>
  selectSource: (sourceId: string) => void
  selectCitation: (sourceId: string) => void
}

export function useRagHybridWorkflow(): { state: RagHybridState; actions: RagHybridActions } {
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])

  const [chatMode, setChatMode] = useState<RagChatMode>("session")
  const [sessionId, setSessionId] = useState("")

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
  const [isManagingSessions, setIsManagingSessions] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const autoSelectedProjectRef = useRef<string>("")
  const skipProjectResetRef = useRef(false)

  const projectsQuery = useQuery({
    queryKey: ["rag-hybrid", "projects"],
    queryFn: listRagProjects,
  })

  const documentsQuery = useQuery({
    queryKey: ["rag-hybrid", "documents", selectedProjectId],
    queryFn: () => listRagProjectDocuments(selectedProjectId),
    enabled: selectedProjectId.trim().length > 0,
  })

  const sessionsQuery = useQuery({
    queryKey: ["rag-hybrid", "sessions"],
    queryFn: () => listRagSessions(),
    refetchOnWindowFocus: false,
  })

  const projects = projectsQuery.data ?? []
  const documents = documentsQuery.data ?? []
  const sessionEntries = useMemo(() => (sessionsQuery.data ?? []).map(mapSessionEntry), [sessionsQuery.data])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (skipProjectResetRef.current) {
      skipProjectResetRef.current = false
      return
    }

    setMessages([])
    setLatestResponse(null)
    setSelectedSourceId(null)
    setErrorMessage("")
    autoSelectedProjectRef.current = ""

    if (selectedProjectId.trim().length === 0) {
      setSelectedDocumentIds([])
      setStatusMessage("")
      return
    }

    setSessionId("")
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
      isLoadingSessions: sessionsQuery.isFetching,
      isManagingSessions,
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
      sessionsQuery.isFetching,
      isManagingSessions,
      isRequesting,
      isStreaming,
    ],
  )

  function selectProject(projectId: string): void {
    if (projectId === selectedProjectId) {
      return
    }

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
    if (mode === chatMode || isRequesting || isStreaming || isManagingSessions) {
      return
    }

    setChatMode(mode)
    setMessages([])
    setLatestResponse(null)
    setSelectedSourceId(null)
    setErrorMessage("")

    if (mode === "stateless") {
      setStatusMessage("Stateless mode enabled. Chat reset.")
      return
    }

    setStatusMessage("Session mode enabled. Select a session or start a new one.")
  }

  function handleSetSessionId(value: string): void {
    setSessionId(value)
  }

  async function hydrateSession(targetSessionId: string): Promise<void> {
    const session = await getRagSession(targetSessionId)

    skipProjectResetRef.current = true
    autoSelectedProjectRef.current = session.project_id

    setChatMode("session")
    setSessionId(session.id)
    setSelectedProjectId(session.project_id)
    setSelectedDocumentIds(session.selected_document_ids ?? [])

    const hydratedMessages = session.messages.map(fromStoredMessage)
    setMessages(hydratedMessages)
    setLatestResponse(session.latest_response)
    const fallbackSourceId = session.latest_response?.sources[0]?.source_id ?? null
    setSelectedSourceId(session.selected_source_id ?? fallbackSourceId)
  }

  async function selectSession(targetSessionId: string): Promise<void> {
    if (targetSessionId.trim().length === 0 || isRequesting || isStreaming || isManagingSessions) {
      return
    }

    setIsManagingSessions(true)
    setErrorMessage("")
    setStatusMessage(`Loading session: ${targetSessionId}`)

    try {
      await hydrateSession(targetSessionId)
      setStatusMessage(`Session loaded: ${targetSessionId}`)
    } catch (error) {
      setErrorMessage(extractErrorMessage(error))
      setStatusMessage("Failed to load session.")
    } finally {
      setIsManagingSessions(false)
    }
  }

  async function startNewSession(projectId?: string): Promise<void> {
    if (isRequesting || isStreaming || isManagingSessions) {
      return
    }

    const resolvedProjectId =
      typeof projectId === "string" && projectId.trim().length > 0 ? projectId.trim() : selectedProjectId.trim()

    if (resolvedProjectId.length === 0) {
      setErrorMessage("Select a project to create a session.")
      return
    }

    setIsManagingSessions(true)
    setErrorMessage("")

    try {
      const record = await createRagSession({
        project_id: resolvedProjectId,
        selected_document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
      })

      await sessionsQuery.refetch()

      skipProjectResetRef.current = true
      autoSelectedProjectRef.current = resolvedProjectId

      setChatMode("session")
      setSessionId(record.id)
      setSelectedProjectId(resolvedProjectId)
      setSelectedDocumentIds(record.selected_document_ids ?? [])

      setMessages([])
      setLatestResponse(null)
      setSelectedSourceId(null)
      setStatusMessage(`New session started: ${record.id}`)
    } catch (error) {
      setErrorMessage(extractErrorMessage(error))
      setStatusMessage("Failed to create session.")
    } finally {
      setIsManagingSessions(false)
    }
  }

  async function deleteSessionById(targetSessionId: string): Promise<void> {
    if (targetSessionId.trim().length === 0 || isRequesting || isStreaming || isManagingSessions) {
      return
    }

    setIsManagingSessions(true)
    setErrorMessage("")

    try {
      await deleteRagSession(targetSessionId)
      const refreshed = await sessionsQuery.refetch()
      const remaining = (refreshed.data ?? []).map(mapSessionEntry)

      if (sessionId === targetSessionId) {
        setSessionId("")
        setMessages([])
        setLatestResponse(null)
        setSelectedSourceId(null)

        if (remaining.length > 0) {
          await hydrateSession(remaining[0].id)
          setStatusMessage(`Session deleted. Loaded ${remaining[0].id}.`)
        } else {
          setStatusMessage("Session deleted.")
        }
      } else {
        setStatusMessage("Session deleted.")
      }
    } catch (error) {
      setErrorMessage(extractErrorMessage(error))
      setStatusMessage("Failed to delete session.")
    } finally {
      setIsManagingSessions(false)
    }
  }

  useEffect(() => {
    if (chatMode !== "session") {
      return
    }
    if (sessionId.trim().length > 0 || isManagingSessions || isRequesting || isStreaming) {
      return
    }
    if (sessionEntries.length === 0) {
      return
    }

    void selectSession(sessionEntries[0].id)
  }, [chatMode, sessionId, sessionEntries, isManagingSessions, isRequesting, isStreaming])

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

    if (isRequesting || isStreaming || isManagingSessions) {
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
        const created = await createRagSession({
          project_id: selectedProjectId,
          selected_document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        })
        resolvedSessionId = created.id
        setSessionId(created.id)
        await sessionsQuery.refetch()
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
        await updateRagSession(resolvedSessionId, {
          messages: finalMessages.map(toStoredMessage),
          selected_source_id: nextSelectedSourceId,
          selected_document_ids: selectedDocumentIds,
          latest_response: response,
        })
        await sessionsQuery.refetch()
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

  async function clearConversation(): Promise<void> {
    setMessages([])
    setLatestResponse(null)
    setSelectedSourceId(null)
    setErrorMessage("")
    setStatusMessage("Conversation cleared.")

    if (chatMode === "session" && sessionId.trim().length > 0) {
      try {
        await updateRagSession(sessionId, {
          messages: [],
          latest_response: null,
          selected_source_id: null,
        })
        await sessionsQuery.refetch()
      } catch {
        // keep UI responsive even if persistence fails
      }
    }
  }

  function selectSource(sourceId: string): void {
    setSelectedSourceId(sourceId)

    if (chatMode === "session" && sessionId.trim().length > 0) {
      void updateRagSession(sessionId, {
        selected_source_id: sourceId,
      })
    }
  }

  function selectCitation(sourceId: string): void {
    selectSource(sourceId)
  }

  const actions: RagHybridActions = {
    selectProject,
    toggleDocument,
    setChatMode: handleSetChatMode,
    setSessionId: handleSetSessionId,
    selectSession,
    startNewSession,
    deleteSession: deleteSessionById,
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
