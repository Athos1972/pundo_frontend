import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const cookieValues: Record<string, string> = {}
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n in cookieValues ? { value: cookieValues[n] } : undefined) }),
}))

import * as api from '@/lib/shop-admin-api'

const mockFetch = vi.fn()
const res = (status: number, body: unknown = {}) => ({ ok: status < 400, status, json: async () => body })
const call = () => ({ url: mockFetch.mock.calls.at(-1)![0] as string, init: mockFetch.mock.calls.at(-1)![1] as RequestInit & { headers: Record<string, string> } })

beforeEach(() => {
  mockFetch.mockReset()
  for (const k of Object.keys(cookieValues)) delete cookieValues[k]
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('shop-admin server API client', () => {
  it('sends the owner token, language and no-store; parses JSON', async () => {
    cookieValues.shop_owner_token = 'tok'
    mockFetch.mockResolvedValue(res(200, { id: 1, name: 'Olga' }))
    await expect(api.getMe('de')).resolves.toEqual({ id: 1, name: 'Olga' })
    const { url, init } = call()
    expect(url).toMatch(/\/api\/v1\/shop-owner\/me$/)
    expect(init.headers).toMatchObject({ 'Accept-Language': 'de', Authorization: 'Bearer tok', 'Content-Type': 'application/json' })
    expect(init.cache).toBe('no-store')
  })

  it('omits Authorization without a token cookie', async () => {
    mockFetch.mockResolvedValue(res(200, {}))
    await api.getAdminShop('en')
    expect(call().init.headers.Authorization).toBeUndefined()
  })

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'API_ERROR:404'],
    [500, 'API_ERROR:500'],
  ])('HTTP %i raises %s', async (status, message) => {
    mockFetch.mockResolvedValue(res(status))
    await expect(api.getMe('en')).rejects.toThrow(message)
  })

  it('hits the documented endpoints', async () => {
    mockFetch.mockResolvedValue(res(200, []))
    const cases: Array<[() => Promise<unknown>, RegExp]> = [
      [() => api.getAdminShop('en'), /\/shop$/],
      [() => api.getOpeningHours('en'), /\/shop\/hours$/],
      [() => api.getApiKeys('en'), /\/api-keys$/],
      [() => api.getImportStatus('en'), /\/import\/status$/],
      [() => api.getAdminOffer(7, 'en'), /\/offers\/7$/],
      [() => api.getCatalogCases('en'), /\/catalog-cases$/],
    ]
    for (const [fn, re] of cases) {
      await fn()
      expect(call().url).toMatch(re)
    }
  })

  it('searchItems builds the query only from provided parameters', async () => {
    mockFetch.mockResolvedValue(res(200, []))
    await api.searchItems({ q: 'dog food', ean: '123', limit: 5 }, 'en')
    expect(call().url).toMatch(/\/items\?q=dog\+food&ean=123&limit=5$/)
    await api.searchItems({}, 'en')
    expect(call().url).toMatch(/\/items$/)
    await api.searchItems({ limit: 0 }, 'en')
    expect(call().url).toMatch(/\/items\?limit=0$/)
  })

  it('createItem / createShopListing POST JSON', async () => {
    mockFetch.mockResolvedValue(res(201, { id: 1 }))
    const item = { name: 'Kibble', name_lang: 'en', item_type: 'product' as const, category_id: 3 }
    await api.createItem(item, 'en')
    expect(call().init.method).toBe('POST')
    expect(JSON.parse(call().init.body as string)).toEqual(item)
    await api.createShopListing({ item_id: 4, sku: 'S1' }, 'en')
    expect(call().url).toMatch(/\/shop-listings$/)
    expect(JSON.parse(call().init.body as string)).toEqual({ item_id: 4, sku: 'S1' })
  })

  it('getAdminShopListings builds the query', async () => {
    mockFetch.mockResolvedValue(res(200, { items: [] }))
    await api.getAdminShopListings({ q: 'x', limit: 10, offset: 20 }, 'en')
    expect(call().url).toMatch(/\/shop-listings\?q=x&limit=10&offset=20$/)
    await api.getAdminShopListings({}, 'en')
    expect(call().url).toMatch(/\/shop-listings$/)
  })

  it('getAdminOffers defaults to limit 500 and only sends archived when given (including false)', async () => {
    mockFetch.mockResolvedValue(res(200, { items: [] }))
    await api.getAdminOffers('en')
    expect(call().url).toMatch(/\/offers\?limit=500$/)
    await api.getAdminOffers('en', { archived: false, offset: 10 })
    expect(call().url).toMatch(/\/offers\?archived=false&limit=500&offset=10$/)
    await api.getAdminOffers('en', { archived: true, limit: 20 })
    expect(call().url).toMatch(/\/offers\?archived=true&limit=20$/)
  })

  it('publishOffer un-archives via PATCH', async () => {
    mockFetch.mockResolvedValue(res(200, { id: 7 }))
    await api.publishOffer(7, 'en')
    expect(call().init.method).toBe('PATCH')
    expect(JSON.parse(call().init.body as string)).toEqual({ archived: false })
  })

  it('catalog sample defaults to 10 items', async () => {
    mockFetch.mockResolvedValue(res(200, {}))
    await api.getCatalogCaseSample('en', 5)
    expect(call().url).toMatch(/\/catalog-cases\/5\/sample\?n=10$/)
    await api.getCatalogCaseSample('en', 5, 3)
    expect(call().url).toMatch(/\/catalog-cases\/5\/sample\?n=3$/)
  })

  it('price units: language header, [] on failure', async () => {
    mockFetch.mockResolvedValueOnce(res(200, [{ id: 1 }]))
    await expect(api.getAdminPriceUnits('el')).resolves.toEqual([{ id: 1 }])
    expect(call().init.headers['Accept-Language']).toBe('el')
    mockFetch.mockResolvedValueOnce(res(500))
    await expect(api.getAdminPriceUnits('el')).resolves.toEqual([])
  })

  it('admin categories map missing names to empty strings; failure -> []', async () => {
    mockFetch.mockResolvedValueOnce(res(200, { items: [{ id: 1, name: 'Pets' }, { id: 2, name: null }] }))
    await expect(api.getAdminCategories('en')).resolves.toEqual([{ id: 1, name: 'Pets' }, { id: 2, name: '' }])
    mockFetch.mockResolvedValueOnce(res(200, {}))
    await expect(api.getAdminCategories('en')).resolves.toEqual([])
    mockFetch.mockResolvedValueOnce(res(503))
    await expect(api.getAdminCategories('en')).resolves.toEqual([])
  })

  it('website status never throws: 404, errors and network failures give null', async () => {
    cookieValues.shop_owner_token = 'tok'
    mockFetch.mockResolvedValueOnce(res(200, { url: 'https://x.io' }))
    await expect(api.getWebsiteStatus()).resolves.toEqual({ url: 'https://x.io' })
    expect(call().init.headers.Authorization).toBe('Bearer tok')
    mockFetch.mockResolvedValueOnce(res(404))
    await expect(api.getWebsiteStatus()).resolves.toBeNull()
    mockFetch.mockResolvedValueOnce(res(500))
    await expect(api.getWebsiteStatus()).resolves.toBeNull()
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await expect(api.getWebsiteStatus()).resolves.toBeNull()
  })
})
