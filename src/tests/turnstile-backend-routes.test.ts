// B6220-003 — contact/signup route handlers do NOT verify Turnstile themselves
// (the backend is the only verifier; tokens are single-use). They forward the
// token unchanged and map the backend error contract.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: vi.fn() }),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.resetModules()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

function backendReply(status: number, body: unknown) {
  fetchMock.mockImplementation(
    async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  )
}

function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost:3500${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const routes = [
  { name: 'contact', path: '/api/contact', load: () => import('@/app/api/contact/route') },
  { name: 'signup', path: '/api/customer/customer/auth/signup', load: () => import('@/app/api/customer/customer/auth/signup/route') },
]

describe.each(routes)('$name route', (r) => {
  it('never calls Cloudflare and forwards turnstile_token unchanged to the backend', async () => {
    backendReply(200, { ok: true })
    const { POST } = await r.load()
    await POST(post(r.path, { a: 1, turnstile_token: 'tok-123' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).not.toContain('cloudflare')
    expect(JSON.parse(init.body as string)).toEqual({ a: 1, turnstile_token: 'tok-123' })
  })

  it('maps backend 400 captcha_failed to {error:"captcha_failed"}', async () => {
    backendReply(400, { detail: 'captcha_failed' })
    const { POST } = await r.load()
    const res = await POST(post(r.path, { turnstile_token: 'x' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'captcha_failed' })
  })

  it('maps backend 429 to {error:"rate_limited"}', async () => {
    backendReply(429, { error: 'Rate limit exceeded: 3 per 1 minute' })
    const { POST } = await r.load()
    const res = await POST(post(r.path, {}))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'rate_limited' })
  })

  it('passes other backend 400 bodies through unchanged', async () => {
    backendReply(400, { detail: [{ field: 'email', message: 'bad' }] })
    const { POST } = await r.load()
    const res = await POST(post(r.path, {}))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ detail: [{ field: 'email', message: 'bad' }] })
  })
})

describe('structure', () => {
  it('the frontend verifier is gone', () => {
    expect(existsSync(join(process.cwd(), 'src/lib/turnstile-server.ts'))).toBe(false)
  })
})
