import { ingestionRequest, ragRequest } from "./rag-api-client"
import type {
  RagChatResponse,
  RagDocumentSummary,
  RagProjectListResponse,
  RagProjectRecord,
  RagSessionChatRequest,
  RagStatelessChatRequest,
} from "../types/rag"

interface RagRequestOptions {
  signal?: AbortSignal
}

export async function listRagProjects(): Promise<RagProjectRecord[]> {
  const response = await ingestionRequest<RagProjectListResponse>("/projects", {
    method: "GET",
  })
  return response.projects
}

export async function listRagProjectDocuments(projectId: string): Promise<RagDocumentSummary[]> {
  return ingestionRequest<RagDocumentSummary[]>(`/projects/${projectId}/documents`, {
    method: "GET",
  })
}

export async function sendStatelessHybridChat(
  payload: RagStatelessChatRequest,
  options?: RagRequestOptions,
): Promise<RagChatResponse> {
  return ragRequest<RagChatResponse>("/rag/chat/stateless", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options?.signal,
  })
}

export async function sendSessionHybridChat(
  payload: RagSessionChatRequest,
  options?: RagRequestOptions,
): Promise<RagChatResponse> {
  return ragRequest<RagChatResponse>("/rag/chat/session", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options?.signal,
  })
}
