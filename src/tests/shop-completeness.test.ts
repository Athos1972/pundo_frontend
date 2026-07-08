import { describe, it, expect } from 'vitest'
import { isShopComplete, slugToDisplayName } from '@/lib/seo/shop-completeness'
import type { ShopDetailResponse } from '@/types/api'

// Minimal-but-valid ShopDetailResponse factory — only fields relevant to
// isShopComplete() are overridden per test case.
function makeShop(overrides: Partial<ShopDetailResponse> = {}): ShopDetailResponse {
  return {
    id: 1,
    slug: 'test-shop',
    name: 'Test Shop',
    address_raw: '123 Main St, Nicosia',
    location: { lat: 35.17, lng: 33.36 },
    dist_km: null,
    phone: null,
    whatsapp_number: null,
    whatsapp_url: null,
    website: null,
    opening_hours: null,
    status: 'active',
    product_count: 0,
    last_scraped: null,
    top_products: [],
    ...overrides,
  }
}

describe('isShopComplete', () => {
  it('(a) a fully populated shop is complete', () => {
    const shop = makeShop({
      images: [{ url: 'https://example.com/logo.jpg' }],
      description: 'A great local shop.',
    })
    expect(isShopComplete(shop)).toBe(true)
  })

  it('(b) name: null → incomplete (core trigger for the 4 bug shops)', () => {
    const shop = makeShop({ name: null, images: [{ url: 'https://example.com/logo.jpg' }] })
    expect(isShopComplete(shop)).toBe(false)
  })

  it('(c) name: "   " (whitespace only) → incomplete', () => {
    const shop = makeShop({ name: '   ', images: [{ url: 'https://example.com/logo.jpg' }] })
    expect(isShopComplete(shop)).toBe(false)
  })

  it('(d) online-only shop without address but with products → complete', () => {
    const shop = makeShop({
      address_raw: null,
      location: null,
      is_online_only: true,
      product_count: 5,
    })
    expect(isShopComplete(shop)).toBe(true)
  })

  it('(e) empty shell (no image, no description, no products) → incomplete even with name+address', () => {
    const shop = makeShop({
      images: null,
      description: null,
      product_count: 0,
    })
    expect(isShopComplete(shop)).toBe(false)
  })

  it('has name + location (lat/lng) but no address_raw, with a description → complete', () => {
    const shop = makeShop({
      address_raw: null,
      location: { lat: 35.0, lng: 33.0 },
      description: 'Nice place',
    })
    expect(isShopComplete(shop)).toBe(true)
  })

  it('location with non-numeric lat/lng does not count as a location signal', () => {
    const shop = makeShop({
      address_raw: null,
      // Simulate malformed API data slipping through the type system.
      location: { lat: Number.NaN, lng: 33.0 },
      description: 'Nice place',
    })
    expect(isShopComplete(shop)).toBe(false)
  })

  it('description with only whitespace does not count as a content signal', () => {
    const shop = makeShop({
      images: null,
      description: '   ',
      product_count: 0,
    })
    expect(isShopComplete(shop)).toBe(false)
  })

  it('B5900-007: no image, no description, but product_count > 0 (with a real address) → complete', () => {
    // Real-world case surfaced by the E2E audit against prod data: shops from
    // automated import typically have neither a photo nor a description, but
    // do have a non-zero product_count. Only ~0.12% of real shops satisfied
    // the old (image OR description)-only C3 — this is the dominant shape.
    const shop = makeShop({
      images: null,
      description: null,
      product_count: 3,
    })
    expect(isShopComplete(shop)).toBe(true)
  })
})

describe('slugToDisplayName', () => {
  it('toi-moi-nicosia-mall-03bb83dc → "Toi Moi Nicosia Mall"', () => {
    expect(slugToDisplayName('toi-moi-nicosia-mall-03bb83dc')).toBe('Toi Moi Nicosia Mall')
  })

  it('wrap-grill-e4b4b9ad → "Wrap Grill"', () => {
    expect(slugToDisplayName('wrap-grill-e4b4b9ad')).toBe('Wrap Grill')
  })

  it('rebellion-gym-514aff92 → "Rebellion Gym"', () => {
    expect(slugToDisplayName('rebellion-gym-514aff92')).toBe('Rebellion Gym')
  })

  it('barkies-50fc4aff → "Barkies"', () => {
    expect(slugToDisplayName('barkies-50fc4aff')).toBe('Barkies')
  })

  it('degenerate/empty slug falls back to "Shop"', () => {
    expect(slugToDisplayName('')).toBe('Shop')
    expect(slugToDisplayName('   ')).toBe('Shop')
    expect(slugToDisplayName('---')).toBe('Shop')
  })

  it('a slug that is only a hash suffix does not get fully stripped away', () => {
    // Guard: TRAILING_HASH_SUFFIX must not eat the entire slug — the raw
    // (non-titlecased-per-char) alphanumeric string is preserved as a single word.
    expect(slugToDisplayName('03bb83dc')).toBe('03bb83dc')
  })

  it('underscore-separated slug is handled like hyphen-separated', () => {
    expect(slugToDisplayName('my_cool_shop')).toBe('My Cool Shop')
  })
})
