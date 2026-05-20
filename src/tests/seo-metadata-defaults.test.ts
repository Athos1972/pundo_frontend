import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getSiteUrl,
  productMetadata,
  shopMetadata,
  guideMetadata,
  noIndexMetadata,
  searchResultsMetadata,
  searchPageMetadata,
} from '@/lib/seo/metadata-defaults'

const savedEnv = process.env.SITE_URL

beforeEach(() => {
  delete process.env.SITE_URL
})

afterEach(() => {
  if (savedEnv !== undefined) {
    process.env.SITE_URL = savedEnv
  } else {
    delete process.env.SITE_URL
  }
})

describe('getSiteUrl', () => {
  it('returns https://pundo.cy by default', () => {
    expect(getSiteUrl()).toBe('https://pundo.cy')
  })

  it('returns SITE_URL env when set', () => {
    process.env.SITE_URL = 'https://naidivse.cy'
    expect(getSiteUrl()).toBe('https://naidivse.cy')
  })
})

describe('productMetadata', () => {
  it('includes canonical URL', () => {
    const meta = productMetadata({ name: 'Widget', slug: 'widget-123' })
    expect(meta.alternates?.canonical).toBe('https://pundo.cy/products/widget-123')
  })

  it('includes title with price when provided', () => {
    const meta = productMetadata({ name: 'Widget', slug: 'widget-123', priceDisplay: '4.99 €' })
    expect(meta.title).toBe('Widget — 4.99 €')
  })

  it('title is just name when no price', () => {
    const meta = productMetadata({ name: 'Widget', slug: 'widget-123' })
    expect(meta.title).toBe('Widget')
  })

  it('includes og:image when imageUrl provided', () => {
    const meta = productMetadata({ name: 'Widget', slug: 'w', imageUrl: 'https://cdn.pundo.cy/img.jpg' })
    const images = (meta.openGraph as { images?: unknown[] } | undefined)?.images
    expect(images).toHaveLength(1)
  })

  it('omits og:images when no imageUrl', () => {
    const meta = productMetadata({ name: 'Widget', slug: 'w' })
    const images = (meta.openGraph as { images?: unknown } | undefined)?.images
    expect(images).toBeUndefined()
  })

  it('sets robots index: true', () => {
    const meta = productMetadata({ name: 'W', slug: 'w' })
    expect((meta.robots as { index: boolean } | undefined)?.index).toBe(true)
  })
})

describe('shopMetadata', () => {
  it('includes canonical URL', () => {
    const meta = shopMetadata({ name: 'My Shop', slug: 'my-shop' })
    expect(meta.alternates?.canonical).toBe('https://pundo.cy/shops/my-shop')
  })

  it('includes og:image when logoUrl provided', () => {
    const meta = shopMetadata({ name: 'My Shop', slug: 'my-shop', logoUrl: 'https://img.cy/logo.jpg' })
    const images = (meta.openGraph as { images?: unknown[] } | undefined)?.images
    expect(images).toHaveLength(1)
  })
})

describe('guideMetadata', () => {
  it('includes canonical URL', () => {
    const meta = guideMetadata({ title: 'Dogs in Cyprus', slug: 'hunde-zypern' })
    expect(meta.alternates?.canonical).toBe('https://pundo.cy/guides/hunde-zypern')
  })

  it('does NOT include hreflang languages', () => {
    const meta = guideMetadata({ title: 'Dogs in Cyprus', slug: 'hunde-zypern' })
    expect((meta.alternates as { languages?: unknown } | undefined)?.languages).toBeUndefined()
  })

  it('formats title with brand suffix', () => {
    const meta = guideMetadata({ title: 'Dogs in Cyprus', slug: 'hunde-zypern' })
    expect(meta.title).toBe('Dogs in Cyprus — pundo')
  })
})

describe('noIndexMetadata', () => {
  it('sets robots noindex and nofollow', () => {
    const meta = noIndexMetadata()
    expect((meta.robots as { index: boolean; follow: boolean }).index).toBe(false)
    expect((meta.robots as { index: boolean; follow: boolean }).follow).toBe(false)
  })

  it('includes title when provided', () => {
    const meta = noIndexMetadata('Sign in')
    expect(meta.title).toBe('Sign in')
  })

  it('omits title when not provided', () => {
    const meta = noIndexMetadata()
    expect(meta.title).toBeUndefined()
  })
})

describe('searchResultsMetadata', () => {
  it('sets robots noindex but follow', () => {
    const meta = searchResultsMetadata()
    expect((meta.robots as { index: boolean; follow: boolean }).index).toBe(false)
    expect((meta.robots as { index: boolean; follow: boolean }).follow).toBe(true)
  })
})

describe('searchPageMetadata', () => {
  it('includes canonical to /search (no-lang backward compat)', () => {
    const meta = searchPageMetadata()
    expect(meta.alternates?.canonical).toBe('https://pundo.cy/search')
  })

  it('includes canonical to /{lang}/search when lang provided', () => {
    const meta = searchPageMetadata('de')
    expect(meta.alternates?.canonical).toBe('https://pundo.cy/de/search')
  })

  it('includes hreflang languages when lang provided', () => {
    const meta = searchPageMetadata('en')
    const langs = (meta.alternates as { languages?: Record<string, string> } | undefined)?.languages
    expect(langs).toBeDefined()
    expect(langs?.['de']).toBe('https://pundo.cy/de/search')
    expect(langs?.['x-default']).toBe('https://pundo.cy/en/search')
  })

  it('does not include languages when no lang provided', () => {
    const meta = searchPageMetadata()
    const langs = (meta.alternates as { languages?: unknown } | undefined)?.languages
    expect(langs).toBeUndefined()
  })

  it('sets robots index: true', () => {
    const meta = searchPageMetadata()
    expect((meta.robots as { index: boolean } | undefined)?.index).toBe(true)
  })
})
