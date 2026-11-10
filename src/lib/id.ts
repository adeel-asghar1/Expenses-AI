import * as Crypto from 'expo-crypto'

/** UUID for idempotency keys (client_request_id). Falls back defensively. */
export function requestId(): string {
  try {
    return Crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`
  }
}
