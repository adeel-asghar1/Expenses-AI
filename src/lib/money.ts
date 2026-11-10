/** Money helpers. Amounts travel as JSON strings ("1234.56"); keep that contract. */

export const EPSILON = 0.005

const groupInt = (int: string) => int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** "1234.5" → "1,234.50 BRL". Negative values render with a leading minus. */
export function formatMoney(value: string | number | null | undefined, currency: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return `0.00 ${currency}`
  const abs = Math.abs(n)
  const [int, dec] = abs.toFixed(2).split('.')
  return `${n < 0 ? '-' : ''}${groupInt(int)}.${dec} ${currency}`
}

/** Sign-aware balance formatting: +1,000.00 / -1,000.00 / 0.00 */
export function formatSignedMoney(value: string | number | null | undefined, currency: string): string {
  const n = Number(value)
  const safe = Number.isFinite(n) ? n : 0
  const sign = safe > EPSILON ? '+' : safe < -EPSILON ? '-' : ''
  return `${sign}${formatMoney(Math.abs(safe), currency)}`
}

/** Sum of editable text amounts, tolerating blank/invalid entries (they count as 0). */
export function sumAmounts(values: (string | null | undefined)[]): number {
  return values.reduce((sum, value) => {
    const parsed = Number(value)
    return sum + (Number.isFinite(parsed) ? parsed : 0)
  }, 0)
}

/** Allocation vs total equality within a cent. */
export function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPSILON
}

export function isValidAmount(value: string | number | null | undefined): boolean {
  const n = Number(value)
  return Number.isFinite(n) && n > 0
}

/** "3000" -> "3000.00" for API payloads; preserves the backend's Decimal-friendly shape. */
export function toApiAmount(value: string | number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}
