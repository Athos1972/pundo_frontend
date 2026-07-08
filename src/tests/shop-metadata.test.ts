import { describe, it, expect, vi } from 'vitest'
import type { ShopDetailResponse } from '@/types/api'

// Top-level mocks (hoisted by Vitest) — generateMetadata() only needs getShop;
// the other named exports from '@/lib/api' are unused by generateMetadata but
// must exist so the module doesn't throw on import from the page's other code paths.
const getShopMock = vi.fn()
vi.mock('@/lib/api', () => ({
  getShop: (...args: unknown[]) => getShopMock(...args),
  searchProducts: vi.fn().mockResolvedValue({ items: [] }),
  getShopOffers: vi.fn().mockResolvedValue([]),
  getRelatedShops: vi.fn().mockResolvedValue({ items: [] }),
}))
vi.mock('@/lib/customer-api', () => ({
  getCustomerSession: vi.fn().mockResolvedValue({ is_authenticated: false }),
}))

function makeShop(overrides: Partial<ShopDetailResponse> = {}): ShopDetailResponse {
  return {
    id: 42,
    slug: 'toi-moi-nicosia-mall-03bb83dc',
    name: 'Toi Moi',
    address_raw: 'Nicosia Mall, Nicosia',
    location: { lat: 35.17, lng: 33.36 },
    dist_km: null,
    phone: null,
    whatsapp_number: null,
    whatsapp_url: null,
    website: null,
    opening_hours: null,
    status: 'active',
    product_count: 3,
    last_scraped: null,
    top_products: [],
    images: [{ url: 'https://example.com/logo.jpg' }],
    description: 'A lovely boutique in the mall.',
    ...overrides,
  }
}

describe('generateMetadata (shop detail page) — B5900-006', () => {
  it('(a) complete shop → robots.index=true, title contains the real shop name', async () => {
    getShopMock.mockResolvedValueOnce(makeShop())
    const { generateMetadata } = await import('@/app/(customer)/[lang]/shops/[slug]/page')

    const meta = await generateMetadata({
      params: Promise.resolve({ lang: 'en', slug: 'toi-moi-nicosia-mall-03bb83dc' }),
    })

    const robots = meta.robots as Record<string, unknown>
    expect(robots.index).toBe(true)
    expect(robots.follow).toBe(true)
    const title = (meta.title as { absolute: string }).absolute
    expect(title).toContain('Toi Moi')
    expect(meta.alternates?.canonical).toBe('https://pundo.cy/en/shops/toi-moi-nicosia-mall-03bb83dc')
    expect(meta.alternates?.languages).toBeTruthy()
  })

  it('(b) name:null shop → robots.index=false, robots.follow=true, slug-derived title, canonical set', async () => {
    getShopMock.mockResolvedValueOnce(makeShop({ name: null }))
    const { generateMetadata } = await import('@/app/(customer)/[lang]/shops/[slug]/page')

    const meta = await generateMetadata({
      params: Promise.resolve({ lang: 'en', slug: 'toi-moi-nicosia-mall-03bb83dc' }),
    })

    const robots = meta.robots as Record<string, unknown>
    expect(robots.index).toBe(false)
    expect(robots.follow).toBe(true)
    const title = (meta.title as { absolute: string }).absolute
    expect(title).toContain('Toi Moi Nicosia Mall')
    expect(title).not.toBe('Shop')
    expect(title).not.toContain('Shop | Pundo')
    expect(meta.alternates?.canonical).toBe('https://pundo.cy/en/shops/toi-moi-nicosia-mall-03bb83dc')
    expect(meta.alternates?.languages).toBeTruthy()
  })

  it('(b2) name:"   " (blank) shop is treated the same as null → incomplete', async () => {
    getShopMock.mockResolvedValueOnce(makeShop({ name: '   ' }))
    const { generateMetadata } = await import('@/app/(customer)/[lang]/shops/[slug]/page')

    const meta = await generateMetadata({
      params: Promise.resolve({ lang: 'en', slug: 'wrap-grill-e4b4b9ad' }),
    })

    const robots = meta.robots as Record<string, unknown>
    expect(robots.index).toBe(false)
    const title = (meta.title as { absolute: string }).absolute
    expect(title).toContain('Wrap Grill')
  })

  it('(c) getShop throws → robots.index=false, robots.follow=true, slug-derived title (no generic "Shop | Pundo")', async () => {
    getShopMock.mockRejectedValueOnce(new Error('network error'))
    const { generateMetadata } = await import('@/app/(customer)/[lang]/shops/[slug]/page')

    const meta = await generateMetadata({
      params: Promise.resolve({ lang: 'en', slug: 'rebellion-gym-514aff92' }),
    })

    const robots = meta.robots as Record<string, unknown>
    expect(robots.index).toBe(false)
    expect(robots.follow).toBe(true)
    const title = (meta.title as { absolute: string }).absolute
    expect(title).toContain('Rebellion Gym')
    expect(title).not.toBe('Shop')
    expect(meta.alternates?.canonical).toBe('https://pundo.cy/en/shops/rebellion-gym-514aff92')
  })

  it('(d) content-less shop (no image/description/products, but has name+address) → incomplete', async () => {
    getShopMock.mockResolvedValueOnce(makeShop({
      slug: 'barkies-50fc4aff',
      images: null,
      description: null,
      product_count: 0,
    }))
    const { generateMetadata } = await import('@/app/(customer)/[lang]/shops/[slug]/page')

    const meta = await generateMetadata({
      params: Promise.resolve({ lang: 'en', slug: 'barkies-50fc4aff' }),
    })

    const robots = meta.robots as Record<string, unknown>
    expect(robots.index).toBe(false)
    expect(robots.follow).toBe(true)
    // Real name is present, so title should still reflect it (not the slug fallback).
    const title = (meta.title as { absolute: string }).absolute
    expect(title).toContain('Toi Moi')
  })
})
