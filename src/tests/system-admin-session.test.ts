// F8960 AK 7 (unit): requireAdminSession is fail-closed, stricter than the portal layout
import { describe, it, expect, vi, beforeEach } from 'vitest'

class RedirectError extends Error { constructor(public to: string) { super('NEXT_REDIRECT') } }
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new RedirectError(to) } }))
vi.mock('@/lib/system-admin-api', () => ({ getAdminMe: vi.fn() }))

import { getAdminMe } from '@/lib/system-admin-api'
import { requireAdminSession } from '@/lib/system-admin-session'

const expectLoginRedirect = (e: unknown) => {
  expect((e as Error).message).toBe('NEXT_REDIRECT')
  expect((e as RedirectError).to).toBe('/admin/login')
}
async function outcome(): Promise<unknown> {
  try { return await requireAdminSession() } catch (e) { return e }
}
const me = vi.mocked(getAdminMe)
beforeEach(() => { me.mockClear() })

describe('requireAdminSession', () => {
  it('returns the admin when the backend confirms the session', async () => {
    me.mockResolvedValue({ email: 'e2e-admin@pundo-e2e.io' } as never)
    await expect(requireAdminSession()).resolves.toMatchObject({ email: 'e2e-admin@pundo-e2e.io' })
  })

  it.each(['UNAUTHORIZED', 'FORBIDDEN'])('redirects to the login on %s', async (code) => {
    me.mockImplementation(async () => { throw new Error(code) })
    expectLoginRedirect(await outcome())
  })

  it('redirects on a network error (the layout would let this through)', async () => {
    me.mockImplementation(async () => { throw new TypeError('fetch failed') })
    expectLoginRedirect(await outcome())
  })

  it('redirects on a backend 5xx', async () => {
    me.mockImplementation(async () => { throw new Error('HTTP 503') })
    expectLoginRedirect(await outcome())
  })

  it.each([{}, { email: '' }, null, { email: 42 }])('redirects on a malformed answer %j', async (body) => {
    me.mockResolvedValue(body as never)
    expectLoginRedirect(await outcome())
  })
})
