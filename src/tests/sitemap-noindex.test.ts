/**
 * Unit tests: isIndexable filters non-indexable patterns from sitemap (AC-30, F6400)
 *
 * This test ensures statically that all known NON_INDEXABLE routes would be
 * excluded if they accidentally landed in the sitemap generator.
 */
import { describe, it, expect } from 'vitest'
import { isIndexable } from '@/lib/seo/metadata-defaults'

const SITE_URL = 'https://pundo.cy'

function toSitemapEntry(path: string) {
  return { url: `${SITE_URL}${path}` }
}

function filterSitemap(entries: { url: string }[]) {
  return entries.filter((entry) => {
    try {
      // Pass the full URL to isIndexable (it handles both paths and full URLs)
      // This matches the logic in src/app/sitemap.ts
      return isIndexable(entry.url).indexable
    } catch {
      return true
    }
  })
}

describe('sitemap isIndexable filter (AC-30)', () => {
  const NON_INDEXABLE_PATHS = [
    '/auth/login',
    '/auth/signup',
    '/auth/verify-email',
    '/account',
    '/account/profile',
    '/account/security',
    '/shop-admin',
    '/shop-admin/dashboard',
    '/shop-admin/products',
    '/admin',
    '/admin/users',
    '/admin/reports',
    '/api/v1/shops',
    '/api/v1/products',
    '/__playwright/setup',
  ]

  const INDEXABLE_PATHS = [
    '/',
    '/search',
    '/shops',
    '/shops/my-great-shop',
    '/products/widget-123',
    '/guides',
    '/guides/life-in-cyprus',
    '/about',
    '/help',
    '/for-shops',
    '/contact',
    '/legal/imprint',
    '/legal/privacy',
    '/legal/terms',
    '/nostalgia',
    '/homesick',
    '/blog',
    // lang-prefixed variants (F6300 URL i18n)
    '/en/search',
    '/de/shops',
    '/en/shops/my-great-shop',
    '/ar/products/widget-123',
    '/he/guides/life-in-cyprus',
    '/ru/blog',
  ]

  const LANG_PREFIXED_NON_INDEXABLE_PATHS = [
    '/en/auth/login',
    '/de/shop-admin/dashboard',
    '/ru/admin/users',
  ]

  it('removes all non-indexable paths from the sitemap', () => {
    const raw = [...NON_INDEXABLE_PATHS, ...INDEXABLE_PATHS].map(toSitemapEntry)
    const filtered = filterSitemap(raw)

    // None of the non-indexable paths should survive
    const filteredPaths = filtered.map((e) => new URL(e.url).pathname)
    for (const path of NON_INDEXABLE_PATHS) {
      expect(filteredPaths).not.toContain(path)
    }
  })

  it('keeps all indexable paths in the sitemap', () => {
    const raw = INDEXABLE_PATHS.map(toSitemapEntry)
    const filtered = filterSitemap(raw)
    expect(filtered).toHaveLength(INDEXABLE_PATHS.length)
  })

  it('removes /search?q=foo (query-param URL) from sitemap', () => {
    const raw = [{ url: `${SITE_URL}/search?q=ibuprofen` }]
    const filtered = filterSitemap(raw)
    expect(filtered).toHaveLength(0)
  })

  it('removes /products?shop_id=5 from sitemap', () => {
    const raw = [{ url: `${SITE_URL}/products?shop_id=5` }]
    const filtered = filterSitemap(raw)
    expect(filtered).toHaveLength(0)
  })

  it('is safe with an empty sitemap', () => {
    expect(filterSitemap([])).toHaveLength(0)
  })

  it('removes lang-prefixed non-indexable paths from the sitemap', () => {
    const raw = LANG_PREFIXED_NON_INDEXABLE_PATHS.map(toSitemapEntry)
    const filtered = filterSitemap(raw)
    expect(filtered).toHaveLength(0)
  })

  it('keeps lang-prefixed indexable paths (/en/search, /de/shops, etc.)', () => {
    const langPrefixedIndexable = [
      '/en/search',
      '/de/shops',
      '/en/shops/my-shop',
      '/ar/products/widget-123',
    ].map(toSitemapEntry)
    const filtered = filterSitemap(langPrefixedIndexable)
    expect(filtered).toHaveLength(langPrefixedIndexable.length)
  })
})
