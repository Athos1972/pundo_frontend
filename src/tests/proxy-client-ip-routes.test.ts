// B6220-002 — Route handlers forward exactly one validated client IP to the backend.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

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

describe('static guard', () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n)
      return statSync(p).isDirectory() ? walk(p) : n === 'route.ts' ? [p] : []
    })
  }
  it('every src/app/api route.ts using BACKEND_URL imports the client-ip helper', () => {
    const root = join(process.cwd(), 'src/app/api')
    const offenders = walk(root).filter((f) => {
      const s = readFileSync(f, 'utf8')
      return s.includes('BACKEND_URL') && !s.includes('@/lib/proxy/client-ip')
    })
    expect(offenders).toEqual([])
  })
})
