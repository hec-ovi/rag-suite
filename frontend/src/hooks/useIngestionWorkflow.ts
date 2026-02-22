import { useEffect, useMemo, useRef } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { buildLineDiff } from "../lib/text-diff"
import { extractTextFromFile } from "../services/document-parser.service"
import {
  cancelPipelineOperation,
  contextualizeChunks,
  createProject,
  ingestDocument,
  listProjects,
  normalizeText,
  previewAutomaticPipeline,
  proposeChunks,
} from "../services/pipeline.service"
import { useIngestionStore } from "../stores/ingestion.store"
import { useNavigationStore } from "../stores/navigation.store"
import type {
  ChunkMode,
  ChunkModeSelection,
  ContextMode,
  ContextModeSelection,
  ChunkProposal,
  ContextualizedChunk,
} from "../types/pipeline"

interface WorkflowState {
  projects: ReturnType<typeof useIngestionStore.getState>["projects"]
  selectedProjectId: string
  projectNameDraft: string
  fileName: string
  rawText: string
  normalizedText: string
  normalizationEnabled: boolean
  chunks: ChunkProposal[]
  contextualizedChunks: ContextualizedChunk[]
  chunkMode: ReturnType<typeof useIngestionStore.getState>["chunkMode"]
  contextMode: ReturnType<typeof useIngestionStore.getState>["contextMode"]
  chunkOptions: ReturnType<typeof useIngestionStore.getState>["chunkOptions"]
  automation: ReturnType<typeof useIngestionStore.getState>["automation"]
  llmModel: string
  embeddingModel: string
  statusMessage: string
  errorMessage: string
  diffLines: ReturnType<typeof buildLineDiff>
  isBusy: boolean
  isChunking: boolean
  isContextualizing: boolean
  isVectorizing: boolean
}

interface WorkflowActions {
  refreshProjects: () => Promise<void>
  createProject: () => Promise<void>
  setProjectNameDraft: (value: string) => void
  setSelectedProjectId: (projectId: string) => void
  setFileName: (value: string) => void
  setRawText: (value: string) => void
  setChunks: (chunks: ChunkProposal[]) => void
  setChunkMode: (mode: ChunkModeSelection) => void
  setContextMode: (mode: ContextModeSelection) => void
  setChunkOptions: (options: { maxChunkChars: number; minChunkChars: number; overlapChars: number }) => void
  setAutomationFlag: (key: "normalize_text" | "agentic_chunking" | "contextual_headers", value: boolean) => void
  setLlmModel: (value: string) => void
  setEmbeddingModel: (value: string) => void
  setContextualizedChunks: (chunks: ContextualizedChunk[]) => void
  handleFileSelected: (file: File) => Promise<void>
  runNormalize: () => Promise<void>
  runChunking: (mode?: ChunkModeSelection) => Promise<void>
  interruptChunking: () => Promise<void>
  runContextualization: (mode?: ContextModeSelection) => Promise<void>
  interruptContextualization: () => Promise<void>
  runAutomaticPreview: () => Promise<void>
  runManualIngest: () => Promise<void>
  runAutomaticIngest: () => Promise<void>
}

const DEFAULT_DOCUMENT_NAME = "Untitled Document"

function createOperationId(prefix: string): string {
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

function extractApiErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const typed = error as { message?: unknown }
    if (typeof typed.message === "string") {
      return typed.message
    }
  }

  return "Unexpected error"
}

function buildDirectContextualizedChunks(chunks: ChunkProposal[]): ContextualizedChunk[] {
  return chunks.map((chunk) => ({
    chunk_index: chunk.chunk_index,
    start_char: chunk.start_char,
    end_char: chunk.end_char,
    rationale: chunk.rationale,
    chunk_text: chunk.text,
    context_header: "",
    contextualized_text: chunk.text,
  }))
}

export function useIngestionWorkflow(): { state: WorkflowState; actions: WorkflowActions } {
  const queryClient = useQueryClient()
  const chunkAbortControllerRef = useRef<AbortController | null>(null)
  const contextAbortControllerRef = useRef<AbortController | null>(null)
  const chunkOperationIdRef = useRef<string>("")
  const contextOperationIdRef = useRef<string>("")

  const {
    projects,
    selectedProjectId,
    projectNameDraft,
    fileName,
    rawText,
    normalizedText,
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
    setProjects,
    setSelectedProjectId,
    setProjectNameDraft,
    setFileName,
    setRawText,
    setNormalizedText,
    setNormalizationEnabled,
    setChunkMode,
    setContextMode,
    setChunkOptions,
    setChunks,
    setContextualizedChunks,
    setAutomation,
    setLlmModel,
    setEmbeddingModel,
    setStatusMessage,
    setErrorMessage,
  } = useIngestionStore()

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  })

  useEffect(() => {
    if (projectsQuery.data !== undefined) {
      setProjects(projectsQuery.data)
    }
  }, [projectsQuery.data, setProjects])

  const createProjectMutation = useMutation({
    mutationFn: createProject,
  })

  const normalizeMutation = useMutation({
    mutationFn: normalizeText,
  })

  const chunkMutation = useMutation({
    mutationFn: ({
      payload,
      signal,
      operationId,
    }: {
      payload: Parameters<typeof proposeChunks>[0]
      signal?: AbortSignal
      operationId?: string
    }) => proposeChunks(payload, { signal, operationId }),
  })

  const contextualizeMutation = useMutation({
    mutationFn: ({
      payload,
      signal,
      operationId,
    }: {
      payload: Parameters<typeof contextualizeChunks>[0]
      signal?: AbortSignal
      operationId?: string
    }) => contextualizeChunks(payload, { signal, operationId }),
  })

  const previewMutation = useMutation({
    mutationFn: previewAutomaticPipeline,
  })

  const ingestMutation = useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: Parameters<typeof ingestDocument>[1] }) =>
      ingestDocument(projectId, payload),
  })

  const isBusy =
    createProjectMutation.isPending ||
    normalizeMutation.isPending ||
    chunkMutation.isPending ||
    contextualizeMutation.isPending ||
    previewMutation.isPending ||
    ingestMutation.isPending
  const isChunking = chunkMutation.isPending
  const isContextualizing = contextualizeMutation.isPending
  const isVectorizing = ingestMutation.isPending

  const diffLines = useMemo(() => {
    if (!normalizationEnabled || normalizedText.trim().length === 0) {
      return []
    }
    return buildLineDiff(rawText, normalizedText)
  }, [normalizationEnabled, normalizedText, rawText])

  useEffect(() => {
    return () => {
      chunkAbortControllerRef.current?.abort()
      contextAbortControllerRef.current?.abort()
    }
  }, [])

  async function refreshProjects(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ["projects"] })
  }

  async function handleCreateProject(): Promise<void> {
    const name = projectNameDraft.trim()
    if (name.length < 2) {
      setErrorMessage("Project name must have at least 2 characters.")
      return
    }

    setErrorMessage("")
    setStatusMessage("Creating project...")

    try {
      const created = await createProjectMutation.mutateAsync({ name })
      setProjectNameDraft("")
      setSelectedProjectId(created.id)
      setStatusMessage(`Project '${created.name}' created.`)
      await refreshProjects()
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error))
    }
  }

  async function handleFileSelected(file: File): Promise<void> {
    setErrorMessage("")
    setStatusMessage("Extracting text from file...")

    try {
      const text = await extractTextFromFile(file)
      if (text.trim().length === 0) {
        throw new Error("No extractable text detected in this file.")
      }
      setFileName(file.name)
      setRawText(text)
      setNormalizedText("")
      setNormalizationEnabled(false)
      setChunks([])
      setContextualizedChunks([])
      setStatusMessage("Text extracted. Run normalization next.")
    } catch (error) {
      const message = extractApiErrorMessage(error)
      setErrorMessage(message)
      setStatusMessage("Source extraction failed.")
    }
  }

  async function runNormalize(): Promise<void> {
    if (normalizationEnabled) {
      setNormalizationEnabled(false)
      setErrorMessage("")
      setStatusMessage("Normalization disabled. Raw text is active.")
      return
    }

    if (rawText.trim().length === 0) {
      setErrorMessage("Provide raw text before normalization.")
      return
    }

    if (normalizedText.trim().length > 0) {
      setNormalizationEnabled(true)
      setErrorMessage("")
      setStatusMessage("Normalization enabled.")
      return
    }

    setErrorMessage("")
    setStatusMessage("Running deterministic normalization...")
    try {
      const response = await normalizeMutation.mutateAsync({
        text: rawText,
        max_blank_lines: 0,
        remove_repeated_short_lines: true,
      })
      setNormalizedText(response.normalized_text)
      setNormalizationEnabled(true)
      setStatusMessage("Normalization enabled.")
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error))
    }
  }

  async function runChunking(mode?: ChunkModeSelection): Promise<void> {
    const selectedMode = mode ?? chunkMode
    if (mode !== undefined) {
      setChunkMode(mode)
    }

    const source = normalizationEnabled && normalizedText.trim().length > 0 ? normalizedText : rawText
    if (source.trim().length === 0) {
      setErrorMessage("Provide normalized or raw text before chunking.")
      return
    }

    if (selectedMode === "") {
      setErrorMessage("Select deterministic or agentic mode before chunking.")
      return
    }

    const selectedChunkMode = selectedMode as ChunkMode
    setChunks([])
    setContextualizedChunks([])
    setErrorMessage("")
    setStatusMessage(`Generating ${selectedChunkMode} chunks...`)

    const abortController = new AbortController()
    const operationId = createOperationId("chunk")
    chunkAbortControllerRef.current = abortController
    chunkOperationIdRef.current = operationId

    try {
      const response = await chunkMutation.mutateAsync({
        payload: {
          text: source,
          mode: selectedChunkMode,
          max_chunk_chars: chunkOptions.maxChunkChars,
          min_chunk_chars: chunkOptions.minChunkChars,
          overlap_chars: chunkOptions.overlapChars,
          llm_model: llmModel.trim() || undefined,
        },
        signal: abortController.signal,
        operationId,
      })
      setChunks(response.chunks)
      setContextualizedChunks([])
      setStatusMessage(`Chunking completed. ${response.chunks.length} chunks proposed.`)
    } catch (error) {
      if (isAbortError(error)) {
        setStatusMessage("Chunking interrupted.")
        setErrorMessage("")
      } else {
        setErrorMessage(`Chunking failed: ${extractApiErrorMessage(error)}`)
      }
    } finally {
      if (chunkAbortControllerRef.current === abortController) {
        chunkAbortControllerRef.current = null
      }
      if (chunkOperationIdRef.current === operationId) {
        chunkOperationIdRef.current = ""
      }
    }
  }

  async function interruptChunking(): Promise<void> {
    const operationId = chunkOperationIdRef.current

    chunkAbortControllerRef.current?.abort()
    chunkAbortControllerRef.current = null
    chunkOperationIdRef.current = ""

    if (operationId.length > 0) {
      try {
        await cancelPipelineOperation(operationId)
      } catch {
        // Best-effort backend cleanup; local interruption already completed.
      }
    }

    setChunks([])
    setContextualizedChunks([])
    setErrorMessage("")
    setStatusMessage("Chunking interrupted and cleared.")
  }

  async function runContextualization(mode?: ContextModeSelection): Promise<void> {
    const selectedMode = mode ?? contextMode
    if (mode !== undefined) {
      setContextMode(mode)
    }

    if (chunks.length === 0) {
      setErrorMessage("Generate chunks before contextualization.")
      return
    }

    if (selectedMode === "") {
      setErrorMessage("Select contextualization mode before generating headers.")
      return
    }

    if (selectedMode === "disabled") {
      const passthroughChunks = buildDirectContextualizedChunks(chunks)
      setContextualizedChunks(passthroughChunks)
      setErrorMessage("")
      setStatusMessage("Contextualization completed.")
      return
    }

    const selectedContextMode = selectedMode as ContextMode
    const source = normalizationEnabled && normalizedText.trim().length > 0 ? normalizedText : rawText
    setErrorMessage("")
    setStatusMessage("Generating contextual headers...")

    const abortController = new AbortController()
    const operationId = createOperationId("context")
    contextAbortControllerRef.current = abortController
    contextOperationIdRef.current = operationId

    try {
      const response = await contextualizeMutation.mutateAsync({
        payload: {
          document_name: fileName.trim().length > 0 ? fileName : DEFAULT_DOCUMENT_NAME,
          full_document_text: source,
          chunks,
          mode: selectedContextMode,
          llm_model: llmModel.trim() || undefined,
        },
        signal: abortController.signal,
        operationId,
      })
      setContextualizedChunks(response.chunks)
      setStatusMessage(`Contextualization completed. ${response.chunks.length} chunks enriched.`)
    } catch (error) {
      if (isAbortError(error)) {
        setStatusMessage("Contextual retrieval interrupted.")
        setErrorMessage("")
      } else {
        setErrorMessage(`Contextual retrieval failed: ${extractApiErrorMessage(error)}`)
      }
    } finally {
      if (contextAbortControllerRef.current === abortController) {
        contextAbortControllerRef.current = null
      }
      if (contextOperationIdRef.current === operationId) {
        contextOperationIdRef.current = ""
      }
    }
  }

  async function interruptContextualization(): Promise<void> {
    const operationId = contextOperationIdRef.current

    contextAbortControllerRef.current?.abort()
    contextAbortControllerRef.current = null
    contextOperationIdRef.current = ""

    if (operationId.length > 0) {
      try {
        await cancelPipelineOperation(operationId)
      } catch {
        // Best-effort backend cleanup; local interruption already completed.
      }
    }

    setContextualizedChunks([])
    setErrorMessage("")
    setStatusMessage("Contextual retrieval interrupted and cleared.")
  }

  async function runAutomaticPreview(): Promise<void> {
    if (rawText.trim().length === 0) {
      setErrorMessage("Provide raw text before preview.")
      return
    }

    const chunkModeForAutomatic: ChunkMode = chunkMode === "" ? "deterministic" : chunkMode
    const contextModeForAutomatic: ContextMode = contextMode === "template" ? "template" : "llm"

    setErrorMessage("")
    setStatusMessage("Running automatic preview pipeline...")

    try {
      const response = await previewMutation.mutateAsync({
        document_name: fileName.trim().length > 0 ? fileName : DEFAULT_DOCUMENT_NAME,
        raw_text: rawText,
        automation,
        chunk_options: {
          mode: chunkModeForAutomatic,
          max_chunk_chars: chunkOptions.maxChunkChars,
          min_chunk_chars: chunkOptions.minChunkChars,
          overlap_chars: chunkOptions.overlapChars,
        },
        contextualization_mode: contextModeForAutomatic,
        llm_model: llmModel.trim() || undefined,
      })

      setNormalizedText(response.normalized_text)
      setNormalizationEnabled(true)
      setChunks(response.chunks)
      setContextualizedChunks(response.contextualized_chunks)
      setStatusMessage("Automatic preview completed.")
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error))
    }
  }

  async function runManualIngest(): Promise<void> {
    if (selectedProjectId.length === 0) {
      setErrorMessage("Select or create a project first.")
      return
    }

    const chunkModeForPersist: ChunkMode = chunkMode === "" ? "deterministic" : chunkMode
    const contextModeForPersist: ContextMode = contextMode === "template" ? "template" : "llm"
    const chunksForIngest =
      contextMode === "disabled"
        ? buildDirectContextualizedChunks(chunks)
        : contextualizedChunks

    if (chunksForIngest.length === 0) {
      setErrorMessage("Generate contextualized chunks before manual vectorization.")
      return
    }

    setErrorMessage("")
    setStatusMessage("Persisting approved manual chunks...")

    try {
      const response = await ingestMutation.mutateAsync({
        projectId: selectedProjectId,
        payload: {
          document_name: fileName.trim().length > 0 ? fileName : DEFAULT_DOCUMENT_NAME,
          source_type: "text",
          raw_text: rawText,
          workflow_mode: "manual",
          automation,
          chunk_options: {
            mode: chunkModeForPersist,
            max_chunk_chars: chunkOptions.maxChunkChars,
            min_chunk_chars: chunkOptions.minChunkChars,
            overlap_chars: chunkOptions.overlapChars,
          },
          contextualization_mode: contextModeForPersist,
          llm_model: llmModel.trim() || undefined,
          embedding_model: embeddingModel.trim() || undefined,
          normalized_text: normalizationEnabled && normalizedText.length > 0 ? normalizedText : rawText,
          approved_chunks: chunksForIngest.map((chunk) => ({
            chunk_index: chunk.chunk_index,
            start_char: chunk.start_char,
            end_char: chunk.end_char,
            rationale: chunk.rationale,
            normalized_chunk: chunk.chunk_text,
            context_header: chunk.context_header,
            contextualized_chunk: chunk.contextualized_text,
          })),
        },
      })
      setStatusMessage(
        `Manual vectorization complete. Stored ${response.embedded_chunk_count} chunks in ${response.qdrant_collection_name}.`,
      )
      await queryClient.invalidateQueries({ queryKey: ["project-documents"] })
      useNavigationStore.getState().setView("projects")
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error))
    }
  }

  async function runAutomaticIngest(): Promise<void> {
    if (selectedProjectId.length === 0) {
      setErrorMessage("Select or create a project first.")
      return
    }

    if (rawText.trim().length === 0) {
      setErrorMessage("Provide raw text before automatic vectorization.")
      return
    }

    const chunkModeForAutomatic: ChunkMode = chunkMode === "" ? "deterministic" : chunkMode
    const contextModeForAutomatic: ContextMode = contextMode === "template" ? "template" : "llm"

    setErrorMessage("")
    setStatusMessage("Running automatic vectorization and indexing...")

    try {
      const response = await ingestMutation.mutateAsync({
        projectId: selectedProjectId,
        payload: {
          document_name: fileName.trim().length > 0 ? fileName : DEFAULT_DOCUMENT_NAME,
          source_type: "text",
          raw_text: rawText,
          workflow_mode: "automatic",
          automation,
          chunk_options: {
            mode: chunkModeForAutomatic,
            max_chunk_chars: chunkOptions.maxChunkChars,
            min_chunk_chars: chunkOptions.minChunkChars,
            overlap_chars: chunkOptions.overlapChars,
          },
          contextualization_mode: contextModeForAutomatic,
          llm_model: llmModel.trim() || undefined,
          embedding_model: embeddingModel.trim() || undefined,
        },
      })
      setStatusMessage(
        `Automatic vectorization complete. Stored ${response.embedded_chunk_count} chunks in ${response.qdrant_collection_name}.`,
      )
      await queryClient.invalidateQueries({ queryKey: ["project-documents"] })
      useNavigationStore.getState().setView("projects")
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error))
    }
  }

  const state: WorkflowState = {
    projects,
    selectedProjectId,
    projectNameDraft,
    fileName,
    rawText,
    normalizedText,
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
  }

  const actions: WorkflowActions = {
    refreshProjects,
    createProject: handleCreateProject,
    setProjectNameDraft,
    setSelectedProjectId,
    setFileName,
    setRawText: (value) => {
      const hasText = value.trim().length > 0
      if (hasText && fileName.trim().length === 0) {
        setFileName(DEFAULT_DOCUMENT_NAME)
      }
      if (!hasText && fileName === DEFAULT_DOCUMENT_NAME) {
        setFileName("")
      }
      setRawText(value)
      setNormalizedText("")
      setNormalizationEnabled(false)
      setChunks([])
      setContextualizedChunks([])
    },
    setChunks,
    setChunkMode,
    setContextMode,
    setChunkOptions,
    setAutomationFlag: (key, value) => {
      setAutomation({ ...automation, [key]: value })
    },
    setLlmModel,
    setEmbeddingModel,
    setContextualizedChunks,
    handleFileSelected,
    runNormalize,
    runChunking,
    interruptChunking,
    runContextualization,
    interruptContextualization,
    runAutomaticPreview,
    runManualIngest,
    runAutomaticIngest,
  }

  return { state, actions }
}
