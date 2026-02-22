import type { RagApiErrorResponse } from "../types/rag"

const dockerServiceHosts = new Set(["backend-ingestion", "backend-rag", "backend-inference"])

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

function resolveApiBaseUrl(configuredValue: string): string {
  const configured = stripTrailingSlash(configuredValue)

  if (typeof window === "undefined") {
    return configured
  }

  try {
    const parsed = new URL(configured)
    if (!dockerServiceHosts.has(parsed.hostname)) {
      return configured
    }

    const runtimeHost = window.location.hostname || "localhost"
    parsed.hostname = runtimeHost
    return stripTrailingSlash(parsed.toString())
  } catch {
    return configured
  }
}

export class RagApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parseApiErrorMessage(response: Response): Promise<string> {
  let message = `Request failed with status ${response.status}`
  try {
    const payload = (await response.json()) as RagApiErrorResponse
    if (payload.detail !== undefined && payload.detail.length > 0) {
      message = payload.detail
    }
  } catch {
    message = `Request failed with status ${response.status}`
  }
  return message
}

function buildRequester(baseUrl: string) {
  return async function request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
    const headers = new Headers(init.headers ?? undefined)
    if (!headers.has("content-type") && init.body !== undefined) {
      headers.set("content-type", "application/json")
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    })

    if (!response.ok) {
      const message = await parseApiErrorMessage(response)
      throw new RagApiError(message, response.status)
    }

    return (await response.json()) as TResponse
  }
}

const ingestionBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/v1")
const ragBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_RAG_API_BASE_URL ?? "http://localhost:8020/v1")

export const ingestionRequest = buildRequester(ingestionBaseUrl)
export const ragRequest = buildRequester(ragBaseUrl)
export const ragApiBaseUrl = ragBaseUrl

export async function ragStreamRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? undefined)
  if (!headers.has("content-type") && init.body !== undefined) {
    headers.set("content-type", "application/json")
  }
  headers.set("accept", "text/event-stream")

  const response = await fetch(`${ragApiBaseUrl}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const message = await parseApiErrorMessage(response)
    throw new RagApiError(message, response.status)
  }

  return response
}
