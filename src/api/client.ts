/**
 * HTTP client — the single place where network access is configured.
 *
 * Nothing outside `src/api/` should call `fetch` directly. Base URL, auth
 * headers, retries and error normalization all belong here, so swapping the
 * backend or adding authentication touches exactly one file.
 *
 * There is no backend yet: the modules in this folder currently resolve from
 * local data. This client is already wired so that flipping them over is a
 * one-line change at each call site.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number
  readonly path: string

  constructor(status: number, path: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.path = path
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(response.status, path, await response.text())
  }

  return (await response.json()) as T
}

export const client = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
