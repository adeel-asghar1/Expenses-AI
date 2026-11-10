import { describe, it, expect } from 'vitest'
import { errorDetailText } from '../src/api/client'
import { apiUrlProblem, normalizeApiUrl } from '../src/lib/url'

describe('errorDetailText', () => {
  it('uses a plain string detail', () => {
    expect(errorDetailText('Payer must belong to this group', 'fallback')).toBe(
      'Payer must belong to this group',
    )
  })
  it('flattens FastAPI validation arrays', () => {
    const detail = [
      { msg: 'field required', loc: ['body', 'total_amount'] },
      { msg: 'value too small', loc: ['body', 'items'] },
    ]
    expect(errorDetailText(detail, 'fallback')).toBe('field required; value too small')
  })
  it('falls back when detail is missing or unusable', () => {
    expect(errorDetailText(undefined, 'fallback')).toBe('fallback')
    expect(errorDetailText({}, 'fallback')).toBe('fallback')
    expect(errorDetailText([], 'fallback')).toBe('fallback')
  })
})

describe('normalizeApiUrl', () => {
  it('trims and strips trailing slashes', () => {
    expect(normalizeApiUrl('  http://10.168.226.205:8000/  ')).toBe('http://10.168.226.205:8000')
  })
})

describe('apiUrlProblem', () => {
  it('rejects localhost for phone safety', () => {
    expect(apiUrlProblem('http://localhost:8000')).toMatch(/localhost/i)
    expect(apiUrlProblem('http://127.0.0.1:8000')).toMatch(/localhost/i)
    expect(apiUrlProblem('http://[::1]:8000')).toMatch(/localhost/i)
  })
  it('rejects malformed URLs and wrong schemes', () => {
    expect(apiUrlProblem('10.168.226.205:8000')).toMatch(/http/i)
    expect(apiUrlProblem('not a url')).toBeTruthy()
  })
  it('accepts a LAN address', () => {
    expect(apiUrlProblem('http://10.168.226.205:8000')).toBeNull()
    expect(apiUrlProblem('http://192.168.1.10:8000/')).toBeNull()
  })
})
