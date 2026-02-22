import { useEffect, useMemo } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { buildLineDiff } from "../lib/text-diff"
import { extractTextFromFile } from "../services/document-parser.service"
import {
  contextualizeChunks,
  createProject,
  ingestDocument,
  listProjects,
  normalizeText,
  previewAutomaticPipeline,
  proposeChunks,
} from "../services/pipeline.service"
import { useIngestionStore } from "../stores/ingestion.store"
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
}

interface WorkflowActions {
  refreshProjects: () => Promise<void>
  createProject: () => Promise<void>
  setProjectNameDraft: (value: string) => void
  setSelectedProjectId: (projectId: string) => void
  setRawText: (value: string) => void
  setChunkMode: (mode: ChunkModeSelection) => void
  setContextMode: (mode: ContextModeSelection) => void
  setChunkOptions: (options: { maxChunkChars: number; minChunkChars: number; overlapChars: number }) => void
  setAutomationFlag: (key: "normalize_text" | "agentic_chunking" | "contextual_headers", value: boolean) => void
  setLlmModel: (value: string) => void
  setEmbeddingModel: (value: string) => void
  setContextualizedChunks: (chunks: ContextualizedChunk[]) => void
  handleFileSelected: (file: File) => Promise<void>
  runNormalize: () => Promise<void>
  runChunking: () => Promise<void>
  runContextualization: () => Promise<void>
  runAutomaticPreview: () => Promise<void>
  runManualIngest: () => Promise<void>
  runAutomaticIngest: () => Promise<void>
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
    mutationFn: proposeChunks,
  })

  const contextualizeMutation = useMutation({
    mutationFn: contextualizeChunks,
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

  const diffLines = useMemo(() => {
    if (!normalizationEnabled || normalizedText.trim().length === 0) {
      return []
    }
    return buildLineDiff(rawText, normalizedText)
  }, [normalizationEnabled, normalizedText, rawText])

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
      setFileName(file.name)
      setRawText(text)
      setNormalizedText("")
      setNormalizationEnabled(false)
      setChunks([])
      setContextualizedChunks([])
      setStatusMessage("Text extracted. Run normalization next.")
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error))
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

  async function runChunking(): Promise<void> {
    const source = normalizationEnabled && normalizedText.trim().length > 0 ? normalizedText : rawText
    if (source.trim().length === 0) {
      setErrorMessage("Provide normalized or raw text before chunking.")
      return
    }

    if (chunkMode === "") {
      setErrorMessage("Select deterministic or agentic mode before chunking.")
      return
    }

    const selectedChunkMode = chunkMode as ChunkMode
    setChunks([])
    setContextualizedChunks([])
    setErrorMessage("")
    setStatusMessage(`Generating ${selectedChunkMode} chunks...`)

    try {
      const response = await chunkMutation.mutateAsync({
        text: source,
        mode: selectedChunkMode,
        max_chunk_chars: chunkOptions.maxChunkChars,
        min_chunk_chars: chunkOptions.minChunkChars,
        overlap_chars: chunkOptions.overlapChars,
        llm_model: llmModel.trim() || undefined,
      })
      setChunks(response.chunks)
      setContextualizedChunks([])
      setStatusMessage(`Chunking completed. ${response.chunks.length} chunks proposed.`)
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error))
    }
  }

  async function runContextualization(): Promise<void> {
    if (chunks.length === 0) {
      setErrorMessage("Generate chunks before contextualization.")
      return
    }

    if (contextMode === "") {
      setErrorMessage("Select contextualization mode before generating headers.")
      return
    }

    if (contextMode === "disabled") {
      const passthroughChunks = buildDirectContextualizedChunks(chunks)
      setContextualizedChunks(passthroughChunks)
      setErrorMessage("")
      setStatusMessage("Context headers disabled. Using chunk text directly.")
      return
    }

    const selectedContextMode = contextMode as ContextMode
    const source = normalizationEnabled && normalizedText.trim().length > 0 ? normalizedText : rawText
    setErrorMessage("")
    setStatusMessage("Generating contextual headers...")

    try {
      const response = await contextualizeMutation.mutateAsync({
        document_name: fileName || "Untitled Document",
        full_document_text: source,
        chunks,
        mode: selectedContextMode,
        llm_model: llmModel.trim() || undefined,
      })
      setContextualizedChunks(response.chunks)
      setStatusMessage(`Contextualization completed. ${response.chunks.length} chunks enriched.`)
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error))
    }
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
        document_name: fileName || "Untitled Document",
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
      setErrorMessage("Generate contextualized chunks before manual ingest.")
      return
    }

    setErrorMessage("")
    setStatusMessage("Persisting approved manual chunks...")

    try {
      const response = await ingestMutation.mutateAsync({
        projectId: selectedProjectId,
        payload: {
          document_name: fileName || "Untitled Document",
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
        `Manual ingest complete. Stored ${response.embedded_chunk_count} chunks in ${response.qdrant_collection_name}.`,
      )
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
      setErrorMessage("Provide raw text before automatic ingest.")
      return
    }

    const chunkModeForAutomatic: ChunkMode = chunkMode === "" ? "deterministic" : chunkMode
    const contextModeForAutomatic: ContextMode = contextMode === "template" ? "template" : "llm"

    setErrorMessage("")
    setStatusMessage("Running automatic ingest and indexing...")

    try {
      const response = await ingestMutation.mutateAsync({
        projectId: selectedProjectId,
        payload: {
          document_name: fileName || "Untitled Document",
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
        `Automatic ingest complete. Stored ${response.embedded_chunk_count} chunks in ${response.qdrant_collection_name}.`,
      )
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
  }

  const actions: WorkflowActions = {
    refreshProjects,
    createProject: handleCreateProject,
    setProjectNameDraft,
    setSelectedProjectId,
    setRawText: (value) => {
      setRawText(value)
      setNormalizedText("")
      setNormalizationEnabled(false)
      setChunks([])
      setContextualizedChunks([])
    },
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
    runContextualization,
    runAutomaticPreview,
    runManualIngest,
    runAutomaticIngest,
  }

  return { state, actions }
}
