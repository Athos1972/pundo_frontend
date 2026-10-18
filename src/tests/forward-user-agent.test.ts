// F6998 — Helfer für X-Forwarded-User-Agent
import { describe, it, expect } from 'vitest'
import {
  forwardedUserAgentValue,
  forwardedUserAgentHeaders,
  forwardedPrefetchHeaders,
  FORWARDED_UA_HEADER,
  MAX_FORWARDED_UA_LENGTH,
} from '@/lib/proxy/forward-user-agent'

const h = (o: Record<string, string>) => new Headers(o)

describe('forwardedUserAgentValue', () => {
  it('uses the incoming user-agent', () => {
    expect(forwardedUserAgentValue(h({ 'user-agent': 'Mozilla/5.0 Chrome/129' }))).toBe('Mozilla/5.0 Chrome/129')
  })

  it('ignores an incoming X-Forwarded-User-Agent (AC7)', () => {
    const v = forwardedUserAgentValue(h({ 'user-agent': 'AhrefsBot/7.0', 'x-forwarded-user-agent': 'Mozilla/5.0 Chrome' }))
    expect(v).toBe('AhrefsBot/7.0')
  })

  it('truncates to 512 characters (AC9)', () => {
    const v = forwardedUserAgentValue(h({ 'user-agent': 'a'.repeat(10_000) }))
    expect(v).toHaveLength(MAX_FORWARDED_UA_LENGTH)
  })

  it('returns empty string for a missing or blank user-agent', () => {
    expect(forwardedUserAgentValue(h({}))).toBe('')
    expect(forwardedUserAgentValue(h({ 'user-agent': '   ' }))).toBe('')
  })

  it('replaces non-printable-ASCII characters so fetch() cannot throw', () => {
    const headers = { get: () => 'Boté\u0001/1.0 中' } as unknown as Headers
    const v = forwardedUserAgentValue(headers)
    expect(v).toBe('Bot??/1.0 ?')
    expect(() => new Headers({ [FORWARDED_UA_HEADER]: v })).not.toThrow()
  })
})

describe('forwardedUserAgentHeaders', () => {
  it('returns the header even when the value is empty', () => {
    expect(forwardedUserAgentHeaders(h({}))).toEqual({ 'X-Forwarded-User-Agent': '' })
  })
  it('returns exactly one header', () => {
    expect(forwardedUserAgentHeaders(h({ 'user-agent': 'x' }))).toEqual({ 'X-Forwarded-User-Agent': 'x' })
  })
})

describe('forwardedPrefetchHeaders (B6998-001)', () => {
  it('sends X-Forwarded-Prefetch: 1 only for a prefetch render', () => {
    expect(forwardedPrefetchHeaders(true)).toEqual({ 'X-Forwarded-Prefetch': '1' })
    expect(forwardedPrefetchHeaders(false)).toEqual({})
  })
})
