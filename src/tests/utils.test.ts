/**
 * Unit tests for src/lib/utils.ts
 * Covers: formatCrawledAt, fmtPrice, formatPrice, formatWeight, formatSizeAttr
 * formatPriceOrLabel is covered in price-type.test.tsx
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatCrawledAt,
  fmtPrice,
  formatPrice,
  formatWeight,
  formatSizeAttr,
  toRelativeImageUrl,
  pickImg,
} from '@/lib/utils'

// ─── formatCrawledAt ─────────────────────────────────────────────────────────

describe('formatCrawledAt', () => {
  afterEach(() => { vi.useRealTimers() })

  it('returns "today" label when crawled today (EN)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    expect(formatCrawledAt('2026-04-10T08:00:00Z', 'en')).toBe('today')
  })

  it('returns "heute" for today in DE', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    expect(formatCrawledAt('2026-04-10T06:00:00Z', 'de')).toBe('heute')
  })

  it('returns "сегодня" for today in RU', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    expect(formatCrawledAt('2026-04-10T06:00:00Z', 'ru')).toBe('сегодня')
  })

  it('returns "σήμερα" for today in EL', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    expect(formatCrawledAt('2026-04-10T06:00:00Z', 'el')).toBe('σήμερα')
  })

  it('returns "N days ago" when crawled 3 days ago (EN)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    expect(formatCrawledAt('2026-04-07T12:00:00Z', 'en')).toBe('3 days ago')
  })

  it('returns "vor N Tagen" for DE', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    expect(formatCrawledAt('2026-04-07T12:00:00Z', 'de')).toBe('vor 3 Tagen')
  })

  it('returns "N дней назад" for RU', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    expect(formatCrawledAt('2026-04-07T12:00:00Z', 'ru')).toBe('3 дней назад')
  })

  it('returns "πριν N μέρες" for EL', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    expect(formatCrawledAt('2026-04-07T12:00:00Z', 'el')).toBe('πριν 3 μέρες')
  })

  it('falls back to EN for unknown language', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))
    expect(formatCrawledAt('2026-04-08T12:00:00Z', 'xx')).toBe('2 days ago')
  })
})

// ─── fmtPrice ────────────────────────────────────────────────────────────────

describe('fmtPrice', () => {
  it('truncates trailing zeros: "7.9900" → "7.99"', () => {
    expect(fmtPrice('7.9900')).toBe('7.99')
  })

  it('rounds to 2 decimal places: "3.1" → "3.10"', () => {
    expect(fmtPrice('3.1')).toBe('3.10')
  })

  it('handles integer price: "5" → "5.00"', () => {
    expect(fmtPrice('5')).toBe('5.00')
  })

  it('returns raw string for non-numeric input', () => {
    expect(fmtPrice('N/A')).toBe('N/A')
  })

  it('handles "0" correctly', () => {
    expect(fmtPrice('0')).toBe('0.00')
  })
})

// ─── formatPrice ─────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('combines price and currency', () => {
    expect(formatPrice('9.9900', 'EUR')).toBe('9.99 EUR')
  })

  it('handles different currencies', () => {
    expect(formatPrice('1.50', 'USD')).toBe('1.50 USD')
  })
})

// ─── formatWeight ─────────────────────────────────────────────────────────────

describe('formatWeight', () => {
  it('formats grams under 1kg', () => {
    expect(formatWeight(400)).toBe('400 g')
  })

  it('formats exactly 1000g as 1 kg (no decimal)', () => {
    expect(formatWeight(1000)).toBe('1 kg')
  })

  it('formats 2000g as 2 kg', () => {
    expect(formatWeight(2000)).toBe('2 kg')
  })

  it('formats 1500g as 1.5 kg', () => {
    expect(formatWeight(1500)).toBe('1.5 kg')
  })

  it('formats 999g correctly', () => {
    expect(formatWeight(999)).toBe('999 g')
  })
})

// ─── formatSizeAttr ──────────────────────────────────────────────────────────

describe('formatSizeAttr', () => {
  it('returns null for null/undefined/empty', () => {
    expect(formatSizeAttr(null)).toBeNull()
    expect(formatSizeAttr(undefined)).toBeNull()
    expect(formatSizeAttr('')).toBeNull()
    expect(formatSizeAttr(0)).toBeNull()
  })

  it('formats { unit: "g", value: 400 } as weight', () => {
    expect(formatSizeAttr({ unit: 'g', value: 400 })).toBe('400 g')
  })

  it('formats { unit: "kg", value: 1.5 } as weight in grams × 1000', () => {
    expect(formatSizeAttr({ unit: 'kg', value: 1.5 })).toBe('1.5 kg')
  })

  it('formats { unit: "ml", value: 500 }', () => {
    expect(formatSizeAttr({ unit: 'ml', value: 500 })).toBe('500 ml')
  })

  it('formats { unit: "ml", value: 1000 } as litres', () => {
    expect(formatSizeAttr({ unit: 'ml', value: 1000 })).toBe('1 l')
  })

  it('formats { unit: "ml", value: 1500 } as 1.5 l', () => {
    expect(formatSizeAttr({ unit: 'ml', value: 1500 })).toBe('1.5 l')
  })

  it('formats { unit: "l", value: 2 }', () => {
    expect(formatSizeAttr({ unit: 'l', value: 2 })).toBe('2 l')
  })

  it('formats { unit: "cm", value: 50 } with unit passthrough', () => {
    expect(formatSizeAttr({ unit: 'cm', value: 50 })).toBe('50 cm')
  })

  it('returns null for object with NaN value', () => {
    expect(formatSizeAttr({ unit: 'g', value: 'not-a-number' })).toBeNull()
  })

  it('formats raw string "50 cm"', () => {
    expect(formatSizeAttr('50 cm')).toBe('50 cm')
  })

  it('returns null for whitespace-only string', () => {
    expect(formatSizeAttr('   ')).toBeNull()
  })

  it('handles string value in object form', () => {
    expect(formatSizeAttr({ unit: 'g', value: '400' })).toBe('400 g')
  })
})

// ─── pickImg ─────────────────────────────────────────────────────────────────

describe('pickImg', () => {
  const fullImages = {
    thumb:    '/product_images/abc_thumb.webp',
    card:     '/product_images/abc_card.webp',
    carousel: '/product_images/abc_carousel.webp',
    detail:   '/product_images/abc_detail.webp',
    orig:     '/product_images/abc_orig.jpg',
  }

  it('returns the requested variant URL', () => {
    expect(pickImg(fullImages, 'card')).toBe('/product_images/abc_card.webp')
    expect(pickImg(fullImages, 'detail')).toBe('/product_images/abc_detail.webp')
    expect(pickImg(fullImages, 'orig')).toBe('/product_images/abc_orig.jpg')
  })

  it('falls back to toRelativeImageUrl(fallback) when variant is null', () => {
    const partialImages = { ...fullImages, carousel: null }
    expect(pickImg(partialImages, 'carousel', '/thumb/cat.png')).toBe('/thumb/cat.png')
  })

  it('strips localhost from fallback URL', () => {
    const noImages = { ...fullImages, card: null }
    expect(pickImg(noImages, 'card', 'http://localhost:8001/product_images/cat.jpg'))
      .toBe('/product_images/cat.jpg')
  })

  it('returns null when images is null and no fallback', () => {
    expect(pickImg(null, 'card')).toBeNull()
  })

  it('returns null when images is undefined and no fallback', () => {
    expect(pickImg(undefined, 'card')).toBeNull()
  })

  it('returns null when variant is null and fallback is null', () => {
    const noCard = { ...fullImages, card: null }
    expect(pickImg(noCard, 'card', null)).toBeNull()
  })

  it('returns variant over fallback (variant wins)', () => {
    expect(pickImg(fullImages, 'thumb', '/should-not-be-used.jpg'))
      .toBe('/product_images/abc_thumb.webp')
  })
})

// ─── toRelativeImageUrl ───────────────────────────────────────────────────────

describe('toRelativeImageUrl', () => {
  it('strips localhost origin from thumbnail_url (bug regression: images broken on mobile)', () => {
    expect(toRelativeImageUrl('http://localhost:8001/product_images/abc.jpg')).toBe('/product_images/abc.jpg')
  })

  it('strips localhost:3000 origin', () => {
    expect(toRelativeImageUrl('http://localhost:3000/product_images/abc.jpg')).toBe('/product_images/abc.jpg')
  })

  it('returns relative path unchanged', () => {
    expect(toRelativeImageUrl('/product_images/abc.jpg')).toBe('/product_images/abc.jpg')
  })

  it('returns null for null', () => {
    expect(toRelativeImageUrl(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(toRelativeImageUrl(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(toRelativeImageUrl('')).toBeNull()
  })

  it('leaves non-localhost absolute URLs unchanged', () => {
    expect(toRelativeImageUrl('https://cdn.example.com/img.jpg')).toBe('https://cdn.example.com/img.jpg')
  })
})
