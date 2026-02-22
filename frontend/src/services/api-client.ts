import type { ApiErrorResponse } from "../types/pipeline"

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

function resolveApiBaseUrl(): string {
  const configured = stripTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/v1")

  if (typeof window === "undefined") {
    return configured
  }

  try {
    const parsed = new URL(configured)
    if (parsed.hostname !== "backend") {
      return configured
    }

    const runtimeHost = window.location.hostname || "localhost"
    parsed.hostname = runtimeHost
    return stripTrailingSlash(parsed.toString())
  } catch {
    return configured
  }
}

const API_BASE_URL = resolveApiBaseUrl()

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<TResponse>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const payload = (await response.json()) as ApiErrorResponse
      if (payload.detail !== undefined && payload.detail.length > 0) {
        message = payload.detail
      }
    } catch {
      message = `Request failed with status ${response.status}`
    }
    throw new ApiError(message, response.status)
  }

  return (await response.json()) as TResponse
}
