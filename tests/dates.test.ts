import { describe, it, expect } from 'vitest'
import { todayISO, dateLabel, isValidISODate, dateTimeLabel } from '../src/lib/dates'

describe('todayISO', () => {
  it('returns YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('offset days differ by whole days', () => {
    expect(todayISO(-1)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(todayISO(-1) <= todayISO()).toBe(true)
  })
})

describe('isValidISODate', () => {
  it('accepts real dates', () => {
    expect(isValidISODate('2026-11-11')).toBe(true)
  })
  it('rejects malformed or nonexistent dates', () => {
    expect(isValidISODate('11/11/2026')).toBe(false)
    expect(isValidISODate('not-a-date')).toBe(false)
    expect(isValidISODate('')).toBe(false)
  })
})

describe('dateLabel', () => {
  it('labels today and yesterday', () => {
    expect(dateLabel(todayISO())).toBe('Today')
    expect(dateLabel(todayISO(-1))).toBe('Yesterday')
  })
  it('labels other dates readably', () => {
    expect(dateLabel('2026-03-15')).toBe('15 Mar 2026')
  })
  it('renders a dash for invalid input', () => {
    expect(dateLabel('garbage')).toBe('—')
    expect(dateLabel(null)).toBe('—')
  })
})

describe('dateTimeLabel', () => {
  it('handles sqlite space-separated datetimes', () => {
    const label = dateTimeLabel('2026-11-11 18:03:00')
    expect(label).toContain('11 Nov 2026')
  })
  it('tolerates garbage', () => {
    expect(dateTimeLabel('nonsense')).toBeTruthy()
    expect(dateTimeLabel(null)).toBe('—')
  })
})
