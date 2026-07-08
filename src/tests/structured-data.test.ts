import { describe, it, expect } from 'vitest'
import { safeJson, buildProductSchema, buildLocalBusinessSchema, buildOrganizationSchema, buildWebSiteSchema, buildArticleSchema } from '@/lib/structured-data'
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

  it('includes hasMerchantReturnPolicy on each offer', () => {
    const schema = buildProductSchema(baseProduct, 'en', SITE_URL)
    const offers = schema['offers'] as Array<Record<string, unknown>>
    const policy = offers[0]['hasMerchantReturnPolicy'] as Record<string, unknown>
    expect(policy['@type']).toBe('MerchantReturnPolicy')
    expect(policy['returnPolicyCategory']).toBe('https://schema.org/MerchantReturnUnspecified')
    expect(policy['applicableCountry']).toBe('CY')
  })

  it('includes shippingDetails with doesNotShip on each offer', () => {
    const schema = buildProductSchema(baseProduct, 'en', SITE_URL)
    const offers = schema['offers'] as Array<Record<string, unknown>>
    const shipping = offers[0]['shippingDetails'] as Record<string, unknown>
    expect(shipping['@type']).toBe('OfferShippingDetails')
    expect(shipping['doesNotShip']).toBe(true)
  })

  it('fallback offer also includes merchant return policy and shipping', () => {
    const product = {
      ...baseProduct,
      offers: [{ ...baseProduct.offers[0], price_type: 'on_request' as const, price: null }],
    }
    const schema = buildProductSchema(product, 'en', SITE_URL)
    const offers = schema['offers'] as Array<Record<string, unknown>>
    expect(offers).toHaveLength(1)
    const policy = offers[0]['hasMerchantReturnPolicy'] as Record<string, unknown>
    expect(policy['@type']).toBe('MerchantReturnPolicy')
    const shipping = offers[0]['shippingDetails'] as Record<string, unknown>
    expect(shipping['doesNotShip']).toBe(true)
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

  it('builds correct image URL from non-localhost absolute thumbnail_url', () => {
    const product = { ...baseProduct, thumbnail_url: 'https://api.pundo.cy/product_images/foo.jpg' }
    const schema = buildProductSchema(product, 'en', SITE_URL)
    expect(schema['image']).toBe('https://api.pundo.cy/product_images/foo.jpg')
    expect(schema['image']).not.toContain('pundo.cyhttps://')
  })

  it('emits aggregateRating when review_stats has reviews', () => {
    const product = { ...baseProduct, review_stats: { average_stars: 4.3, total_count: 17 } }
    const schema = buildProductSchema(product, 'en', SITE_URL)
    expect(schema['aggregateRating']).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.3,
      reviewCount: 17,
      bestRating: 5,
      worstRating: 1,
    })
  })

  it('omits aggregateRating when review_stats is null', () => {
    const product = { ...baseProduct, review_stats: null }
    const schema = buildProductSchema(product, 'en', SITE_URL)
    expect(schema['aggregateRating']).toBeUndefined()
  })

  it('omits aggregateRating when review_stats is absent', () => {
    const schema = buildProductSchema(baseProduct, 'en', SITE_URL)
    expect(schema['aggregateRating']).toBeUndefined()
  })

  it('omits aggregateRating when total_count is 0', () => {
    const product = { ...baseProduct, review_stats: { average_stars: 0, total_count: 0 } }
    const schema = buildProductSchema(product, 'en', SITE_URL)
    expect(schema['aggregateRating']).toBeUndefined()
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

describe('buildOrganizationSchema', () => {
  it('returns correct @type and @context', () => {
    const schema = buildOrganizationSchema(SITE_URL)
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Organization')
  })

  it('includes siteUrl as url', () => {
    const schema = buildOrganizationSchema(SITE_URL)
    expect(schema['url']).toBe(SITE_URL)
  })

  it('includes logo derived from siteUrl', () => {
    const schema = buildOrganizationSchema(SITE_URL)
    expect(schema['logo']).toBe(`${SITE_URL}/brands/pundo/logo.png`)
  })

  it('includes Facebook in sameAs', () => {
    const schema = buildOrganizationSchema(SITE_URL)
    const sameAs = schema['sameAs'] as string[]
    expect(sameAs).toContain('https://www.facebook.com/people/Pundocy/61589320933158/')
  })

  it('produces XSS-safe JSON output via safeJson', () => {
    const schema = buildOrganizationSchema(SITE_URL)
    const json = safeJson(schema)
    expect(json).not.toContain('<')
    expect(json).not.toContain('>')
    expect(JSON.parse(json)['@type']).toBe('Organization')
  })
})

describe('buildArticleSchema', () => {
  const baseInput = {
    title: 'Registering a Car in Cyprus',
    description: 'Step-by-step guide to vehicle registration.',
    lang: 'en',
    canonicalUrl: 'https://pundo.cy/en/guides/car-registration',
    image: 'https://pundo.cy/images/guides/car-registration-hero-1600.webp',
    siteUrl: SITE_URL,
  }

  it('sets @context and @type correctly', () => {
    const schema = buildArticleSchema(baseInput)
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Article')
  })

  it('maps title/description/lang to headline/description/inLanguage', () => {
    const schema = buildArticleSchema(baseInput)
    expect(schema['headline']).toBe(baseInput.title)
    expect(schema['description']).toBe(baseInput.description)
    expect(schema['inLanguage']).toBe('en')
  })

  it('includes image', () => {
    const schema = buildArticleSchema(baseInput)
    expect(schema['image']).toBe(baseInput.image)
  })

  it('includes mainEntityOfPage pointing to the canonical URL', () => {
    const schema = buildArticleSchema(baseInput)
    expect(schema['mainEntityOfPage']).toEqual({
      '@type': 'WebPage',
      '@id': baseInput.canonicalUrl,
    })
  })

  it('includes author as Organization', () => {
    const schema = buildArticleSchema(baseInput)
    expect(schema['author']).toEqual({ '@type': 'Organization', name: 'Pundo', url: SITE_URL })
  })

  it('includes publisher as Organization with logo', () => {
    const schema = buildArticleSchema(baseInput)
    expect(schema['publisher']).toEqual({
      '@type': 'Organization',
      name: 'Pundo',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/brands/pundo/logo.png` },
    })
  })

  it('includes datePublished and dateModified when set', () => {
    const schema = buildArticleSchema({
      ...baseInput,
      datePublished: '2026-05-17',
      dateModified: '2026-06-01',
    })
    expect(schema['datePublished']).toBe('2026-05-17')
    expect(schema['dateModified']).toBe('2026-06-01')
  })

  it('omits datePublished and dateModified when not set', () => {
    const schema = buildArticleSchema(baseInput)
    expect(schema['datePublished']).toBeUndefined()
    expect(schema['dateModified']).toBeUndefined()
  })

  it('never includes a nested breadcrumb (AC-2 guard)', () => {
    const schema = buildArticleSchema({
      ...baseInput,
      datePublished: '2026-05-17',
      dateModified: '2026-05-17',
    })
    expect(schema['breadcrumb']).toBeUndefined()
  })

  it('produces XSS-safe, re-parsable JSON via safeJson with identical shape', () => {
    const schema = buildArticleSchema({
      ...baseInput,
      datePublished: '2026-05-17',
      dateModified: '2026-06-01',
    })
    const json = safeJson(schema)
    expect(json).not.toContain('<')
    expect(json).not.toContain('>')
    const parsed = JSON.parse(json)
    expect(parsed).toEqual(schema)
    expect(parsed['breadcrumb']).toBeUndefined()
  })
})

describe('buildWebSiteSchema', () => {
  it('returns correct @type and @context', () => {
    const schema = buildWebSiteSchema(SITE_URL)
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('WebSite')
  })

  it('includes potentialAction SearchAction', () => {
    const schema = buildWebSiteSchema(SITE_URL)
    const action = schema['potentialAction'] as Record<string, unknown>
    expect(action['@type']).toBe('SearchAction')
  })

  it('urlTemplate contains search path and placeholder', () => {
    const schema = buildWebSiteSchema(SITE_URL)
    const action = schema['potentialAction'] as Record<string, unknown>
    const target = action['target'] as Record<string, unknown>
    expect(target['urlTemplate']).toBe(`${SITE_URL}/search?q={search_term_string}`)
  })

  it('query-input is set correctly', () => {
    const schema = buildWebSiteSchema(SITE_URL)
    const action = schema['potentialAction'] as Record<string, unknown>
    expect(action['query-input']).toBe('required name=search_term_string')
  })
})
