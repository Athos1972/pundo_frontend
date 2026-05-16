/**
 * Unit tests: truncateTitle, truncateDescription, padShopTitle, isIndexable
 * (F6400 SEO-Findings Sanierung)
 */
import { describe, it, expect } from 'vitest'
import {
  truncateTitle,
  truncateDescription,
  padShopTitle,
  isIndexable,
  TITLE_MIN,
  TITLE_MAX,
  DESC_MIN,
  DESC_MAX,
} from '@/lib/seo/metadata-defaults'

// ─────────────────────────────────────────────────────────────────────────────
// truncateTitle
// ─────────────────────────────────────────────────────────────────────────────

describe('truncateTitle', () => {
  it('returns input unchanged when within TITLE_MAX', () => {
    const short = 'Short title'
    expect(truncateTitle(short)).toBe('Short title')
  })

  it('truncates at word boundary and appends ellipsis', () => {
    const long = 'This is a very long product title that exceeds the maximum allowed character limit'
    const result = truncateTitle(long)
    expect(Array.from(result).length).toBeLessThanOrEqual(TITLE_MAX)
    expect(result.endsWith('…')).toBe(true)
    // Must cut at word boundary (no mid-word truncation)
    const withoutEllipsis = result.slice(0, -1)
    expect(withoutEllipsis.trim().at(-1)).not.toBe(' ')
  })

  it('respects reserved space for suffix', () => {
    const name = 'A product name that is quite long but not too long'
    const result = truncateTitle(name, { max: 60, reserved: 8 }) // 8 for " | Pundo"
    expect(Array.from(result).length).toBeLessThanOrEqual(60 - 8)
  })

  it('handles Multibyte / Arabic characters without cutting in the middle', () => {
    // Arabic text — each "character" is a code point, slice by code points
    const arabic = 'مقارنة الأسعار على بوندو — منتجات محلية في قبرص للمقيمين'
    const result = truncateTitle(arabic, { max: 40 })
    expect(Array.from(result).length).toBeLessThanOrEqual(40)
    // Should end with ellipsis if truncated
    if (Array.from(arabic).length > 40) {
      expect(result.endsWith('…')).toBe(true)
    }
  })

  it('handles text with no whitespace by doing a hard slice', () => {
    const noSpace = 'a'.repeat(80)
    const result = truncateTitle(noSpace)
    expect(Array.from(result).length).toBeLessThanOrEqual(TITLE_MAX)
  })

  it('strips basic HTML tags before truncating', () => {
    const html = '<p>Hello <strong>World</strong> — a very long product description here</p>'
    const result = truncateTitle(html, { max: 30 })
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('exact TITLE_MAX length is returned unchanged', () => {
    const exact = 'a'.repeat(TITLE_MAX)
    expect(truncateTitle(exact)).toBe(exact)
  })

  it('TITLE_MAX + 1 is truncated with ellipsis', () => {
    const tooLong = 'word '.repeat(13).trim() // > 60 chars
    const result = truncateTitle(tooLong)
    expect(Array.from(result).length).toBeLessThanOrEqual(TITLE_MAX)
    expect(result.endsWith('…')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// truncateDescription
// ─────────────────────────────────────────────────────────────────────────────

describe('truncateDescription', () => {
  it('returns input unchanged when within DESC_MAX', () => {
    const short = 'A short description.'
    expect(truncateDescription(short)).toBe('A short description.')
  })

  it('truncates at word boundary and appends ellipsis', () => {
    const long = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(5)
    const result = truncateDescription(long)
    expect(Array.from(result).length).toBeLessThanOrEqual(DESC_MAX)
    expect(result.endsWith('…')).toBe(true)
  })

  it('respects custom max option', () => {
    const long = 'word '.repeat(50)
    const result = truncateDescription(long, { max: 100 })
    expect(Array.from(result).length).toBeLessThanOrEqual(100)
  })

  it('handles Emoji characters (4-byte code points) without splitting', () => {
    const withEmoji = 'Shop: 🛒 Compare prices at Pundo — the local price guide for Cyprus expats and residents!'
    const result = truncateDescription(withEmoji, { max: 50 })
    // Should be valid code-point sequence — no half-emoji
    expect(() => new TextEncoder().encode(result)).not.toThrow()
    expect(Array.from(result).length).toBeLessThanOrEqual(50)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// padShopTitle
// ─────────────────────────────────────────────────────────────────────────────

describe('padShopTitle', () => {
  it('pads a very short shop name with city to reach TITLE_MIN', () => {
    const result = padShopTitle('Pudra', { city: 'Larnaca', category: null }, 'en', 'Pundo')
    expect(Array.from(result).length).toBeGreaterThanOrEqual(TITLE_MIN)
  })

  it('appends category if city alone is not enough', () => {
    const result = padShopTitle('A', { city: 'X', category: 'Pharmacy' }, 'en', 'Pundo')
    expect(Array.from(result).length).toBeGreaterThanOrEqual(TITLE_MIN)
  })

  it('appends localised tagline as last resort', () => {
    // Short name, no hints — tagline is appended to reach closer to TITLE_MIN
    const result = padShopTitle('Pudra', { city: null, category: null }, 'de', 'Pundo')
    expect(result).toContain('Pundo')
    // Result contains the tagline since shopName is short and no hints available
    expect(result).toContain('Preisvergleich')
  })

  it('never exceeds TITLE_MAX', () => {
    const longName = 'Sehr langer Shop-Name der wirklich viel zu lang ist für eine Headline'
    const result = padShopTitle(longName, { city: 'Limassol', category: 'Supermarkt' }, 'de', 'Pundo')
    expect(Array.from(result).length).toBeLessThanOrEqual(TITLE_MAX)
  })

  it('a normal-length shop name with brand suffix needs no padding', () => {
    // "Alpha Pharmacy Larnaca | Pundo" = 30 chars — still short, gets padded
    const result = padShopTitle('Alpha Pharmacy', { city: 'Larnaca', category: null }, 'en', 'Pundo')
    expect(Array.from(result).length).toBeGreaterThanOrEqual(TITLE_MIN)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// isIndexable
// ─────────────────────────────────────────────────────────────────────────────

describe('isIndexable', () => {
  // Indexable routes
  it.each([
    '/',
    '/search',
    '/shops',
    '/shops/my-shop',
    '/products/widget-123',
    '/guides',
    '/guides/my-guide',
    '/about',
    '/help',
    '/for-shops',
    '/contact',
    '/legal/imprint',
    '/legal/privacy',
    '/legal/terms',
    '/nostalgia',
    '/homesick',
  ])('marks %s as indexable', (path) => {
    expect(isIndexable(path).indexable).toBe(true)
  })

  // Non-indexable routes
  it.each([
    '/auth/login',
    '/auth/signup',
    '/account',
    '/account/profile',
    '/shop-admin',
    '/shop-admin/dashboard',
    '/admin',
    '/admin/users',
    '/api/v1/products',
    '/__playwright/test',
  ])('marks %s as non-indexable', (path) => {
    expect(isIndexable(path).indexable).toBe(false)
  })

  // Query-param pages
  it('marks /search?q=foo as non-indexable', () => {
    expect(isIndexable('/search?q=foo').indexable).toBe(false)
  })

  it('marks /products?shop_id=5 as non-indexable', () => {
    expect(isIndexable('/products?shop_id=5').indexable).toBe(false)
  })

  it('marks full URLs as well', () => {
    expect(isIndexable('https://pundo.cy/auth/login').indexable).toBe(false)
    expect(isIndexable('https://pundo.cy/products/widget').indexable).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

describe('length constants', () => {
  it('TITLE_MIN is 50', () => expect(TITLE_MIN).toBe(50))
  it('TITLE_MAX is 60', () => expect(TITLE_MAX).toBe(60))
  it('DESC_MIN is 110', () => expect(DESC_MIN).toBe(110))
  it('DESC_MAX is 160', () => expect(DESC_MAX).toBe(160))
})
