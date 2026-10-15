import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ShopListItem } from '@/types/api'

const mockGetShops = vi.fn()
vi.mock('@/lib/api', () => ({
  getShops: (...args: unknown[]) => mockGetShops(...args),
}))

import {
  fetchShopHits,
  expandRadiusTarget,
  EMPTY_SHOP_HITS,
  SHOP_HITS_SHOWN,
  SHOP_HITS_LIMIT,
} from '@/lib/search-shop-hits'

function shop(id: number, dist: number | null = null): ShopListItem {
  return {
    id, slug: `shop-${id}`, name: `Shop ${id}`, address_raw: null, location: null, dist_km: dist,
    phone: null, whatsapp_number: null, whatsapp_url: null, website: null, opening_hours: null,
    status: 'active', product_count: 0, last_scraped: null,
  }
}

const P = { q: 'happy', lat: 34.9, lng: 33.6, maxDistKm: 50, includeOnline: true, lang: 'en' }

beforeEach(() => { mockGetShops.mockReset() })

describe('fetchShopHits', () => {
  it('R1 with hits: no second request, items capped to 3, total from the response', async () => {
    mockGetShops.mockResolvedValueOnce({ items: [shop(1), shop(2), shop(3), shop(4)], total: 27 })
    const res = await fetchShopHits(P)
    expect(mockGetShops).toHaveBeenCalledTimes(1)
    expect(res.items.map(s => s.id)).toEqual([1, 2, 3])
    expect(res.items).toHaveLength(SHOP_HITS_SHOWN)
    expect(res.total).toBe(27)
    expect(res.outside).toBeNull()
  })

  it('falls back to items.length when the backend sends no total (or null)', async () => {
    mockGetShops.mockResolvedValueOnce({ items: [shop(1), shop(2)] })
    expect((await fetchShopHits(P)).total).toBe(2)
    mockGetShops.mockResolvedValueOnce({ items: [shop(1)], total: null })
    expect((await fetchShopHits(P)).total).toBe(1)
  })

  it('R1 empty, R2 with hits: outside count and nearest distance (min over items)', async () => {
    mockGetShops
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [shop(1, 58.4), shop(2, 57.2), shop(3, null)], total: 9 })
    const res = await fetchShopHits(P)
    expect(mockGetShops).toHaveBeenCalledTimes(2)
    expect(res.items).toEqual([])
    expect(res.total).toBe(0)
    expect(res.outside).toEqual({ count: 9, nearestKm: 57.2 })
  })

  it('R2 items without any distance: nearestKm null, count falls back to items.length', async () => {
    mockGetShops
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [shop(1), shop(2)] })
    expect((await fetchShopHits(P)).outside).toEqual({ count: 2, nearestKm: null })
  })

  it('R1 and R2 empty: empty result', async () => {
    mockGetShops.mockResolvedValue({ items: [], total: 0 })
    expect(await fetchShopHits(P)).toEqual(EMPTY_SHOP_HITS)
  })

  it('R1 rejects: EMPTY_SHOP_HITS, no throw', async () => {
    mockGetShops.mockRejectedValueOnce(new Error('500'))
    expect(await fetchShopHits(P)).toEqual(EMPTY_SHOP_HITS)
  })

  it('R2 rejects: EMPTY_SHOP_HITS, no throw', async () => {
    mockGetShops.mockResolvedValueOnce({ items: [] }).mockRejectedValueOnce(new Error('boom'))
    expect(await fetchShopHits(P)).toEqual(EMPTY_SHOP_HITS)
  })

  it('request parameters: max_dist_km only in R1, status=active, limit=4, coordinates in both', async () => {
    mockGetShops.mockResolvedValue({ items: [], total: 0 })
    await fetchShopHits(P)
    const [r1, r2] = mockGetShops.mock.calls
    expect(r1[0]).toEqual({ q: 'happy', status: 'active', limit: SHOP_HITS_LIMIT, lat: 34.9, lng: 33.6, max_dist_km: 50 })
    expect(r2[0]).toEqual({ q: 'happy', status: 'active', limit: 4, lat: 34.9, lng: 33.6 })
    expect(r1[0]).not.toHaveProperty('is_online_only')
    expect(r1[1]).toBe('en')
  })

  it('is_online_only=false only when online retailers are excluded (in R1 and R2)', async () => {
    mockGetShops.mockResolvedValue({ items: [], total: 0 })
    await fetchShopHits({ ...P, includeOnline: false })
    for (const call of mockGetShops.mock.calls) expect(call[0].is_online_only).toBe(false)
  })

  it('without coordinates: no max_dist_km (the backend would answer 422), no R2', async () => {
    mockGetShops.mockResolvedValue({ items: [], total: 0 })
    await fetchShopHits({ ...P, lat: undefined, lng: undefined })
    expect(mockGetShops).toHaveBeenCalledTimes(1)
    expect(mockGetShops.mock.calls[0][0]).not.toHaveProperty('max_dist_km')
    expect(mockGetShops.mock.calls[0][0]).not.toHaveProperty('lat')
  })
})

describe('expandRadiusTarget', () => {
  it.each([
    [52, 50, 55],
    [57.2, 50, 60],
    [60, 50, 60],
    [7, 10, 10],
    [140, 50, 100],
    [100.1, 50, 100],
  ])('nearest %s km, current %s km -> %s km', (nearest, current, want) => {
    expect(expandRadiusTarget(nearest, current)).toBe(want)
  })

  it('null when the slider is already at the maximum', () => {
    expect(expandRadiusTarget(120, 100)).toBeNull()
  })

  it('null when no distance is known', () => {
    expect(expandRadiusTarget(null, 50)).toBeNull()
  })
})
