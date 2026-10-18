// B6220-002 — Route handlers forward exactly one validated client IP to the backend.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => ({ value: `tok-${name}` }),
    set: vi.fn(),
  }),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.resetModules()
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
})

const SPOOF = {
  'x-forwarded-for': '198.51.100.1, 203.0.113.7',
  'cf-connecting-ip': '198.51.100.2',
  'x-real-ip': '198.51.100.3',
}

function req(path: string, headers: Record<string, string>, method = 'POST') {
  return new NextRequest(`http://localhost:3500${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: method === 'GET' ? undefined : JSON.stringify({ a: 1 }),
  })
}

function backendHeaders(): Headers {
  expect(fetchMock).toHaveBeenCalledTimes(1)
  return new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>)
}

type Case = {
  name: string
  load: () => Promise<Record<string, (...a: never[]) => Promise<Response>>>
  path: string
  call: (mod: Record<string, (...a: never[]) => Promise<Response>>, r: NextRequest) => Promise<Response>
}
const catchAll = (mod: Case['load'], path: string, name: string): Case => ({
  name, load: mod, path,
  call: (m, r) => (m.POST as unknown as (r: NextRequest, c: unknown) => Promise<Response>)(r, { params: Promise.resolve({ path: ['x', 'y'] }) }),
})

const cases: Case[] = [
  catchAll(() => import('@/app/api/customer/[...path]/route') as never, '/api/customer/x/y', 'customer catch-all'),
  catchAll(() => import('@/app/api/admin/[...path]/route') as never, '/api/admin/x/y', 'admin catch-all'),
  catchAll(() => import('@/app/api/shop-admin/[...path]/route') as never, '/api/shop-admin/x/y', 'shop-admin catch-all'),
  { name: 'signup', load: () => import('@/app/api/customer/customer/auth/signup/route') as never, path: '/api/customer/customer/auth/signup', call: (m, r) => m.POST(r as never) },
  { name: 'contact', load: () => import('@/app/api/contact/route') as never, path: '/api/contact', call: (m, r) => m.POST(r as never) },
  { name: 'crm opt-out', load: () => import('@/app/api/crm/opt-out/route') as never, path: '/api/crm/opt-out', call: (m, r) => m.POST(r as never) },
  { name: 'logout', load: () => import('@/app/api/customer/customer/auth/logout/route') as never, path: '/api/customer/customer/auth/logout', call: (m, r) => m.POST(r as never) },
  {
    name: 'impersonate',
    load: () => import('@/app/api/admin/shops/[shopId]/impersonate/route') as never,
    path: '/api/admin/shops/1/impersonate',
    call: (m, r) => (m.POST as unknown as (r: NextRequest, c: unknown) => Promise<Response>)(r, { params: Promise.resolve({ shopId: '1' }) }),
  },
]

describe.each(cases)('$name', (c) => {
  // logout only calls the backend when a customer_token cookie exists
  const withCookie = (headers: Record<string, string>) =>
    c.name === 'logout' ? { ...headers, cookie: 'customer_token=abc' } : headers

  it('forwards the rightmost XFF entry and drops CF-Connecting-IP / X-Real-IP', async () => {
    const mod = await c.load()
    await c.call(mod, req(c.path, withCookie(SPOOF)))
    const h = backendHeaders()
    expect(h.get('x-forwarded-for')).toBe('203.0.113.7')
    expect(h.get('cf-connecting-ip')).toBeNull()
    expect(h.get('x-real-ip')).toBeNull()
  })

  it('sends no X-Forwarded-For for an invalid rightmost entry', async () => {
    const mod = await c.load()
    await c.call(mod, req(c.path, withCookie({ 'x-forwarded-for': '203.0.113.7, evil', 'cf-connecting-ip': '198.51.100.2' })))
    const h = backendHeaders()
    expect(h.get('x-forwarded-for')).toBeNull()
    expect(h.get('cf-connecting-ip')).toBeNull()
  })

  it('sends no X-Forwarded-For when the header is missing (cf-connecting-ip alone is ignored)', async () => {
    const mod = await c.load()
    await c.call(mod, req(c.path, withCookie({ 'cf-connecting-ip': '198.51.100.2' })))
    expect(backendHeaders().get('x-forwarded-for')).toBeNull()
  })
})

// F6998: Customer-Route reicht den UA des eingehenden Requests weiter (Bot-Filter im Backend)
describe('customer catch-all: X-Forwarded-User-Agent (F6998)', () => {
  const run = async (headers: Record<string, string>) => {
    const mod = (await import('@/app/api/customer/[...path]/route')) as unknown as {
      POST: (r: NextRequest, c: unknown) => Promise<Response>
    }
    await mod.POST(req('/api/customer/x/y', headers), { params: Promise.resolve({ path: ['x', 'y'] }) })
    return backendHeaders()
  }

  it('forwards the incoming user-agent', async () => {
    const h = await run({ 'user-agent': 'AhrefsBot/7.0' })
    expect(h.get('x-forwarded-user-agent')).toBe('AhrefsBot/7.0')
  })

  it('ignores an incoming X-Forwarded-User-Agent', async () => {
    const h = await run({ 'user-agent': 'AhrefsBot/7.0', 'x-forwarded-user-agent': 'Mozilla/5.0 Chrome' })
    expect(h.get('x-forwarded-user-agent')).toBe('AhrefsBot/7.0')
  })
})

// Statischer Guard (jede api-Route mit BACKEND_URL nutzt den Helper): tests/unit/guards/api-routes-client-ip.test.ts

// F5970 K9: the shop-admin proxy forwards the claim access token (and only that custom header)
describe('shop-admin catch-all: X-Claim-Token (F5970)', () => {
  const run = async (headers: Record<string, string>) => {
    const mod = (await import('@/app/api/shop-admin/[...path]/route')) as unknown as {
      GET: (r: NextRequest, c: unknown) => Promise<Response>
    }
    await mod.GET(req('/api/shop-admin/claim/requests/7', headers, 'GET'), { params: Promise.resolve({ path: ['claim', 'requests', '7'] }) })
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8500/api/v1/shop-owner/claim/requests/7')
    return backendHeaders()
  }

  it('forwards the access token header', async () => {
    expect((await run({ 'x-claim-token': 'tok-abc' })).get('x-claim-token')).toBe('tok-abc')
  })

  it('sends no token header when the client sent none', async () => {
    expect((await run({})).get('x-claim-token')).toBeNull()
  })

  it('does not forward arbitrary client headers', async () => {
    const h = await run({ 'x-claim-token': 'tok', 'x-evil': '1', authorization: 'Bearer forged' })
    expect(h.get('x-evil')).toBeNull()
    expect(h.get('authorization')).toBe('Bearer tok-shop_owner_token') // from the cookie, never from the request
  })
})

// F5970 K10: the admin proxy lets only the document-viewer hardening headers through
describe('admin catch-all: response header allowlist (F5970)', () => {
  const callWith = async (backendHeaders: Record<string, string>) => {
    fetchMock.mockImplementationOnce(async () => new Response('%PDF', { status: 200, headers: backendHeaders }))
    const mod = (await import('@/app/api/admin/[...path]/route')) as unknown as {
      GET: (r: NextRequest, c: unknown) => Promise<Response>
    }
    return mod.GET(req('/api/admin/claim-requests/1/documents/2', {}, 'GET'), {
      params: Promise.resolve({ path: ['claim-requests', '1', 'documents', '2'] }),
    })
  }

  it('passes cache-control, content-disposition, nosniff and CSP back to the browser', async () => {
    const res = await callWith({
      'content-type': 'application/pdf',
      'cache-control': 'no-store',
      'content-disposition': "inline; filename*=UTF-8''a.pdf",
      'x-content-type-options': 'nosniff',
      'content-security-policy': "sandbox; default-src 'none'",
    })
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-disposition')).toBe("inline; filename*=UTF-8''a.pdf")
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-security-policy')).toBe("sandbox; default-src 'none'")
  })

  it('does not pass anything else (server banner, internal headers)', async () => {
    const res = await callWith({
      'content-type': 'application/json',
      server: 'uvicorn',
      'x-internal-debug': 'secret',
      'access-control-allow-origin': '*',
    })
    expect(res.headers.get('server')).toBeNull()
    expect(res.headers.get('x-internal-debug')).toBeNull()
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })
})
