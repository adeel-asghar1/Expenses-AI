/** Local (device) date helpers. Backend stores expense_date as YYYY-MM-DD. */

export function todayISO(offsetDays = 0): string {
  const now = new Date()
  now.setDate(now.getDate() + offsetDays)
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00`)
  return !Number.isNaN(d.getTime())
}

/** "2026-11-11" → "Today" / "Yesterday" / "12 Nov 2026" */
export function dateLabel(isoDate: string | null | undefined): string {
  if (!isoDate || !isValidISODate(isoDate)) return '—'
  if (isoDate === todayISO()) return 'Today'
  if (isoDate === todayISO(-1)) return 'Yesterday'
  const d = new Date(`${isoDate}T00:00:00`)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Naive SQLite datetime ("2026-11-11 18:03:00" or ISO) → "11 Nov 2026 · 18:03" */
export function dateTimeLabel(value: string | null | undefined): string {
  if (!value) return '—'
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 16)
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} · ${time}`
}
