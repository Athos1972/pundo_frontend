// T1 — safe-redirect.ts unit tests (Vitest)
// Covers all bypass vectors from §3.5 of 02-architecture.md

import { describe, it, expect } from 'vitest'
import { sanitizeNextPath } from '@/lib/safe-redirect'

const FALLBACK = '/shop-admin/dashboard'

describe('sanitizeNextPath', () => {
  it('returns fallback for null', () => {
    expect(sanitizeNextPath(null)).toBe(FALLBACK)
  })

  it('returns fallback for empty string', () => {
    expect(sanitizeNextPath('')).toBe(FALLBACK)
  })

  it('rejects absolute https URL', () => {
    expect(sanitizeNextPath('https://evil.example')).toBe(FALLBACK)
  })

  it('rejects absolute http URL', () => {
    expect(sanitizeNextPath('http://evil.example')).toBe(FALLBACK)
  })

  it('rejects protocol-relative URL', () => {
    expect(sanitizeNextPath('//evil.example')).toBe(FALLBACK)
  })

  it('rejects backslash path (browser quirk vector)', () => {
    expect(sanitizeNextPath('/\\evil')).toBe(FALLBACK)
  })

  it('rejects javascript: URI', () => {
    expect(sanitizeNextPath('javascript:alert(1)')).toBe(FALLBACK)
  })

  it('rejects data: URI', () => {
    expect(sanitizeNextPath('data:text/html,<script>alert(1)</script>')).toBe(FALLBACK)
  })

  it('rejects non-shop-admin relative path', () => {
    // /admin/dashboard is valid relative path but not under /shop-admin/ → fallback
    expect(sanitizeNextPath('/admin/dashboard')).toBe(FALLBACK)
  })

  it('rejects root path /', () => {
    expect(sanitizeNextPath('/')).toBe(FALLBACK)
  })

  it('rejects path that does not start with /', () => {
    expect(sanitizeNextPath('evil/path')).toBe(FALLBACK)
  })

  it('accepts valid /shop-admin/ path', () => {
    expect(sanitizeNextPath('/shop-admin/products')).toBe('/shop-admin/products')
  })

  it('accepts /shop-admin/dashboard', () => {
    expect(sanitizeNextPath('/shop-admin/dashboard')).toBe('/shop-admin/dashboard')
  })

  it('accepts /shop-admin/ with query string', () => {
    expect(sanitizeNextPath('/shop-admin/products?page=2')).toBe('/shop-admin/products?page=2')
  })

  it('uses custom fallback when provided', () => {
    expect(sanitizeNextPath(null, '/shop-admin/profile')).toBe('/shop-admin/profile')
    expect(sanitizeNextPath('https://evil.com', '/shop-admin/profile')).toBe('/shop-admin/profile')
  })
})
