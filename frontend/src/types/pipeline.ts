export type ChunkMode = "deterministic" | "agentic"
export type ContextMode = "llm" | "template"
export type WorkflowMode = "automatic" | "manual"

export interface ProjectRecord {
  id: string
  name: string
  description: string | null
  qdrant_collection_name: string
  created_at: string
}

export interface ProjectListResponse {
  projects: ProjectRecord[]
}

export interface DeleteProjectResponse {
  project_id: string
  qdrant_collection_name: string
  deleted_document_count: number
  deleted_chunk_count: number
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface NormalizeTextRequest {
  text: string
  max_blank_lines: number
  remove_repeated_short_lines: boolean
}

export interface NormalizeTextResponse {
  normalized_text: string
  removed_repeated_line_count: number
  collapsed_whitespace_count: number
}

export interface ChunkProposal {
  chunk_index: number
  start_char: number
  end_char: number
  text: string
  rationale: string | null
}

export interface ChunkTextRequest {
  text: string
  mode: ChunkMode
  max_chunk_chars: number
  min_chunk_chars: number
  overlap_chars: number
  llm_model?: string
}

export interface ChunkTextResponse {
  mode: ChunkMode
  chunks: ChunkProposal[]
}

export interface ContextualizedChunk {
  chunk_index: number
  start_char: number
  end_char: number
  rationale: string | null
  chunk_text: string
  context_header: string
  contextualized_text: string
}

export interface ContextualizeChunksRequest {
  document_name: string
  full_document_text: string
  chunks: ChunkProposal[]
  mode: ContextMode
  llm_model?: string
}

export interface ContextualizeChunksResponse {
  mode: ContextMode
  chunks: ContextualizedChunk[]
}

export interface PipelineAutomationFlags {
  normalize_text: boolean
  agentic_chunking: boolean
  contextual_headers: boolean
}

export interface ChunkingOptions {
  mode: ChunkMode
  max_chunk_chars: number
  min_chunk_chars: number
  overlap_chars: number
}

export interface AutomaticPreviewRequest {
  document_name: string
  raw_text: string
  automation: PipelineAutomationFlags
  chunk_options: ChunkingOptions
  contextualization_mode: ContextMode
  llm_model?: string
}

export interface AutomaticPreviewResponse {
  normalized_text: string
  chunking_mode: string
  contextualization_mode: string
  chunks: ChunkProposal[]
  contextualized_chunks: ContextualizedChunk[]
}

export interface ApprovedChunkInput {
  chunk_index: number
  start_char: number
  end_char: number
  rationale: string | null
  normalized_chunk: string
  context_header: string | null
  contextualized_chunk: string
}

export interface IngestDocumentRequest {
  document_name: string
  source_type: string
  raw_text: string
  workflow_mode: WorkflowMode
  automation: PipelineAutomationFlags
  chunk_options: ChunkingOptions
  contextualization_mode: ContextMode
  llm_model?: string
  embedding_model?: string
  normalized_text?: string
  approved_chunks?: ApprovedChunkInput[]
}

export interface IngestedDocumentResponse {
  project_id: string
  document_id: string
  qdrant_collection_name: string
  embedded_chunk_count: number
  embedding_model: string
  chunking_mode: string
  contextualization_mode: string
  created_at: string
}

export interface DocumentSummaryRecord {
  id: string
  name: string
  source_type: string
  chunk_count: number
  workflow_mode: string
  chunking_mode: string
  contextualization_mode: string
  used_normalization: boolean
  used_agentic_chunking: boolean
  has_contextual_headers: boolean
  created_at: string
}

export interface ChunkSummaryRecord {
  id: string
  chunk_index: number
  start_char: number
  end_char: number
  rationale: string | null
  context_header: string | null
  raw_chunk: string
  normalized_chunk: string
  contextualized_chunk: string
  created_at: string
}

export interface ApiErrorResponse {
  detail?: string
}
