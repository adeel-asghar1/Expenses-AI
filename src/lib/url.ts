/** Pure URL guard rails for the laptop API address (unit-tested). */

export const normalizeApiUrl = (url: string): string => url.trim().replace(/\/+$/, '')

/** Phones can't reach "localhost" — it means the phone itself. */
export const apiUrlProblem = (url: string): string | null => {
  const clean = normalizeApiUrl(url)
  if (!clean) return 'Enter the laptop server address.'
  if (!/^https?:\/\//i.test(clean)) return 'Start with http:// (or https://). Example: http://10.168.226.205:8000'
  try {
    const host = new URL(clean).hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
      return "A phone can't reach 'localhost' — that means this phone itself. Use the laptop's LAN IP, e.g. http://10.168.226.205:8000"
    }
  } catch {
    return 'That address does not look valid. Example: http://10.168.226.205:8000'
  }
  return null
}
