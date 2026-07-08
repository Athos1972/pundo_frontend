/**
 * B5900-007 — Unit tests for the city/indexable filter params on getShops(),
 * getShopCities(), and the getAllShopsInCity() offset-loop pagination helper.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('getShops — city / indexable params', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ items: [] }))
  })

  afterEach(() => { fetchSpy.mockRestore() })

  it('includes city param when provided', async () => {
    const { getShops } = await import('@/lib/api')
    await getShops({ city: 'Larnaca' }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('city=Larnaca')
  })

  it('includes indexable=true param when provided', async () => {
    const { getShops } = await import('@/lib/api')
    await getShops({ indexable: true }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('indexable=true')
  })

  it('includes indexable=false when explicitly false (not omitted)', async () => {
    const { getShops } = await import('@/lib/api')
    await getShops({ indexable: false }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('indexable=false')
  })

  it('omits city and indexable when not provided', async () => {
    const { getShops } = await import('@/lib/api')
    await getShops({}, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).not.toContain('city=')
    expect(url).not.toContain('indexable=')
  })

  it('combines city, indexable, status and pagination params', async () => {
    const { getShops } = await import('@/lib/api')
    await getShops({ city: 'Nicosia', indexable: true, status: 'active', limit: 100, offset: 200 }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('city=Nicosia')
    expect(url).toContain('indexable=true')
    expect(url).toContain('status=active')
    expect(url).toContain('limit=100')
    expect(url).toContain('offset=200')
  })
})

describe('getShopCities', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => { fetchSpy.mockRestore() })

  it('calls GET /shops/cities', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ cities: [{ city: 'Larnaca', slug: 'larnaca', shop_count: 42 }] })
    )
    const { getShopCities } = await import('@/lib/api')
    const res = await getShopCities('en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('/shops/cities')
    expect(res.cities).toEqual([{ city: 'Larnaca', slug: 'larnaca', shop_count: 42 }])
  })

  it('sends Accept-Language header', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ cities: [] }))
    const { getShopCities } = await import('@/lib/api')
    await getShopCities('de')
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['Accept-Language']).toBe('de')
  })

  it('propagates a thrown error on non-ok response', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))
    const { getShopCities } = await import('@/lib/api')
    await expect(getShopCities('en')).rejects.toThrow('API 500')
  })
})

describe('getAllShopsInCity — offset-loop pagination', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => { fetchSpy.mockRestore() })

  function makeShop(id: number) {
    return { id, slug: `shop-${id}`, name: `Shop ${id}`, address_raw: null, city: 'Nicosia' }
  }

  it('returns all items from a single page when below pageSize', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ items: [makeShop(1), makeShop(2)] })
    )
    const { getAllShopsInCity } = await import('@/lib/api')
    const shops = await getAllShopsInCity('Nicosia', 'en', { pageSize: 100 })
    expect(shops).toHaveLength(2)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('loops via offset until a short page is returned', async () => {
    let call = 0
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      call += 1
      if (call === 1) return jsonResponse({ items: [makeShop(1), makeShop(2)] })
      if (call === 2) return jsonResponse({ items: [makeShop(3), makeShop(4)] })
      return jsonResponse({ items: [makeShop(5)] }) // short page → stop
    })
    const { getAllShopsInCity } = await import('@/lib/api')
    const shops = await getAllShopsInCity('Nicosia', 'en', { pageSize: 2 })
    expect(shops).toHaveLength(5)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    // offsets used: 0, 2, 4
    const urls = fetchSpy.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(urls[0]).toContain('offset=0')
    expect(urls[1]).toContain('offset=2')
    expect(urls[2]).toContain('offset=4')
  })

  it('stops at maxPages even if every page is full (safety cap)', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      jsonResponse({ items: [makeShop(1), makeShop(2)] })
    )
    const { getAllShopsInCity } = await import('@/lib/api')
    const shops = await getAllShopsInCity('Nicosia', 'en', { pageSize: 2, maxPages: 3 })
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(shops).toHaveLength(6)
  })

  it('always requests city, indexable=true and status=active', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ items: [] }))
    const { getAllShopsInCity } = await import('@/lib/api')
    await getAllShopsInCity('Larnaca', 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('city=Larnaca')
    expect(url).toContain('indexable=true')
    expect(url).toContain('status=active')
  })
})
