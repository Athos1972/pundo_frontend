// Unit-Tests für src/app/api/customer/customer/auth/logout/route.ts
// Bug-Regression: B4800-001 — Google Signout funktioniert nicht
//
// Root cause: cookies set with Domain=pundo.cy (Google OAuth, bypasses proxy)
// were not cleared because the previous fix used store.delete() which emits
// a domain-free Set-Cookie: customer_token=; Max-Age=0 — that cannot match a
// domain-scoped cookie.
//
// Fix: emit TWO Set-Cookie delete headers — one without Domain (Email/OTP),
// one with Domain=<COOKIE_DOMAIN> (Google OAuth).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(token?: string): NextRequest {
  const req = new NextRequest('http://localhost:3500/api/customer/customer/auth/logout', {
    method: 'POST',
  })
  if (token) {
    // Simulate an incoming cookie
    Object.defineProperty(req, 'cookies', {
      value: {
        get: (name: string) => (name === 'customer_token' ? { value: token } : undefined),
      },
      configurable: true,
    })
  } else {
    Object.defineProperty(req, 'cookies', {
      value: { get: () => undefined },
      configurable: true,
    })
  }
  return req
}

// Collect all Set-Cookie header values from a Response
function getSetCookieHeaders(response: Response): string[] {
  // Headers.getSetCookie() is the standards-correct way; fall back to getAll
  const h = response.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof h.getSetCookie === 'function') return h.getSetCookie()
  // Node/undici fallback: iterate all header entries
  const result: string[] = []
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') result.push(value)
  })
  return result
}

// ---------------------------------------------------------------------------
// Module under test — imported AFTER env vars are set via vi.stubEnv
// ---------------------------------------------------------------------------

// We need to re-import the module per test-group because COOKIE_DOMAIN is read
// at module load time. Use vi.resetModules() + dynamic import.

async function importRoute(cookieDomain: string) {
  vi.stubEnv('COOKIE_DOMAIN', cookieDomain)
  vi.stubEnv('BACKEND_URL', 'http://localhost:8500')
  vi.resetModules()
  const mod = await import('@/app/api/customer/customer/auth/logout/route')
  return mod.POST
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('logout route — B4800-001 regression (no COOKIE_DOMAIN)', () => {
  let POST: Awaited<ReturnType<typeof importRoute>>

  beforeEach(async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    POST = await importRoute('')
  })

  it('returns 204', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(204)
  })

  it('sends exactly one Set-Cookie delete header (host-only, no domain)', async () => {
    const res = await POST(makeRequest('some-token'))
    const setCookies = getSetCookieHeaders(res)
    expect(setCookies).toHaveLength(1)
    expect(setCookies[0]).toContain('customer_token=')
    expect(setCookies[0]).toContain('Max-Age=0')
    expect(setCookies[0]).not.toMatch(/[Dd]omain=/)
  })

  it('calls backend with Authorization header when token present', async () => {
    await POST(makeRequest('abc123'))
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/customer/auth/logout'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer abc123' }),
      })
    )
  })

  it('does NOT call backend when no token present', async () => {
    await POST(makeRequest())
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('still returns 204 when backend call throws (best-effort)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'))
    const res = await POST(makeRequest('some-token'))
    expect(res.status).toBe(204)
  })
})

describe('logout route — B4800-001 regression (COOKIE_DOMAIN=pundo.cy)', () => {
  let POST: Awaited<ReturnType<typeof importRoute>>

  beforeEach(async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    POST = await importRoute('pundo.cy')
  })

  it('returns 204', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(204)
  })

  it('sends TWO Set-Cookie delete headers when COOKIE_DOMAIN is set', async () => {
    const res = await POST(makeRequest('google-token'))
    const setCookies = getSetCookieHeaders(res)
    // Must have exactly 2 — one host-only, one domain-scoped
    expect(setCookies).toHaveLength(2)
  })

  it('first header is host-only (no Domain attribute)', async () => {
    const res = await POST(makeRequest('google-token'))
    const setCookies = getSetCookieHeaders(res)
    const hostOnly = setCookies.find(c => !c.match(/[Dd]omain=/))
    expect(hostOnly).toBeDefined()
    expect(hostOnly).toContain('Max-Age=0')
  })

  it('second header has Domain=pundo.cy — clears Google OAuth cookie (B4800-001)', async () => {
    const res = await POST(makeRequest('google-token'))
    const setCookies = getSetCookieHeaders(res)
    const domainScoped = setCookies.find(c => c.match(/[Dd]omain=/))
    expect(domainScoped).toBeDefined()
    expect(domainScoped).toContain('pundo.cy')
    expect(domainScoped).toContain('Max-Age=0')
  })

  it('domain-scoped delete includes Secure flag (prod cookies are Secure)', async () => {
    const res = await POST(makeRequest('google-token'))
    const setCookies = getSetCookieHeaders(res)
    const domainScoped = setCookies.find(c => c.match(/[Dd]omain=/))
    expect(domainScoped).toContain('Secure')
  })

  it('both headers clear customer_token', async () => {
    const res = await POST(makeRequest('google-token'))
    const setCookies = getSetCookieHeaders(res)
    for (const header of setCookies) {
      expect(header).toContain('customer_token=')
      expect(header).toContain('Max-Age=0')
    }
  })
})
