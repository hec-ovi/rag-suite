export type RagChatMode = "stateless" | "session"

export interface RagProjectRecord {
  id: string
  name: string
  description: string | null
  qdrant_collection_name: string
  created_at: string
}

export interface RagProjectListResponse {
  projects: RagProjectRecord[]
}

export interface RagDocumentSummary {
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

export interface RagChatRequestBase {
  project_id: string
  message: string
  document_ids?: string[]
  top_k: number
  dense_top_k: number
  sparse_top_k: number
  dense_weight: number
  rerank_candidate_count: number
  rerank_model?: string
  embedding_model?: string
  chat_model?: string
  history_window_messages: number
}

export type RagStatelessChatRequest = RagChatRequestBase

export interface RagSessionChatRequest extends RagChatRequestBase {
  session_id?: string
}

export interface RagSourceChunk {
  rank: number
  source_id: string
  chunk_key: string
  document_id: string
  document_name: string
  chunk_index: number
  context_header: string
  text: string
  dense_score: number
  sparse_score: number
  hybrid_score: number
  original_rank: number
  rerank_score: number
}

export interface RagHybridCandidateChunk {
  rank: number
  source_id: string
  chunk_key: string
  document_id: string
  document_name: string
  chunk_index: number
  context_header: string
  text: string
  dense_score: number
  sparse_score: number
  hybrid_score: number
}

export interface RagSourceDocument {
  document_id: string
  document_name: string
  hit_count: number
  top_rank: number
  chunk_indices: number[]
}

export interface RagChatResponse {
  mode: RagChatMode
  session_id: string | null
  project_id: string
  query: string
  answer: string
  chat_model: string
  embedding_model: string
  rerank_model: string
  hybrid_candidates: RagHybridCandidateChunk[]
  sources: RagSourceChunk[]
  documents: RagSourceDocument[]
  citations_used: string[]
  created_at: string
}

export interface RagChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  isStreaming?: boolean
}

export interface RagSessionEntry {
  id: string
  projectId: string
  title: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface RagSessionMessageRecord {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export interface RagSessionSummaryRecord {
  id: string
  project_id: string
  title: string
  message_count: number
  created_at: string
  updated_at: string
}

export interface RagSessionDetailRecord extends RagSessionSummaryRecord {
  selected_document_ids: string[]
  selected_source_id: string | null
  latest_response: RagChatResponse | null
  messages: RagSessionMessageRecord[]
}

export interface RagSessionListResponse {
  sessions: RagSessionSummaryRecord[]
}

export interface RagSessionCreateRequest {
  project_id: string
  title?: string
  selected_document_ids?: string[]
}

export interface RagSessionUpdateRequest {
  project_id?: string
  title?: string
  selected_document_ids?: string[]
  selected_source_id?: string | null
  latest_response?: RagChatResponse | null
  messages?: RagSessionMessageRecord[]
}

export interface RagApiErrorResponse {
  detail?: string
}
