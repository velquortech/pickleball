// Axios layer for all service files. Two clients:
//   api     — public endpoints (no session required)
//   authApi — staff endpoints: refuses to fire without a Supabase session,
//             attaches the access token, and kicks the user to /admin/login
//             on 401/403 responses. Protection lives HERE, not in components.

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

const LOGIN_PATH = '/admin/login'

function redirectToLogin() {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith(LOGIN_PATH)) {
    window.location.assign(LOGIN_PATH)
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

const authInstance = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

// Hard gate: authenticated calls never leave the browser without a session.
authInstance.interceptors.request.use(async (config) => {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirectToLogin()
    throw new ServiceError(401, 'Your session has expired — please sign in again')
  }

  config.headers.set('Authorization', `Bearer ${session.access_token}`)
  return config
})

// If the server still rejects the session (revoked, role removed), sign the
// user out of the dashboard instead of leaving dead buttons around.
authInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      redirectToLogin()
    }
    return Promise.reject(error)
  }
)

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
export const authApi = buildClient(authInstance)
