// F5970: claim client -- error parsing, never-throwing wizard match, token storage
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ClaimApiError, clearClaimToken, createClaimRequest, getClaimStatus, loadClaimToken, matchClaimCandidates, saveClaimToken,
  sendClaimCode, verifyClaimCode, withdrawClaim,
} from '@/lib/shop-admin-claim-client'

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  sessionStorage.clear()
})
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('error parsing', () => {
  it('reads detail.code and the extra fields', async () => {
    fetchMock.mockResolvedValue(json(422, { detail: { code: 'claim_code_invalid', attempts_left: 3 } }))
    const err = await verifyClaimCode(1, 'tok', '123456').catch((e) => e)
    expect(err).toBeInstanceOf(ClaimApiError)
    expect(err).toMatchObject({ status: 422, code: 'claim_code_invalid', extra: { attempts_left: 3 } })
  })

  it('keeps the plain-string captcha_failed', async () => {
    fetchMock.mockResolvedValue(json(400, { detail: 'captcha_failed' }))
    expect(await createClaimRequest(new FormData()).catch((e) => e)).toMatchObject({ status: 400, code: 'captcha_failed' })
  })

  it('maps a bare slowapi 429 to rate_limited', async () => {
    fetchMock.mockResolvedValue(json(429, { error: 'Rate limit exceeded: 5 per 1 hour' }))
    expect(await createClaimRequest(new FormData()).catch((e) => e)).toMatchObject({ status: 429, code: 'rate_limited' })
  })

  it('unknown bodies become code unknown, network failures code network', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 502 }))
    expect(await getClaimStatus(1, 't').catch((e) => e)).toMatchObject({ status: 502, code: 'unknown' })
    fetchMock.mockRejectedValueOnce(new TypeError('failed'))
    expect(await getClaimStatus(1, 't').catch((e) => e)).toMatchObject({ status: 0, code: 'network' })
  })

  it('validation errors in the FastAPI list form do not crash the parser', async () => {
    fetchMock.mockResolvedValue(json(422, { detail: [{ loc: ['body', 'code'], msg: 'x' }] }))
    expect(await verifyClaimCode(1, 't', '12').catch((e) => e)).toMatchObject({ status: 422, code: 'unknown' })
  })
})

describe('requests', () => {
  it('sends the token as header only, never in the URL', async () => {
    fetchMock.mockResolvedValue(json(200, { id: 1 }))
    await getClaimStatus(7, 'SECRET')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/shop-admin/claim/requests/7')
    expect(String(url)).not.toContain('SECRET')
    expect((init.headers as Record<string, string>)['X-Claim-Token']).toBe('SECRET')
  })

  it('uses the documented paths and methods', async () => {
    fetchMock.mockImplementation(async () => json(200, {}))
    await sendClaimCode(7, 't')
    await withdrawClaim(7, 't')
    await verifyClaimCode(7, 't', '123456')
    expect(fetchMock.mock.calls.map((c) => [c[0], c[1].method])).toEqual([
      ['/api/shop-admin/claim/requests/7/send-code', 'POST'],
      ['/api/shop-admin/claim/requests/7/withdraw', 'POST'],
      ['/api/shop-admin/claim/requests/7/verify-code', 'POST'],
    ])
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ code: '123456' })
  })

  it('posts the multipart form untouched (the browser sets the boundary)', async () => {
    fetchMock.mockResolvedValue(json(201, { claim_request_id: 1 }))
    const form = new FormData()
    form.set('shop_slug', 'x')
    await createClaimRequest(form)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/shop-admin/claim/requests')
    expect(init.body).toBe(form)
    expect(init.headers).toBeUndefined()
  })
})

describe('matchClaimCandidates', () => {
  it('returns the candidates and sends the language', async () => {
    fetchMock.mockResolvedValue(json(200, { candidates: [{ slug: 'a', name: 'A', city: null, website_host: null, is_claimed: false }] }))
    expect(await matchClaimCandidates({ name: 'A' }, 'de')).toHaveLength(1)
    expect(fetchMock.mock.calls[0][1].headers['Accept-Language']).toBe('de')
  })

  it.each([
    ['429', () => json(429, { error: 'x' })],
    ['500', () => json(500, { detail: 'boom' })],
  ])('never throws on a %s (a failed lookup must not block the wizard)', async (_n, make) => {
    fetchMock.mockResolvedValue(make())
    expect(await matchClaimCandidates({ name: 'A' }, 'en')).toEqual([])
  })

  it('never throws on a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    expect(await matchClaimCandidates({ name: 'A' }, 'en')).toEqual([])
  })
})

describe('token storage', () => {
  it('stores per application in sessionStorage only', () => {
    saveClaimToken(7, 'a')
    saveClaimToken(8, 'b')
    expect(loadClaimToken(7)).toBe('a')
    expect(loadClaimToken(8)).toBe('b')
    expect(sessionStorage.getItem('claim:7')).toBe('a')
    expect(localStorage.getItem('claim:7')).toBeNull()
    clearClaimToken(7)
    expect(loadClaimToken(7)).toBeNull()
    expect(loadClaimToken(8)).toBe('b')
  })

  it('survives a blocked storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => saveClaimToken(1, 'x')).not.toThrow()
    vi.restoreAllMocks()
  })
})
