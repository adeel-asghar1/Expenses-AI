/** Typed fetch wrapper. All backend traffic flows through here. */

export class ApiError extends Error {
  readonly status: number | null
  readonly detail?: unknown
  constructor(message: string, status: number | null, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

/** Normalize FastAPI error bodies (string detail | validation array) into one readable sentence. */
export function errorDetailText(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const parts = detail
      .map((entry) => (entry && typeof entry === 'object' && 'msg' in entry ? String((entry as { msg?: unknown }).msg ?? '') : ''))
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length) return parts.join('; ')
  }
  return fallback
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Defaults to 30s; AI parsing passes a much larger budget. */
  timeoutMs?: number
}

let baseUrlProvider: () => string = () => 'http://10.168.226.205:8000'

/** Decouples this module from the store import cycle; bound once in app/_layout. */
export const bindApiBaseUrl = (provider: () => string) => {
  baseUrlProvider = provider
}

export const currentApiBaseUrl = () => baseUrlProvider()

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = baseUrlProvider().replace(/\/+$/, '')
  const { method = 'GET', body, timeoutMs = 30000 } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
    const text = await response.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        throw new ApiError('The server returned an unreadable response.', response.status)
      }
    }
    if (!response.ok) {
      const detail = (data as { detail?: unknown } | null)?.detail
      const fallback = `The server rejected the request (HTTP ${response.status}).`
      throw new ApiError(errorDetailText(detail, fallback), response.status, detail)
    }
    return data as T
  } catch (cause) {
    if (cause instanceof ApiError) throw cause
    const aborted = cause instanceof Error && cause.name === 'AbortError'
    if (aborted) {
      throw new ApiError('The server did not answer in time. Is the laptop backend running?', null)
    }
    throw new ApiError(
      `Could not reach the laptop server at ${base}. Check Settings → Server and make sure the backend is running on the same Wi-Fi.`,
      null,
    )
  } finally {
    clearTimeout(timer)
  }
}

export const wsUrlFor = (apiBase: string, groupId: number): string => {
  const base = apiBase.replace(/\/+$/, '')
  const wsBase = base.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://')
  return `${wsBase}/ws/groups/${groupId}`
}
