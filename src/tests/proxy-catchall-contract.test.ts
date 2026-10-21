// @vitest-environment node
// B8950-016 T16: contract table for the three catch-all proxies (Next route handler → backend).
//
// The browser talks to same-origin `/api/<group>/...`; the route handler turns the HttpOnly cookie into
// `Authorization: Bearer`, forwards method/query/body and decides which backend headers reach the browser. Each
// proxy is a copy of the same pattern; this table pins the common contract so one copy cannot drift.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

let cookieValue: string | undefined
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === currentCookie && cookieValue ? { value: cookieValue } : undefined) }),
}))
let currentCookie = ''

const fetchMock = vi.fn()

interface Proxy {
  name: string
  load: () => Promise<Record<string, (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => Promise<Response>>>
  cookie: string
  /** public path prefix (`/api/<group>`) and the backend prefix the handler maps it to */
  publicPrefix: string
  backendPrefix: string
}

const PROXIES: Proxy[] = [
  { name: 'admin', load: () => import('@/app/api/admin/[...path]/route'), cookie: 'admin_token', publicPrefix: '/api/admin', backendPrefix: '/api/v1/admin' },
  { name: 'customer', load: () => import('@/app/api/customer/[...path]/route'), cookie: 'customer_token', publicPrefix: '/api/customer', backendPrefix: '/api/v1' },
  { name: 'shop-admin', load: () => import('@/app/api/shop-admin/[...path]/route'), cookie: 'shop_owner_token', publicPrefix: '/api/shop-admin', backendPrefix: '/api/v1/shop-owner' },
]

function call(p: Proxy, method: string, segments: string[], init: { query?: string; body?: unknown } = {}) {
  const url = `http://localhost:3500${p.publicPrefix}/${segments.join('/')}${init.query ?? ''}`
  const req = new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json', host: 'pundo.cy' },
    body: init.body === undefined || method === 'GET' ? undefined : JSON.stringify(init.body),
  })
  return p.load().then((mod) => mod[method](req, { params: Promise.resolve({ path: segments }) }))
}

const sentHeaders = () => new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>)
const sentUrl = () => String(fetchMock.mock.calls[0][0])

beforeEach(() => {
  vi.resetModules()
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
  cookieValue = 'tok-abc'
})

describe.each(PROXIES)('catch-all proxy: $name', (p) => {
  beforeEach(() => {
    currentCookie = p.cookie
  })

  it('maps the path and keeps the query string', async () => {
    await call(p, 'GET', ['things', '42'], { query: '?limit=5&q=a%20b' })
    expect(sentUrl()).toBe(`http://localhost:8500${p.backendPrefix}/things/42?limit=5&q=a%20b`)
  })

  it('turns the cookie into a Bearer token; without cookie no Authorization header', async () => {
    await call(p, 'GET', ['x'])
    expect(sentHeaders().get('authorization')).toBe('Bearer tok-abc')
    fetchMock.mockClear()
    cookieValue = undefined
    await call(p, 'GET', ['x'])
    expect(sentHeaders().get('authorization')).toBeNull()
  })

  it('forwards method, JSON body and content type; GET has no body', async () => {
    await call(p, 'POST', ['x'], { body: { a: 1 } })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(sentHeaders().get('content-type')).toBe('application/json')
    expect(await (init.body as Blob).text()).toBe('{"a":1}')
    fetchMock.mockClear()
    await call(p, 'GET', ['x'])
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeUndefined()
  })

  it('tells the backend which host the browser used (cookie domain per brand)', async () => {
    await call(p, 'GET', ['x'])
    expect(sentHeaders().get('x-forwarded-host')).toBe('pundo.cy')
  })

  it('passes status, body and content type back, and nothing else of the backend headers', async () => {
    fetchMock.mockImplementation(async () => new Response('{"detail":"nope"}', {
      status: 422, headers: { 'content-type': 'application/json', 'x-internal-debug': 'secret', server: 'uvicorn' },
    }))
    const res = await call(p, 'POST', ['x'], { body: {} })
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ detail: 'nope' })
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(res.headers.get('x-internal-debug')).toBeNull()
    expect(res.headers.get('server')).toBeNull()
  })

  it('forwards Set-Cookie (login must be able to set the auth cookie)', async () => {
    fetchMock.mockImplementation(async () => new Response('{}', { status: 200, headers: { 'set-cookie': `${p.cookie}=new; Path=/; HttpOnly` } }))
    const res = await call(p, 'POST', ['login'], { body: {} })
    expect(res.headers.get('set-cookie')).toContain(`${p.cookie}=new`)
  })

  it('204 stays without a body', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }))
    const res = await call(p, 'DELETE', ['x', '1'])
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
  })

  it('backend unreachable → 502 with a JSON detail', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const res = await call(p, 'GET', ['x'])
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ detail: 'Backend unreachable' })
  })
})

describe('customer proxy specifics', () => {
  it('strips Domain= from Set-Cookie (backend may set .pundo.cy, the proxy can run on naidivse.cy)', async () => {
    const p = PROXIES[1]
    currentCookie = p.cookie
    fetchMock.mockImplementation(async () => new Response('{}', { status: 200, headers: { 'set-cookie': 'customer_token=t; Domain=.pundo.cy; Path=/' } }))
    const res = await call(p, 'POST', ['customer', 'auth', 'login'], { body: {} })
    expect(res.headers.get('set-cookie')).not.toMatch(/domain=/i)
  })

  it('forwards Retry-After together with the unchanged 429 body', async () => {
    const p = PROXIES[1]
    currentCookie = p.cookie
    const body = { code: 'progression_admission_limit', limit_kind: 'homesick_daily_attempt_cap', reset_at: '2026-10-22T00:00:00Z', retry_after: 3600 }
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(body), { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '3600' } }))
    const res = await call(p, 'POST', ['customer', 'progression', 'preflight'], { body: { action: 'homesick', brand: 'pundo', reference: '' } })
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('3600')
    expect(await res.json()).toEqual(body)
  })
})
