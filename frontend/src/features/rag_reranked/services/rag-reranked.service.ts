import { ingestionRequest, ragRequest, ragStreamRequest, RagApiError } from "./rag-api-client"
import type {
  RagChatResponse,
  RagSessionCreateRequest,
  RagSessionDetailRecord,
  RagSessionListResponse,
  RagSessionSummaryRecord,
  RagSessionUpdateRequest,
  RagDocumentSummary,
  RagProjectListResponse,
  RagProjectRecord,
  RagSessionChatRequest,
  RagStatelessChatRequest,
} from "../types/rag"

interface RagRequestOptions {
  signal?: AbortSignal
}

export interface RagStreamHandlers {
  onMeta?: (payload: Record<string, unknown>) => void
  onDelta?: (payload: { content: string }) => void
  onDone?: (payload: RagChatResponse) => void
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

export async function listRagSessions(projectId?: string): Promise<RagSessionSummaryRecord[]> {
  const query = typeof projectId === "string" && projectId.trim().length > 0 ? `?project_id=${projectId}` : ""
  const response = await ragRequest<RagSessionListResponse>(`/reranked/sessions${query}`, {
    method: "GET",
  })
  return response.sessions
}

export async function createRagSession(payload: RagSessionCreateRequest): Promise<RagSessionDetailRecord> {
  return ragRequest<RagSessionDetailRecord>("/reranked/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function getRagSession(sessionId: string): Promise<RagSessionDetailRecord> {
  return ragRequest<RagSessionDetailRecord>(`/reranked/sessions/${sessionId}`, {
    method: "GET",
  })
}

export async function updateRagSession(
  sessionId: string,
  payload: RagSessionUpdateRequest,
): Promise<RagSessionDetailRecord> {
  return ragRequest<RagSessionDetailRecord>(`/reranked/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteRagSession(sessionId: string): Promise<void> {
  await ragRequest<null>(`/reranked/sessions/${sessionId}`, {
    method: "DELETE",
  })
}

export async function sendStatelessRerankedChat(
  payload: RagStatelessChatRequest,
  options?: RagRequestOptions,
): Promise<RagChatResponse> {
  return ragRequest<RagChatResponse>("/rag/reranked/chat/stateless", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options?.signal,
  })
}

export async function sendSessionRerankedChat(
  payload: RagSessionChatRequest,
  options?: RagRequestOptions,
): Promise<RagChatResponse> {
  return ragRequest<RagChatResponse>("/rag/reranked/chat/session", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options?.signal,
  })
}

function parseSseEventChunk(rawChunk: string): { eventName: string; dataPayload: unknown } | null {
  const normalizedChunk = rawChunk.replace(/\r\n/g, "\n").trim()
  if (normalizedChunk.length === 0) {
    return null
  }

  let eventName = "message"
  const dataLines: string[] = []

  for (const line of normalizedChunk.split("\n")) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim()
      continue
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim())
    }
  }

  const payloadText = dataLines.join("\n")
  if (payloadText.length === 0) {
    return {
      eventName,
      dataPayload: {},
    }
  }

  try {
    return {
      eventName,
      dataPayload: JSON.parse(payloadText) as unknown,
    }
  } catch {
    throw new RagApiError("Malformed SSE payload from RAG backend.", 502)
  }
}

async function runRerankedStream(
  path: string,
  payload: RagStatelessChatRequest | RagSessionChatRequest,
  handlers: RagStreamHandlers,
  options?: RagRequestOptions,
): Promise<RagChatResponse> {
  const response = await ragStreamRequest(path, {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options?.signal,
  })

  if (response.body === null) {
    throw new RagApiError("RAG backend did not return a stream body.", 502)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let donePayload: RagChatResponse | null = null

  while (true) {
    const readResult = await reader.read()
    if (readResult.done) {
      break
    }

    buffer += decoder.decode(readResult.value, { stream: true })

    let boundaryIndex = buffer.indexOf("\n\n")
    while (boundaryIndex !== -1) {
      const chunk = buffer.slice(0, boundaryIndex)
      buffer = buffer.slice(boundaryIndex + 2)

      const parsed = parseSseEventChunk(chunk)
      if (parsed !== null) {
        const { eventName, dataPayload } = parsed
        if (eventName === "meta") {
          if (typeof dataPayload === "object" && dataPayload !== null) {
            handlers.onMeta?.(dataPayload as Record<string, unknown>)
          }
        } else if (eventName === "delta") {
          if (typeof dataPayload === "object" && dataPayload !== null && "content" in dataPayload) {
            const content = (dataPayload as { content?: unknown }).content
            handlers.onDelta?.({ content: typeof content === "string" ? content : "" })
          }
        } else if (eventName === "done") {
          donePayload = dataPayload as RagChatResponse
          handlers.onDone?.(donePayload)
        } else if (eventName === "error") {
          const detail =
            typeof dataPayload === "object" && dataPayload !== null && "detail" in dataPayload
              ? (dataPayload as { detail?: unknown }).detail
              : undefined
          throw new RagApiError(
            typeof detail === "string" && detail.trim().length > 0 ? detail : "Streaming request failed.",
            502,
          )
        }
      }

      boundaryIndex = buffer.indexOf("\n\n")
    }
  }

  if (donePayload === null) {
    throw new RagApiError("RAG stream ended before completion payload.", 502)
  }

  return donePayload
}

export async function streamStatelessRerankedChat(
  payload: RagStatelessChatRequest,
  handlers: RagStreamHandlers,
  options?: RagRequestOptions,
): Promise<RagChatResponse> {
  return runRerankedStream("/rag/reranked/chat/stateless/stream", payload, handlers, options)
}

export async function streamSessionRerankedChat(
  payload: RagSessionChatRequest,
  handlers: RagStreamHandlers,
  options?: RagRequestOptions,
): Promise<RagChatResponse> {
  return runRerankedStream("/rag/reranked/chat/session/stream", payload, handlers, options)
}
