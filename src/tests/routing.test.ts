import { describe, it, expect } from 'vitest'
import { localePath, stripLang, buildHreflang } from '@/lib/routing'
import { LANGS } from '@/lib/lang'

describe('localePath', () => {
  it("prepends lang to path: 'de' + '/shops' → '/de/shops'", () => {
    expect(localePath('de', '/shops')).toBe('/de/shops')
  })

  it("works for RTL lang: 'ar' + '/guides/slug' → '/ar/guides/slug'", () => {
    expect(localePath('ar', '/guides/slug')).toBe('/ar/guides/slug')
  })

  it("works for root path: 'en' + '/' → '/en/'", () => {
    expect(localePath('en', '/')).toBe('/en/')
  })

  it('adds leading slash if path lacks one', () => {
    expect(localePath('de', 'shops')).toBe('/de/shops')
  })

  it('handles nested paths', () => {
    expect(localePath('ru', '/products/some-product')).toBe('/ru/products/some-product')
  })

  it('works for all supported langs', () => {
    for (const lang of LANGS) {
      expect(localePath(lang, '/about')).toBe(`/${lang}/about`)
    }
  })
})

describe('stripLang', () => {
  it("removes lang prefix: '/de/shops' → '/shops'", () => {
    expect(stripLang('/de/shops')).toBe('/shops')
  })

  it("removes RTL lang prefix: '/ar/' → '/'", () => {
    expect(stripLang('/ar/')).toBe('/')
  })

  it("leaves path unchanged if no lang prefix: '/shops' → '/shops'", () => {
    expect(stripLang('/shops')).toBe('/shops')
  })

  it("handles root with lang: '/en' → '/'", () => {
    expect(stripLang('/en')).toBe('/')
  })

  it('handles nested slug: /he/guides/my-guide → /guides/my-guide', () => {
    expect(stripLang('/he/guides/my-guide')).toBe('/guides/my-guide')
  })

  it('does not strip unknown segments: /xyz/shops → /xyz/shops', () => {
    expect(stripLang('/xyz/shops')).toBe('/xyz/shops')
  })

  it('strips all 6 supported langs', () => {
    for (const lang of LANGS) {
      expect(stripLang(`/${lang}/shops`)).toBe('/shops')
    }
  })
})

describe('buildHreflang', () => {
  const siteUrl = 'https://pundo.cy'

  it('generates an entry for each of the 6 langs', () => {
    const result = buildHreflang(siteUrl, '/about')
    for (const lang of LANGS) {
      expect(result[lang]).toBe(`${siteUrl}/${lang}/about`)
    }
  })

  it('x-default always points to /en/ variant', () => {
    const result = buildHreflang(siteUrl, '/shops/my-shop')
    expect(result['x-default']).toBe(`${siteUrl}/en/shops/my-shop`)
  })

  it('works for root path — no trailing slash (SEO-feedback-review-20260603 M1)', () => {
    const result = buildHreflang(siteUrl, '/')
    // Next.js trailingSlash=false: '/en/' 308-redirects to '/en'.
    // Canonical must point to the non-redirecting URL, so no trailing slash here.
    expect(result['en']).toBe(`${siteUrl}/en`)
    expect(result['x-default']).toBe(`${siteUrl}/en`)
  })

  it('root hreflang: all 6 langs and x-default have no trailing slash', () => {
    const result = buildHreflang(siteUrl, '/')
    for (const key of [...LANGS, 'x-default']) {
      expect(result[key]).not.toMatch(/\/$/)
    }
  })

  it('handles path without leading slash', () => {
    const result = buildHreflang(siteUrl, 'guides')
    expect(result['de']).toBe(`${siteUrl}/de/guides`)
  })

  it('handles slug paths', () => {
    const result = buildHreflang(siteUrl, '/products/iphone-15')
    expect(result['ar']).toBe(`${siteUrl}/ar/products/iphone-15`)
  })
})
