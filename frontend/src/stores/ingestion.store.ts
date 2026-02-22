import { create } from "zustand"

import type {
  ChunkMode,
  ChunkProposal,
  ContextMode,
  ContextualizedChunk,
  PipelineAutomationFlags,
  ProjectRecord,
} from "../types/pipeline"

interface IngestionStore {
  projects: ProjectRecord[]
  selectedProjectId: string
  projectNameDraft: string

  fileName: string
  rawText: string
  normalizedText: string

  chunkMode: ChunkMode
  chunkOptions: {
    maxChunkChars: number
    minChunkChars: number
    overlapChars: number
  }
  chunks: ChunkProposal[]

  contextMode: ContextMode
  contextualizedChunks: ContextualizedChunk[]

  automation: PipelineAutomationFlags
  llmModel: string
  embeddingModel: string

  statusMessage: string
  errorMessage: string

  setProjects: (projects: ProjectRecord[]) => void
  setSelectedProjectId: (projectId: string) => void
  setProjectNameDraft: (name: string) => void
  setFileName: (fileName: string) => void
  setRawText: (text: string) => void
  setNormalizedText: (text: string) => void
  setChunkMode: (mode: ChunkMode) => void
  setChunkOptions: (options: { maxChunkChars: number; minChunkChars: number; overlapChars: number }) => void
  setChunks: (chunks: ChunkProposal[]) => void
  setContextMode: (mode: ContextMode) => void
  setContextualizedChunks: (chunks: ContextualizedChunk[]) => void
  setAutomation: (flags: PipelineAutomationFlags) => void
  setLlmModel: (value: string) => void
  setEmbeddingModel: (value: string) => void
  setStatusMessage: (message: string) => void
  setErrorMessage: (message: string) => void
  resetPipelineState: () => void
}

const defaultAutomation: PipelineAutomationFlags = {
  normalize_text: true,
  agentic_chunking: false,
  contextual_headers: true,
}

export const useIngestionStore = create<IngestionStore>((set) => ({
  projects: [],
  selectedProjectId: "",
  projectNameDraft: "",

  fileName: "",
  rawText: "",
  normalizedText: "",

  chunkMode: "deterministic",
  chunkOptions: {
    maxChunkChars: 1500,
    minChunkChars: 350,
    overlapChars: 120,
  },
  chunks: [],

  contextMode: "llm",
  contextualizedChunks: [],

  automation: defaultAutomation,
  llmModel: "",
  embeddingModel: "",

  statusMessage: "Ready.",
  errorMessage: "",

  setProjects: (projects) =>
    set((state) => ({
      projects,
      selectedProjectId: projects.some((project) => project.id === state.selectedProjectId)
        ? state.selectedProjectId
        : projects.at(0)?.id || "",
    })),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  setProjectNameDraft: (projectNameDraft) => set({ projectNameDraft }),
  setFileName: (fileName) => set({ fileName }),
  setRawText: (rawText) => set({ rawText }),
  setNormalizedText: (normalizedText) => set({ normalizedText }),
  setChunkMode: (chunkMode) => set({ chunkMode }),
  setChunkOptions: (chunkOptions) => set({ chunkOptions }),
  setChunks: (chunks) => set({ chunks }),
  setContextMode: (contextMode) => set({ contextMode }),
  setContextualizedChunks: (contextualizedChunks) => set({ contextualizedChunks }),
  setAutomation: (automation) => set({ automation }),
  setLlmModel: (llmModel) => set({ llmModel }),
  setEmbeddingModel: (embeddingModel) => set({ embeddingModel }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  resetPipelineState: () =>
    set({
      rawText: "",
      normalizedText: "",
      chunks: [],
      contextualizedChunks: [],
      fileName: "",
      statusMessage: "Ready.",
      errorMessage: "",
    }),
}))
