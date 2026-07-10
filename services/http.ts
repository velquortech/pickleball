// Axios layer for all service files. Three clients:
//   api       — public endpoints (no session required)
//   authApi   — staff endpoints: refuses to fire without a Supabase session,
//               attaches the access token, and kicks the user to /admin/login
//               on 401 responses.
//   playerApi — the same contract for registered players, bouncing to
//               /auth/login instead. Protection lives HERE, not in components.

import axios, { isAxiosError, type AxiosInstance, type Method } from 'axios'
import { createClient } from '@/config/supabase/client'

export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export const ADMIN_LOGIN_PATH = '/admin/login'
export const PLAYER_LOGIN_PATH = '/auth/login'

function redirectToLogin(loginPath: string) {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith(loginPath)) {
    window.location.assign(loginPath)
  }
}

function toServiceError(error: unknown): ServiceError {
  if (error instanceof ServiceError) return error
  if (isAxiosError(error)) {
    const body = error.response?.data as { error?: string } | undefined
    return new ServiceError(
      error.response?.status ?? 0,
      body?.error ?? `Request failed (${error.response?.status ?? 'network'})`
    )
  }
  return new ServiceError(0, 'Something went wrong')
}

const publicInstance = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

// Builds an instance that never leaves the browser without a session and that
// bounces expired sessions to the right sign-in page for that audience.
function createAuthInstance(loginPath: string): AxiosInstance {
  const instance = axios.create({ headers: { 'Content-Type': 'application/json' } })

  instance.interceptors.request.use(async (config) => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      redirectToLogin(loginPath)
      throw new ServiceError(401, 'Your session has expired — please sign in again')
    }

    config.headers.set('Authorization', `Bearer ${session.access_token}`)
    return config
  })

  // If the server still rejects the session (revoked, role removed), send the
  // user to sign in again instead of leaving dead buttons around.
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        redirectToLogin(loginPath)
      }
      return Promise.reject(error)
    }
  )

  return instance
}

// Every API response is enveloped as { data } | { error } (app/api/_lib/http.ts).
async function request<T>(
  instance: AxiosInstance,
  method: Method,
  url: string,
  body?: unknown
): Promise<T> {
  try {
    const response = await instance.request<{ data: T }>({ method, url, data: body })
    return response.data.data
  } catch (error) {
    throw toServiceError(error)
  }
}

function buildClient(instance: AxiosInstance) {
  return {
    get: <T>(url: string) => request<T>(instance, 'GET', url),
    post: <T>(url: string, body?: unknown) => request<T>(instance, 'POST', url, body),
    patch: <T>(url: string, body?: unknown) => request<T>(instance, 'PATCH', url, body),
    delete: <T>(url: string) => request<T>(instance, 'DELETE', url),
  }
}

export const api = buildClient(publicInstance)
export const authApi = buildClient(createAuthInstance(ADMIN_LOGIN_PATH))
export const playerApi = buildClient(createAuthInstance(PLAYER_LOGIN_PATH))
