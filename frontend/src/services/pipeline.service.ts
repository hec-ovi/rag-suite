import { apiRequest } from "./api-client"
import type {
  AutomaticPreviewRequest,
  AutomaticPreviewResponse,
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

export async function proposeChunks(data: ChunkTextRequest): Promise<ChunkTextResponse> {
  return apiRequest<ChunkTextResponse>("/pipeline/chunk", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function contextualizeChunks(
  data: ContextualizeChunksRequest,
): Promise<ContextualizeChunksResponse> {
  return apiRequest<ContextualizeChunksResponse>("/pipeline/contextualize", {
    method: "POST",
    body: JSON.stringify(data),
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
