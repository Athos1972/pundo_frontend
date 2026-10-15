import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const cookieValues: Record<string, string> = {}
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n in cookieValues ? { value: cookieValues[n] } : undefined) }),
}))

import * as oauth from '@/lib/oauth-api'
import * as community from '@/lib/community-api'
import * as activity from '@/lib/activity-api'
import * as customer from '@/lib/customer-api'

const mockFetch = vi.fn()
const res = (status: number, body: unknown = {}, text = '') => ({ ok: status < 400, status, json: async () => body, text: async () => text })
const last = () => ({ url: mockFetch.mock.calls.at(-1)![0] as string, init: (mockFetch.mock.calls.at(-1)![1] ?? {}) as RequestInit & { headers: Record<string, string> } })

beforeEach(() => {
  mockFetch.mockReset()
  for (const k of Object.keys(cookieValues)) delete cookieValues[k]
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

// ─── oauth-api ──────────────────────────────────────────────────────────────────

describe('oauth-api', () => {
  const params = { client_id: 'c1', redirect_uri: 'https://app/cb?x=1', scope: 'read write', state: 's', code_challenge: 'cc', code_challenge_method: 'S256' }

  it('authorization context: "unauthorized" without a customer cookie, without calling the backend', async () => {
    await expect(oauth.getAuthorizationContext(params, 'en')).resolves.toBe('unauthorized')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('authorization context: sends all params URL-encoded with the bearer token', async () => {
    cookieValues.customer_token = 'ct'
    mockFetch.mockResolvedValue(res(200, { client_name: 'Claude' }))
    await expect(oauth.getAuthorizationContext(params, 'de')).resolves.toEqual({ client_name: 'Claude' })
    const url = new URL(last().url)
    expect(url.pathname).toBe('/oauth/authorization-context')
    expect(url.searchParams.get('redirect_uri')).toBe('https://app/cb?x=1')
    expect(url.searchParams.get('scope')).toBe('read write')
    expect(last().init.headers).toMatchObject({ Authorization: 'Bearer ct', 'Accept-Language': 'de' })
  })

  it('authorization context: 401 -> unauthorized, other errors and network failures -> null', async () => {
    cookieValues.customer_token = 'ct'
    mockFetch.mockResolvedValueOnce(res(401))
    await expect(oauth.getAuthorizationContext(params, 'en')).resolves.toBe('unauthorized')
    mockFetch.mockResolvedValueOnce(res(500))
    await expect(oauth.getAuthorizationContext(params, 'en')).resolves.toBeNull()
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await expect(oauth.getAuthorizationContext(params, 'en')).resolves.toBeNull()
  })

  it('connections: null without cookie, data on success, null on failure', async () => {
    await expect(oauth.getOAuthConnections('en')).resolves.toBeNull()
    cookieValues.customer_token = 'ct'
    mockFetch.mockResolvedValueOnce(res(200, { clients: [] }))
    await expect(oauth.getOAuthConnections('en')).resolves.toEqual({ clients: [] })
    expect(last().url).toMatch(/\/oauth\/clients\/me$/)
    mockFetch.mockResolvedValueOnce(res(500))
    await expect(oauth.getOAuthConnections('en')).resolves.toBeNull()
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await expect(oauth.getOAuthConnections('en')).resolves.toBeNull()
  })

  it('decision: posts JSON with credentials, returns the response', async () => {
    mockFetch.mockResolvedValue(res(200, { redirect_url: 'https://app/cb?code=1' }))
    await expect(oauth.postAuthorizationDecision({ approved: true } as never, 'el')).resolves.toEqual({ redirect_url: 'https://app/cb?code=1' })
    expect(last().url).toMatch(/\/oauth\/authorization-decision$/)
    expect(last().init.credentials).toBe('include')
    expect(last().init.headers['Accept-Language']).toBe('el')
  })

  it('decision: failures carry status and server text', async () => {
    mockFetch.mockResolvedValue(res(400, {}, 'invalid_grant'))
    await expect(oauth.postAuthorizationDecision({} as never, 'en')).rejects.toThrow('oauth_decision_failed:400:invalid_grant')
  })

  it('disconnect: DELETE with the client id encoded; failure raises', async () => {
    mockFetch.mockResolvedValueOnce(res(204))
    await oauth.disconnectOAuthClient('a/b c')
    expect(last().url).toMatch(/\/oauth\/clients\/me\/a%2Fb%20c$/)
    expect(last().init.method).toBe('DELETE')
    mockFetch.mockResolvedValueOnce(res(404))
    await expect(oauth.disconnectOAuthClient('x')).rejects.toThrow('disconnect_failed:404')
  })
})

// ─── community-api ──────────────────────────────────────────────────────────────

describe('community-api', () => {
  it('shop votes: language header, throws on errors', async () => {
    mockFetch.mockResolvedValueOnce(res(200, { votes: [] }))
    await expect(community.getShopVotes(5, 'ru')).resolves.toEqual({ votes: [] })
    expect(last().url).toMatch(/\/shops\/5\/votes$/)
    expect(last().init.headers['Accept-Language']).toBe('ru')
    mockFetch.mockResolvedValueOnce(res(503))
    await expect(community.getShopVotes(5, 'ru')).rejects.toThrow('community_votes 503')
  })

  it('trust profile: null without cookie / on errors', async () => {
    await expect(community.getTrustProfile('en')).resolves.toBeNull()
    cookieValues.customer_token = 'ct'
    mockFetch.mockResolvedValueOnce(res(200, { level: 2 }))
    await expect(community.getTrustProfile('en')).resolves.toEqual({ level: 2 })
    expect(last().init.headers.Authorization).toBe('Bearer ct')
    mockFetch.mockResolvedValueOnce(res(500))
    await expect(community.getTrustProfile('en')).resolves.toBeNull()
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await expect(community.getTrustProfile('en')).resolves.toBeNull()
  })

  it('submitVote posts through the customer proxy; 401 and other failures are distinguishable', async () => {
    mockFetch.mockResolvedValueOnce(res(200, { credits: 2 }))
    await expect(community.submitVote(5, 'parking' as never, 1, 'en')).resolves.toEqual({ credits: 2 })
    expect(last().url).toBe('/api/customer/customer/shops/5/votes')
    expect(JSON.parse(last().init.body as string)).toEqual({ attribute_type: 'parking', value: 1 })
    mockFetch.mockResolvedValueOnce(res(401))
    await expect(community.submitVote(5, 'parking' as never, 1, 'en')).rejects.toThrow('UNAUTHORIZED')
    mockFetch.mockResolvedValueOnce(res(500))
    await expect(community.submitVote(5, 'parking' as never, 1, 'en')).rejects.toThrow('vote_submit 500')
  })

  it('deleteVote: 204 ok, 401 unauthorized, other errors raise', async () => {
    mockFetch.mockResolvedValueOnce(res(204))
    await expect(community.deleteVote(5, 'parking' as never, 'en')).resolves.toBeUndefined()
    expect(last().url).toBe('/api/customer/customer/shops/5/votes/parking')
    mockFetch.mockResolvedValueOnce(res(401))
    await expect(community.deleteVote(5, 'parking' as never, 'en')).rejects.toThrow('UNAUTHORIZED')
    mockFetch.mockResolvedValueOnce(res(500))
    await expect(community.deleteVote(5, 'parking' as never, 'en')).rejects.toThrow('vote_delete 500')
  })
})

// ─── activity-api ───────────────────────────────────────────────────────────────

describe('activity-api', () => {
  it('defaults to limit 20, adds since only when given, forwards language and abort signal', async () => {
    mockFetch.mockResolvedValue(res(200, { events: [] }))
    await activity.getActivity({}, 'he')
    expect(new URL(last().url, 'http://x').searchParams.get('limit')).toBe('20')
    expect(new URL(last().url, 'http://x').searchParams.has('since')).toBe(false)
    expect(last().init.headers['Accept-Language']).toBe('he')
    expect(last().init.signal).toBeInstanceOf(AbortSignal)

    const ctrl = new AbortController()
    await activity.getActivity({ limit: 5, since: '2026-01-01T00:00:00Z' }, 'en', ctrl.signal)
    const sp = new URL(last().url, 'http://x').searchParams
    expect(sp.get('limit')).toBe('5')
    expect(sp.get('since')).toBe('2026-01-01T00:00:00Z')
    expect(last().init.signal).toBe(ctrl.signal)
  })

  it('throws on HTTP errors', async () => {
    mockFetch.mockResolvedValue(res(500))
    await expect(activity.getActivity({}, 'en')).rejects.toThrow('activity API 500')
  })
})

// ─── customer-api ───────────────────────────────────────────────────────────────

describe('customer-api', () => {
  it('session: authenticated user, or anonymous on ANY failure (never throws)', async () => {
    cookieValues.customer_token = 'ct'
    mockFetch.mockResolvedValueOnce(res(200, { id: 1, display_name: 'Mia' }))
    await expect(customer.getCustomerSession('en')).resolves.toEqual({ user: { id: 1, display_name: 'Mia' }, is_authenticated: true })
    expect(last().init.headers.Authorization).toBe('Bearer ct')
    for (const status of [401, 403, 500]) {
      mockFetch.mockResolvedValueOnce(res(status))
      await expect(customer.getCustomerSession('en')).resolves.toEqual({ user: null, is_authenticated: false })
    }
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await expect(customer.getCustomerSession('en')).resolves.toEqual({ user: null, is_authenticated: false })
  })

  it('getCustomerMe surfaces the auth error codes', async () => {
    mockFetch.mockResolvedValueOnce(res(401))
    await expect(customer.getCustomerMe('en')).rejects.toThrow('UNAUTHORIZED')
    mockFetch.mockResolvedValueOnce(res(403))
    await expect(customer.getCustomerMe('en')).rejects.toThrow('FORBIDDEN')
    mockFetch.mockResolvedValueOnce(res(502))
    await expect(customer.getCustomerMe('en')).rejects.toThrow('API_ERROR:502')
  })

  it('reviews: list with optional auth, empty on failure', async () => {
    mockFetch.mockResolvedValueOnce(res(200, [{ id: 1 }]))
    await expect(customer.getReviews('shop', 4, 'en')).resolves.toEqual([{ id: 1 }])
    expect(last().url).toMatch(/\/customer\/reviews\?entity_type=shop&entity_id=4$/)
    expect(last().init.headers.Authorization).toBeUndefined()
    cookieValues.customer_token = 'ct'
    mockFetch.mockResolvedValueOnce(res(500))
    await expect(customer.getReviews('product', 4, 'en')).resolves.toEqual([])
    expect(last().init.headers.Authorization).toBe('Bearer ct')
  })

  it('my review for one entity: null on any error', async () => {
    mockFetch.mockResolvedValueOnce(res(200, { id: 9 }))
    await expect(customer.getMyReview('shop', 4, 'en')).resolves.toEqual({ id: 9 })
    expect(last().url).toMatch(/\/customer\/reviews\/mine\?entity_type=shop&entity_id=4$/)
    mockFetch.mockResolvedValueOnce(res(404))
    await expect(customer.getMyReview('shop', 4, 'en')).resolves.toBeNull()
  })

  it('my reviews: unwraps items with the max page size, empty on failure', async () => {
    mockFetch.mockResolvedValueOnce(res(200, { items: [{ id: 1 }, { id: 2 }] }))
    await expect(customer.getMyReviews('en')).resolves.toEqual([{ id: 1 }, { id: 2 }])
    expect(last().url).toMatch(/\/customer\/reviews\/mine\/all\?limit=100&offset=0$/)
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await expect(customer.getMyReviews('en')).resolves.toEqual([])
  })

  it('spotted uploads and review stats', async () => {
    mockFetch.mockResolvedValueOnce(res(200, { items: [] }))
    await customer.getSpottedUploads('en')
    expect(last().url).toMatch(/\/customer\/spotted$/)
    mockFetch.mockResolvedValueOnce(res(200, { average: 4.5 }))
    await expect(customer.getReviewStats('product', 3, 'en')).resolves.toEqual({ average: 4.5 })
    expect(last().url).toMatch(/\/customer\/reviews\/stats\?entity_type=product&entity_id=3$/)
    mockFetch.mockResolvedValueOnce(res(500))
    await expect(customer.getReviewStats('product', 3, 'en')).resolves.toBeNull()
  })
})
