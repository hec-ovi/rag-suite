import type { ApiErrorResponse } from "../types/pipeline"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/v1"

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
