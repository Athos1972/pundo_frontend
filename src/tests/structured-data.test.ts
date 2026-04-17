import { describe, it, expect } from 'vitest'
import { safeJson, buildProductSchema, buildLocalBusinessSchema } from '@/lib/structured-data'
import type { ProductDetailResponse, ShopDetailResponse } from '@/types/api'

const SITE_URL = 'https://pundo.cy'

describe('safeJson', () => {
  it('serializes a plain object', () => {
    const result = safeJson({ name: 'Pundo' })
    expect(result).toContain('"name"')
    expect(result).toContain('"Pundo"')
  })

  it('escapes < and > to prevent XSS', () => {
    const result = safeJson({ evil: '<script>alert(1)</script>' })
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('</script>')
    expect(result).toContain('\\u003cscript\\u003e')
  })

  it('escapes forward slash', () => {
    const result = safeJson({ path: '/api/v1' })
    expect(result).toContain('\\u002fapi\\u002fv1')
  })

  it('produces valid JSON after escaping', () => {
    const input = { name: '<Test>', path: '/foo' }
    const escaped = safeJson(input)
    const parsed = JSON.parse(escaped)
    expect(parsed.name).toBe('<Test>')
    expect(parsed.path).toBe('/foo')
  })
})

describe('buildProductSchema', () => {
  const baseProduct: ProductDetailResponse = {
    id: 1,
    slug: 'cat-food-whiskas',
    names: { en: 'Whiskas Cat Food', de: 'Whiskas Katzenfutter' },
    descriptions: { en: 'Premium cat food', de: 'Premium Katzenfutter' },
    brand: { id: 10, name: 'Whiskas' },
    category: { id: 5, name: 'Cat Food' },
    thumbnail_url: '/product_images/whiskas.jpg',
    images: null,
    attributes: null,
    offers: [
      {
        shop_id: 1,
        shop_slug: 'petshop-larnaca',
        shop_name: 'PetShop Larnaca',
        shop_address: 'Main St 1',
        shop_location: { lat: 34.9, lng: 33.6 },
        price: '3.99',
        currency: 'EUR',
        price_type: 'fixed',
        price_note: null,
        shop_phone: null,
        is_available: true,
        sku: null,
        url: null,
        crawled_at: '2026-04-01T10:00:00Z',
      },
    ],
    price_history: [],
  }

  it('sets @context and @type correctly', () => {
    const schema = buildProductSchema(baseProduct, 'en', SITE_URL)
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Product')
  })

  it('uses lang-specific name', () => {
    const schema = buildProductSchema(baseProduct, 'de', SITE_URL)
    expect(schema['name']).toBe('Whiskas Katzenfutter')
  })

  it('falls back to en name when lang not found', () => {
    const schema = buildProductSchema(baseProduct, 'el', SITE_URL)
    expect(schema['name']).toBe('Whiskas Cat Food')
  })

  it('builds absolute image URL from relative thumbnail', () => {
    const schema = buildProductSchema(baseProduct, 'en', SITE_URL)
    expect(schema['image']).toBe('https://pundo.cy/product_images/whiskas.jpg')
  })

  it('strips localhost from thumbnail_url and builds absolute URL', () => {
    const product = { ...baseProduct, thumbnail_url: 'http://localhost:8001/product_images/test.jpg' }
    const schema = buildProductSchema(product, 'en', SITE_URL)
    expect(schema['image']).toBe('https://pundo.cy/product_images/test.jpg')
  })

  it('omits image when thumbnail_url is null', () => {
    const product = { ...baseProduct, thumbnail_url: null }
    const schema = buildProductSchema(product, 'en', SITE_URL)
    expect(schema['image']).toBeUndefined()
  })

  it('includes brand', () => {
    const schema = buildProductSchema(baseProduct, 'en', SITE_URL)
    expect(schema['brand']).toEqual({ '@type': 'Brand', name: 'Whiskas' })
  })

  it('omits brand when null', () => {
    const product = { ...baseProduct, brand: null }
    const schema = buildProductSchema(product, 'en', SITE_URL)
    expect(schema['brand']).toBeUndefined()
  })

  it('maps fixed-price offers to schema Offers', () => {
    const schema = buildProductSchema(baseProduct, 'en', SITE_URL)
    const offers = schema['offers'] as Array<Record<string, unknown>>
    expect(offers).toHaveLength(1)
    expect(offers[0]['@type']).toBe('Offer')
    expect(offers[0]['price']).toBe('3.99')
    expect(offers[0]['priceCurrency']).toBe('EUR')
    expect(offers[0]['availability']).toBe('https://schema.org/InStock')
  })

  it('excludes on_request offers from schema', () => {
    const product = {
      ...baseProduct,
      offers: [{ ...baseProduct.offers[0], price_type: 'on_request' as const, price: null }],
    }
    const schema = buildProductSchema(product, 'en', SITE_URL)
    expect(schema['offers']).toBeUndefined()
  })

  it('marks unavailable offers as OutOfStock', () => {
    const product = {
      ...baseProduct,
      offers: [{ ...baseProduct.offers[0], is_available: false }],
    }
    const schema = buildProductSchema(product, 'en', SITE_URL)
    const offers = schema['offers'] as Array<Record<string, unknown>>
    expect(offers[0]['availability']).toBe('https://schema.org/OutOfStock')
  })
})

describe('buildLocalBusinessSchema', () => {
  const baseShop: ShopDetailResponse = {
    id: 1,
    slug: 'petshop-larnaca',
    name: 'PetShop Larnaca',
    address_raw: 'Main Street 1, Larnaca',
    location: { lat: 34.9, lng: 33.6 },
    dist_km: null,
    phone: '+357 24 123456',
    whatsapp_number: null,
    whatsapp_url: null,
    website: null,
    opening_hours: { mon: '09:00-18:00', tue: '09:00-18:00', sat: '10:00-15:00', sun: null },
    status: 'active',
    product_count: 42,
    last_scraped: '2026-04-01T10:00:00Z',
    top_products: [],
    spoken_languages: ['en', 'el'],
  }

  it('sets @context and @type correctly', () => {
    const schema = buildLocalBusinessSchema(baseShop, SITE_URL)
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('LocalBusiness')
  })

  it('includes name and url', () => {
    const schema = buildLocalBusinessSchema(baseShop, SITE_URL)
    expect(schema['name']).toBe('PetShop Larnaca')
    expect(schema['url']).toBe('https://pundo.cy/shops/petshop-larnaca')
  })

  it('includes address', () => {
    const schema = buildLocalBusinessSchema(baseShop, SITE_URL)
    expect(schema['address']).toEqual({
      '@type': 'PostalAddress',
      streetAddress: 'Main Street 1, Larnaca',
    })
  })

  it('includes geo coordinates', () => {
    const schema = buildLocalBusinessSchema(baseShop, SITE_URL)
    expect(schema['geo']).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 34.9,
      longitude: 33.6,
    })
  })

  it('omits geo when location is null', () => {
    const shop = { ...baseShop, location: null }
    const schema = buildLocalBusinessSchema(shop, SITE_URL)
    expect(schema['geo']).toBeUndefined()
  })

  it('includes telephone', () => {
    const schema = buildLocalBusinessSchema(baseShop, SITE_URL)
    expect(schema['telephone']).toBe('+357 24 123456')
  })

  it('converts opening hours to Schema.org format', () => {
    const schema = buildLocalBusinessSchema(baseShop, SITE_URL)
    const hours = schema['openingHours'] as string[]
    expect(hours).toContain('Mo 09:00-18:00')
    expect(hours).toContain('Tu 09:00-18:00')
    expect(hours).toContain('Sa 10:00-15:00')
    // sun is null — should NOT appear
    expect(hours.some(h => h.startsWith('Su'))).toBe(false)
  })

  it('omits openingHours when null', () => {
    const shop = { ...baseShop, opening_hours: null }
    const schema = buildLocalBusinessSchema(shop, SITE_URL)
    expect(schema['openingHours']).toBeUndefined()
  })

  it('uses "Shop" as fallback name when null', () => {
    const shop = { ...baseShop, name: null }
    const schema = buildLocalBusinessSchema(shop, SITE_URL)
    expect(schema['name']).toBe('Shop')
  })
})
