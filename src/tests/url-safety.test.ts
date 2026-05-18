import { describe, it, expect } from 'vitest'
import { sanitizeExternalUrl } from '@/lib/url-safety'

describe('sanitizeExternalUrl', () => {
  it('returns https URL unchanged', () => {
    expect(sanitizeExternalUrl('https://example.cy/p')).toBe('https://example.cy/p')
  })

  it('returns http URL unchanged', () => {
    expect(sanitizeExternalUrl('http://example.cy/p')).toBe('http://example.cy/p')
  })

  it('returns null for base64 token', () => {
    expect(sanitizeExternalUrl('Sa7Puak8aJ4JLDsUdQi7Q==')).toBeNull()
  })

  it('returns null for relative path without leading slash', () => {
    expect(sanitizeExternalUrl('relative/path')).toBeNull()
  })

  it('returns null for absolute-local path', () => {
    expect(sanitizeExternalUrl('/absolute-local')).toBeNull()
  })

  it('returns null for javascript: protocol', () => {
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeNull()
  })

  it('returns null for data: protocol', () => {
    expect(sanitizeExternalUrl('data:text/html,<h1>x</h1>')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(sanitizeExternalUrl('')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(sanitizeExternalUrl(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(sanitizeExternalUrl(undefined)).toBeNull()
  })
})
