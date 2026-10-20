import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const cookieValues: Record<string, string> = {}
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n in cookieValues ? { value: cookieValues[n] } : undefined) }),
}))

import * as api from '@/lib/system-admin-api'

const mockFetch = vi.fn()
const res = (status: number, body: unknown = {}) => ({ ok: status < 400, status, json: async () => body })
const call = () => ({ url: mockFetch.mock.calls.at(-1)![0] as string, init: mockFetch.mock.calls.at(-1)![1] as RequestInit & { headers: Record<string, string> } })
const page = (items: unknown[] = []) => ({ items, total: items.length, limit: 1000, offset: 0 })

beforeEach(() => {
  mockFetch.mockReset()
  for (const k of Object.keys(cookieValues)) delete cookieValues[k]
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('system-admin server API client', () => {
  it('attaches the admin bearer token, bypasses caches and parses JSON', async () => {
    cookieValues.admin_token = 'adm'
    mockFetch.mockResolvedValue(res(200, { id: 1, email: 'a@b.io' }))
    await expect(api.getAdminMe()).resolves.toMatchObject({ email: 'a@b.io' })
    expect(call().url).toMatch(/\/api\/v1\/admin\/auth\/me$/)
    expect(call().init.headers.Authorization).toBe('Bearer adm')
    expect(call().init.cache).toBe('no-store')
  })

  it('sends no Authorization header without a cookie', async () => {
    mockFetch.mockResolvedValue(res(200, {}))
    await api.getAdminMe()
    expect(call().init.headers.Authorization).toBeUndefined()
  })

  it.each([[401, 'UNAUTHORIZED'], [403, 'FORBIDDEN'], [404, 'API_ERROR:404'], [502, 'API_ERROR:502']])('HTTP %i raises %s', async (status, msg) => {
    mockFetch.mockResolvedValue(res(status))
    await expect(api.getShops()).rejects.toThrow(msg)
  })

  it('query strings skip undefined/null/empty values but keep 0 and false', async () => {
    mockFetch.mockResolvedValue(res(200, page()))
    await api.getShops({ q: 'caf é', id: undefined, status: '', shop_type_id: 0, limit: 20, offset: 0 })
    const url = new URL(call().url)
    expect(url.pathname).toBe('/api/v1/admin/shops')
    expect(url.searchParams.get('q')).toBe('caf é')
    expect(url.searchParams.has('id')).toBe(false)
    expect(url.searchParams.has('status')).toBe(false)
    expect(url.searchParams.get('shop_type_id')).toBe('0')
    expect(url.searchParams.get('offset')).toBe('0')
    await api.getOffers({ is_available: false })
    expect(new URL(call().url).searchParams.get('is_available')).toBe('false')
    await api.getShops()
    expect(call().url).toMatch(/\/shops$/)
  })

  it('detail and list endpoints', async () => {
    mockFetch.mockResolvedValue(res(200, {}))
    const cases: Array<[() => Promise<unknown>, RegExp]> = [
      [() => api.getShop(3), /\/shops\/3$/],
      [() => api.getShopTypes({ q: 'x' }), /\/shop-types\?q=x$/],
      [() => api.getShopType(2), /\/shop-types\/2$/],
      [() => api.getShopOwners({ status: 'pending' }), /\/shop-owners\?status=pending$/],
      [() => api.getShopOwner(4), /\/shop-owners\/4$/],
      [() => api.getProducts({ category_id: 5 }), /\/products\?category_id=5$/],
      [() => api.getProduct(6), /\/products\/6$/],
      [() => api.getProductAttributes(6), /\/products\/6\/attributes$/],
      [() => api.getCategories({ taxonomy_type: 'google' }), /\/categories\?taxonomy_type=google$/],
      [() => api.getCategory(7), /\/categories\/7$/],
      [() => api.getCategoryAttributeDefs(7), /\/categories\/7\/attribute-definitions$/],
      [() => api.getCategoryTranslations(7), /\/categories\/7\/translations$/],
      [() => api.getBrands({ q: 'a' }), /\/brands\?q=a$/],
      [() => api.getBrand(8), /\/brands\/8$/],
      [() => api.getOffer(9), /\/offers\/9$/],
      [() => api.getShopOwnerOffers({ shop_id: 1 }), /\/shop-owner-offers\?shop_id=1$/],
      [() => api.getShopOwnerOffer(10), /\/shop-owner-offers\/10$/],
      [() => api.getApiKeys({ limit: 5 }), /\/api-keys\?limit=5$/],
      [() => api.getSocialLinkRules({ category: 'adult' }), /\/social-link-rules\?category=adult$/],
      [() => api.getSocialLinkRuleCategories(), /\/social-link-rules\/categories$/],
      [() => api.getItemDomainMappings({ domain: 'pets' }), /\/item-domain-mappings\?domain=pets$/],
      [() => api.getItemDomainMapping(11), /\/item-domain-mappings\/11$/],
      [() => api.getCrmContacts({ lifecycle_state: 'QUEUED' }), /\/crm\/contacts\?lifecycle_state=QUEUED$/],
      [() => api.getCrmContact(12), /\/crm\/contacts\/12$/],
    ]
    for (const [fn, re] of cases) {
      await fn()
      expect(call().url).toMatch(re)
    }
  })

  it('"get all" helpers request pages of 1000 rows and unwrap the items', async () => {
    mockFetch.mockResolvedValue(res(200, page([{ id: 1 }])))
    for (const fn of [api.getAllShopTypes, api.getAllCategories, api.getAllBrands, api.getAllShops, api.getAllProducts]) {
      await expect(fn()).resolves.toEqual([{ id: 1 }])
      expect(new URL(call().url).searchParams.get('limit')).toBe('1000')
    }
  })

  it('"get all" helpers keep paging until total is reached (B8200-004)', async () => {
    const rows = (n: number, from: number) => Array.from({ length: n }, (_, i) => ({ id: from + i }))
    mockFetch
      .mockResolvedValueOnce(res(200, { items: rows(1000, 0), total: 1500, limit: 1000, offset: 0 }))
      .mockResolvedValueOnce(res(200, { items: rows(500, 1000), total: 1500, limit: 1000, offset: 1000 }))
    const all = await api.getAllBrands()
    expect(all).toHaveLength(1500)
    expect(new URL(call().url).searchParams.get('offset')).toBe('1000')
  })

  it('item-domain-mapping mutations use the right verbs and bodies', async () => {
    mockFetch.mockResolvedValue(res(200, {}))
    await api.createItemDomainMapping({ item_id: 1, domain_id: 2 } as never)
    expect(call().init.method).toBe('POST')
    expect(JSON.parse(call().init.body as string)).toEqual({ item_id: 1, domain_id: 2 })
    await api.updateItemDomainMapping(5, { priority: 3 })
    expect(call().url).toMatch(/\/item-domain-mappings\/5$/)
    expect(call().init.method).toBe('PATCH')
    await api.deleteItemDomainMapping(5)
    expect(call().init.method).toBe('DELETE')
  })

  it('mapping gaps: domains and specialties are flattened with their kind', async () => {
    mockFetch.mockResolvedValue(res(200, {
      uncovered_domains: [{ domain_id: 1, domain_slug: 'pets', auto_assign_count: 0 }],
      uncovered_specialties: [{ specialty_id: 8, specialty_slug: 'vet', auto_assign_count: 2 }],
    }))
    const gaps = await api.getMappingGaps()
    expect(call().url).toMatch(/\/item-domain-mappings\/gap-report$/)
    expect(gaps).toHaveLength(2)
    expect(gaps[0]).toMatchObject({ kind: 'domain', slug: 'pets', domain_id: 1, specialty_id: null, auto_assign_item_count: 0 })
    expect(gaps[1]).toMatchObject({ kind: 'specialty', slug: 'vet', specialty_id: 8, domain_id: null, auto_assign_item_count: 2 })
  })

  it('mapping gaps: missing sections and missing slugs are tolerated', async () => {
    mockFetch.mockResolvedValueOnce(res(200, {}))
    await expect(api.getMappingGaps()).resolves.toEqual([])
    mockFetch.mockResolvedValueOnce(res(200, { uncovered_domains: [{ domain_id: 3, auto_assign_count: 0 }] }))
    const [g] = await api.getMappingGaps()
    expect(g.slug).toBeNull()
  })
})
