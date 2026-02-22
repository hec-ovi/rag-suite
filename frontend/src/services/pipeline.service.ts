import { apiRequest } from "./api-client"
import type {
  AutomaticPreviewRequest,
  AutomaticPreviewResponse,
  CancelOperationResponse,
  ChunkSummaryRecord,
  ChunkTextRequest,
  ChunkTextResponse,
  ContextualizeChunksRequest,
  ContextualizeChunksResponse,
  CreateProjectRequest,
  DeleteProjectResponse,
  DocumentSummaryRecord,
  IngestDocumentRequest,
  IngestedDocumentResponse,
  NormalizeTextRequest,
  NormalizeTextResponse,
  ProjectListResponse,
  ProjectRecord,
} from "../types/pipeline"

interface PipelineRequestOptions {
  signal?: AbortSignal
  operationId?: string
}

function buildOperationHeaders(operationId?: string): HeadersInit | undefined {
  if (!operationId) {
    return undefined
  }
  return {
    "X-Operation-Id": operationId,
  }
}

export async function createProject(data: CreateProjectRequest): Promise<ProjectRecord> {
  return apiRequest<ProjectRecord>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const response = await apiRequest<ProjectListResponse>("/projects", {
    method: "GET",
  })
  return response.projects
}

export async function deleteProject(projectId: string): Promise<DeleteProjectResponse> {
  return apiRequest<DeleteProjectResponse>(`/projects/${projectId}`, {
    method: "DELETE",
  })
}

export async function listProjectDocuments(projectId: string): Promise<DocumentSummaryRecord[]> {
  return apiRequest<DocumentSummaryRecord[]>(`/projects/${projectId}/documents`, {
    method: "GET",
  })
}

export async function listDocumentChunks(documentId: string): Promise<ChunkSummaryRecord[]> {
  return apiRequest<ChunkSummaryRecord[]>(`/projects/documents/${documentId}/chunks`, {
    method: "GET",
  })
}

export async function normalizeText(data: NormalizeTextRequest): Promise<NormalizeTextResponse> {
  return apiRequest<NormalizeTextResponse>("/pipeline/normalize", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function proposeChunks(
  data: ChunkTextRequest,
  options?: PipelineRequestOptions,
): Promise<ChunkTextResponse> {
  return apiRequest<ChunkTextResponse>("/pipeline/chunk", {
    method: "POST",
    body: JSON.stringify(data),
    signal: options?.signal,
    headers: buildOperationHeaders(options?.operationId),
  })
}

export async function contextualizeChunks(
  data: ContextualizeChunksRequest,
  options?: PipelineRequestOptions,
): Promise<ContextualizeChunksResponse> {
  return apiRequest<ContextualizeChunksResponse>("/pipeline/contextualize", {
    method: "POST",
    body: JSON.stringify(data),
    signal: options?.signal,
    headers: buildOperationHeaders(options?.operationId),
  })
}

export async function cancelPipelineOperation(operationId: string): Promise<CancelOperationResponse> {
  return apiRequest<CancelOperationResponse>(`/pipeline/operations/${operationId}/cancel`, {
    method: "POST",
  })
}

export async function previewAutomaticPipeline(
  data: AutomaticPreviewRequest,
): Promise<AutomaticPreviewResponse> {
  return apiRequest<AutomaticPreviewResponse>("/pipeline/preview-automatic", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function ingestDocument(
  projectId: string,
  data: IngestDocumentRequest,
): Promise<IngestedDocumentResponse> {
  return apiRequest<IngestedDocumentResponse>(`/projects/${projectId}/documents/ingest`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}
