// B8950-016 (Sonderrouten): Admin-Impersonation. Die Route ruft das Backend und setzt das
// shop_owner_token-Cookie serverseitig; die Antwortform kommt aus dem generierten Backend-Schema.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { components } from '@/types/generated/backend'

type BackendImpersonation = components['schemas']['AdminShopImpersonateResponse']

const store = new Map<string, string>()
const setCookie = vi.fn((name: string, value: string, _options: Record<string, unknown>) => {
  store.set(name, value)
})

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (store.has(name) ? { value: store.get(name) } : undefined),
    set: setCookie,
  }),
}))

const fetchMock = vi.fn()

async function post(shopId = '42') {
  const { POST } = await import('@/app/api/admin/shops/[shopId]/impersonate/route')
  const request = new NextRequest(`http://localhost:3500/api/admin/shops/${shopId}/impersonate`, { method: 'POST' })
  return POST(request, { params: Promise.resolve({ shopId }) })
}

beforeEach(() => {
  vi.resetModules()
  store.clear()
  setCookie.mockClear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('impersonate route', () => {
  it('without an admin session it answers 401 and never calls the backend', async () => {
    const res = await post()

    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(setCookie).not.toHaveBeenCalled()
  })

  it('calls the backend impersonation endpoint with the admin bearer token', async () => {
    store.set('admin_token', 'admin-jwt')
    const body: BackendImpersonation = { shop_owner_token: 'owner-jwt' }
    fetchMock.mockResolvedValue(Response.json(body))

    await post('42')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/api\/v1\/admin\/shops\/42\/impersonate$/)
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer admin-jwt')
  })

  it('stores the returned shop-owner token as an HttpOnly, 7-day, site-wide cookie and keeps it out of the body', async () => {
    store.set('admin_token', 'admin-jwt')
    const body: BackendImpersonation = { shop_owner_token: 'owner-jwt' }
    fetchMock.mockResolvedValue(Response.json(body))

    const res = await post()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(setCookie).toHaveBeenCalledWith(
      'shop_owner_token',
      'owner-jwt',
      expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 }),
    )
  })

  it('passes a backend refusal through with its status and sets no cookie', async () => {
    store.set('admin_token', 'admin-jwt')
    fetchMock.mockResolvedValue(Response.json({ detail: 'Shop not found' }, { status: 404 }))

    const res = await post('999')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ detail: 'Shop not found' })
    expect(setCookie).not.toHaveBeenCalled()
  })

  it('answers 502 when the backend is unreachable', async () => {
    store.set('admin_token', 'admin-jwt')
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await post()

    expect(res.status).toBe(502)
    expect(setCookie).not.toHaveBeenCalled()
  })
})
