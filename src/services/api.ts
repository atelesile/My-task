export interface ApiErrorDetails {
  path?: string
  message: string
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: ApiErrorDetails[]
  }
}

export class ApiError extends Error {
  status: number
  code?: string
  details: ApiErrorDetails[]

  constructor(status: number, message: string, code?: string, details: ApiErrorDetails[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new Error('Unable to reach TaskFlow. Check your connection and try again.', {
      cause: error,
    })
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null
    if (errorBody?.error) {
      throw new ApiError(
        response.status,
        errorBody.error.message,
        errorBody.error.code,
        errorBody.error.details,
      )
    }

    throw new ApiError(
      response.status,
      response.statusText || 'The request could not be completed.',
    )
  }

  return (body ?? undefined) as T
}
