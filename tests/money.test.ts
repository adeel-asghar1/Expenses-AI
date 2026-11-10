import { describe, it, expect } from 'vitest'
import {
  formatMoney, formatSignedMoney, sumAmounts, amountsMatch, isValidAmount, toApiAmount, EPSILON,
} from '../src/lib/money'

describe('formatMoney', () => {
  it('formats positive amounts with grouping and 2dp', () => {
    expect(formatMoney('1234567.5', 'PKR')).toBe('1,234,567.50 PKR')
    expect(formatMoney('3000', 'PKR')).toBe('3,000.00 PKR')
    expect(formatMoney('0.5', 'PKR')).toBe('0.50 PKR')
  })
  it('formats negative amounts with a leading minus', () => {
    expect(formatMoney('-1500', 'PKR')).toBe('-1,500.00 PKR')
  })
  it('handles junk input safely', () => {
    expect(formatMoney('garbage', 'PKR')).toBe('0.00 PKR')
    expect(formatMoney(null, 'PKR')).toBe('0.00 PKR')
    expect(formatMoney(undefined, 'PKR')).toBe('0.00 PKR')
  })
})

describe('formatSignedMoney', () => {
  it('prefixes positive with +', () => {
    expect(formatSignedMoney('2500', 'PKR')).toBe('+2,500.00 PKR')
  })
  it('prefixes negative with -', () => {
    expect(formatSignedMoney('-1500', 'PKR')).toBe('-1,500.00 PKR')
  })
  it('shows zero without sign', () => {
    expect(formatSignedMoney('0.00', 'PKR')).toBe('0.00 PKR')
    expect(formatSignedMoney('0.001', 'PKR')).toBe('0.00 PKR')
  })
})

describe('sumAmounts', () => {
  it('sums numeric strings, tolerating junk', () => {
    expect(sumAmounts(['1500', '4000', '2000'])).toBe(7500)
    expect(sumAmounts(['1000.50', '', 'abc', '999.50'])).toBe(2000)
    expect(sumAmounts([])).toBe(0)
  })
})

describe('amountsMatch', () => {
  it('treats sub-cent differences as equal', () => {
    expect(amountsMatch(7500, 7500 + EPSILON / 2)).toBe(true)
    expect(amountsMatch(7500, 7501)).toBe(false)
  })
})

describe('isValidAmount', () => {
  it('accepts positive finite numbers', () => {
    expect(isValidAmount('1')).toBe(true)
    expect(isValidAmount('0.01')).toBe(true)
    expect(isValidAmount(0)).toBe(false)
    expect(isValidAmount('-5')).toBe(false)
    expect(isValidAmount('abc')).toBe(false)
  })
})

describe('toApiAmount', () => {
  it('normalizes to 2dp strings', () => {
    expect(toApiAmount('1500')).toBe('1500.00')
    expect(toApiAmount('123.456')).toBe('123.46')
  })
})
