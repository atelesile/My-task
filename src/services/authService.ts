import { ApiError, apiRequest } from './api'

export interface AuthUser {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export interface SessionResponse {
  user?: AuthUser
  expires?: string
}

interface CsrfResponse {
  csrfToken: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export async function register(input: RegisterInput, signal?: AbortSignal): Promise<unknown> {
  return apiRequest('/register', {
    method: 'POST',
    body: JSON.stringify(input),
  }, signal)
}

export async function getSession(signal?: AbortSignal): Promise<SessionResponse | null> {
  const session = await apiRequest<SessionResponse | null>('/auth/session', {
    method: 'GET',
  }, signal)

  return session?.user ? session : null
}

export async function getCsrfToken(signal?: AbortSignal): Promise<string> {
  const result = await apiRequest<CsrfResponse>('/auth/csrf', {
    method: 'GET',
  }, signal)
  return result.csrfToken
}

export async function login(
  email: string,
  password: string,
  signal?: AbortSignal,
): Promise<void> {
  const csrfToken = await getCsrfToken(signal)
  const body = new URLSearchParams({
    csrfToken,
    callbackUrl: `${window.location.origin}/tasks`,
    email,
    password,
  })

  const result = await apiRequest<{ url?: string }>('/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body,
  }, signal)

  if (result?.url) {
    const url = new URL(result.url)
    if (url.searchParams.has('error') || url.searchParams.has('code')) {
      throw new ApiError(401, 'Invalid email or password.', 'UNAUTHENTICATED')
    }
  }
}

export async function logout(signal?: AbortSignal): Promise<void> {
  const csrfToken = await getCsrfToken(signal)
  const body = new URLSearchParams({
    csrfToken,
    callbackUrl: `${window.location.origin}/login`,
  })

  await apiRequest<unknown>('/auth/signout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body,
  }, signal)
}
