// B6220-002 — Unit tests for src/lib/proxy/client-ip.ts
import { describe, it, expect } from 'vitest'
import { getClientIp, clientIpForwardHeaders } from '@/lib/proxy/client-ip'

const h = (init: Record<string, string>) => new Headers(init)

describe('getClientIp', () => {
  it('returns a single IPv4', () => {
    expect(getClientIp(h({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7')
  })
  it('returns IPv6 and IPv4-mapped IPv6', () => {
    expect(getClientIp(h({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1')
    expect(getClientIp(h({ 'x-forwarded-for': '::ffff:127.0.0.1' }))).toBe('::ffff:127.0.0.1')
  })
  it('takes the rightmost entry of a chain (spoofed left entries ignored)', () => {
    expect(getClientIp(h({ 'x-forwarded-for': '1.1.1.1, 203.0.113.7' }))).toBe('203.0.113.7')
    expect(getClientIp(h({ 'x-forwarded-for': '1.1.1.1,2.2.2.2 ,  203.0.113.7  ' }))).toBe('203.0.113.7')
  })
  it('returns undefined for an invalid rightmost entry (no fallback to the left)', () => {
    expect(getClientIp(h({ 'x-forwarded-for': '203.0.113.7, evil' }))).toBeUndefined()
    expect(getClientIp(h({ 'x-forwarded-for': '203.0.113.7, 999.1.1.1' }))).toBeUndefined()
    expect(getClientIp(h({ 'x-forwarded-for': '203.0.113.7:8080' }))).toBeUndefined()
  })
  it('returns undefined for empty entries / whitespace', () => {
    expect(getClientIp(h({ 'x-forwarded-for': '' }))).toBeUndefined()
    expect(getClientIp(h({ 'x-forwarded-for': '   ' }))).toBeUndefined()
    expect(getClientIp(h({ 'x-forwarded-for': '203.0.113.7,' }))).toBeUndefined()
  })
  it('returns undefined when the header is missing', () => {
    expect(getClientIp(h({}))).toBeUndefined()
  })
  it('returns undefined for an oversized header', () => {
    const big = Array(300).fill('1.1.1.1').join(', ') + ', 203.0.113.7'
    expect(big.length).toBeGreaterThan(1024)
    expect(getClientIp(h({ 'x-forwarded-for': big }))).toBeUndefined()
  })
  it('ignores cf-connecting-ip, x-real-ip and forwarded', () => {
    expect(
      getClientIp(h({ 'cf-connecting-ip': '203.0.113.8', 'x-real-ip': '203.0.113.9', forwarded: 'for=203.0.113.10' })),
    ).toBeUndefined()
  })
})

describe('clientIpForwardHeaders', () => {
  it('emits only X-Forwarded-For with the validated IP', () => {
    expect(
      clientIpForwardHeaders(h({ 'x-forwarded-for': '9.9.9.9, 203.0.113.7', 'cf-connecting-ip': '1.2.3.4' })),
    ).toEqual({ 'X-Forwarded-For': '203.0.113.7' })
  })
  it('emits nothing for invalid/missing input', () => {
    expect(clientIpForwardHeaders(h({ 'x-forwarded-for': 'nope' }))).toEqual({})
    expect(clientIpForwardHeaders(h({}))).toEqual({})
  })
})
