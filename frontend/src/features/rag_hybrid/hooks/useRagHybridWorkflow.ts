import { useEffect, useRef, useState } from "react"

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
  RagStatelessChatRequest,
} from "../types/rag"

function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createSessionId(): string {
  return `session-${Date.now().toString(36)}`
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

export interface RagHybridState {
  projects: RagProjectRecord[]
  selectedProjectId: string
  documents: RagDocumentSummary[]
  selectedDocumentIds: string[]

  chatMode: RagChatMode
  sessionId: string

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
  startNewSession: () => void

  setTopK: (value: number) => void
  setDenseTopK: (value: number) => void
  setSparseTopK: (value: number) => void
  setDenseWeight: (value: number) => void
  setHistoryWindowMessages: (value: number) => void
  setChatModelOverride: (value: string) => void
  setEmbeddingModelOverride: (value: string) => void

  setDraftMessage: (value: string) => void
  sendMessage: () => Promise<void>
  interrupt: () => void
  clearConversation: () => void
  selectSource: (sourceId: string) => void
  selectCitation: (sourceId: string) => void
  refreshProjects: () => Promise<void>
}

export function useRagHybridWorkflow(): { state: RagHybridState; actions: RagHybridActions } {
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])

  const [chatMode, setChatMode] = useState<RagChatMode>("stateless")
  const [sessionId, setSessionId] = useState(createSessionId)

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

  const [statusMessage, setStatusMessage] = useState("Select a project and ask your first question.")
  const [errorMessage, setErrorMessage] = useState("")

  const [isRequesting, setIsRequesting] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  const projectsQuery = useQuery({
    queryKey: ["rag-hybrid", "projects"],
    queryFn: listRagProjects,
  })

  const documentsQuery = useQuery({
    queryKey: ["rag-hybrid", "documents", selectedProjectId],
    queryFn: () => listRagProjectDocuments(selectedProjectId),
    enabled: selectedProjectId.trim().length > 0,
  })

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    setSelectedDocumentIds([])
    setLatestResponse(null)
    setSelectedSourceId(null)
    setMessages([])
    setErrorMessage("")

    if (selectedProjectId.trim().length === 0) {
      setStatusMessage("Select a project and ask your first question.")
      return
    }

    setStatusMessage("Project selected. Configure retrieval and send a message.")
  }, [selectedProjectId])

  const projects = projectsQuery.data ?? []
  const documents = documentsQuery.data ?? []

  const state: RagHybridState = {
    projects,
    selectedProjectId,
    documents,
    selectedDocumentIds,
    chatMode,
    sessionId,
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
  }

  async function refreshProjects(): Promise<void> {
    await projectsQuery.refetch()
  }

  function selectProject(projectId: string): void {
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
    setChatMode(mode)
    setErrorMessage("")
    if (mode === "stateless") {
      setStatusMessage("Stateless mode enabled. Each message is independent.")
    } else {
      setStatusMessage("Session mode enabled. Memory persists by session id.")
    }
  }

  function startNewSession(): void {
    const freshSessionId = createSessionId()
    setSessionId(freshSessionId)
    setMessages([])
    setLatestResponse(null)
    setSelectedSourceId(null)
    setStatusMessage(`New session started: ${freshSessionId}`)
    setErrorMessage("")
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

    setMessages((current) => [...current, userMessage, assistantPlaceholder])

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
      setIsRequesting(false)
      setIsStreaming(true)

      if (chatMode === "session") {
        const payload: RagSessionChatRequest = {
          ...sharedPayload,
          session_id: sessionId.trim().length > 0 ? sessionId.trim() : undefined,
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
        setSessionId(response.session_id)
      }

      setLatestResponse(response)
      setSelectedSourceId(response.sources[0]?.source_id ?? null)

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: response.answer,
                isStreaming: false,
              }
            : message,
        ),
      )

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
    setMessages([])
    setLatestResponse(null)
    setSelectedSourceId(null)
    setErrorMessage("")
    setStatusMessage("Conversation cleared.")
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
    setSessionId,
    startNewSession,
    setTopK: (value) => setTopK(clampInteger(value, 1, 50)),
    setDenseTopK: (value) => setDenseTopK(clampInteger(value, 1, 100)),
    setSparseTopK: (value) => setSparseTopK(clampInteger(value, 1, 100)),
    setDenseWeight: (value) => setDenseWeight(clampFloat(value, 0, 1)),
    setHistoryWindowMessages: (value) => setHistoryWindowMessages(clampInteger(value, 0, 40)),
    setChatModelOverride,
    setEmbeddingModelOverride,
    setDraftMessage,
    sendMessage,
    interrupt,
    clearConversation,
    selectSource,
    selectCitation,
    refreshProjects,
  }

  return {
    state,
    actions,
  }
}
