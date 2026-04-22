/**
 * Tests for the enriched ShopCard and ShopsContent filter/state logic.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShopCard } from '@/components/shop/ShopCard'
import { t } from '@/lib/translations'
import type { ShopListItem } from '@/types/api'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseShop: ShopListItem = {
  id: 1,
  slug: 'test-shop',
  name: 'Test Shop',
  address_raw: '42 Main Street, Larnaca',
  location: { lat: 34.9, lng: 33.6 },
  dist_km: 1.5,
  phone: null,
  whatsapp_number: null,
  whatsapp_url: null,
  website: null,
  opening_hours: null,
  status: 'active',
  product_count: 12,
  last_scraped: null,
  review_stats: null,
  shop_type: null,
  spoken_languages: null,
  language_votes: [],
  is_open_now: null,
}

const shopWithAll: ShopListItem = {
  ...baseShop,
  review_stats: { average_stars: 4.3, total_count: 27 },
  shop_type: {
    id: 5,
    canonical: 'supermarket',
    google_types: [],
    translations: { de: 'Supermarkt', el: 'Σούπερ Μάρκετ', ru: null, ar: null, he: null },
  },
  spoken_languages: ['en', 'de', 'el'],
  language_votes: [
    { attribute_type: 'language_en', weighted_avg: 4.5, vote_count: 10, my_value: null },
    { attribute_type: 'language_de', weighted_avg: 3.0, vote_count: 5,  my_value: null },
    { attribute_type: 'language_el', weighted_avg: 4.8, vote_count: 20, my_value: null },
  ],
  is_open_now: true,
}

// ── ShopCard rendering ────────────────────────────────────────────────────────

describe('ShopCard', () => {
  it('renders shop name', () => {
    render(<ShopCard shop={baseShop} lang="en" />)
    expect(screen.getByText('Test Shop')).toBeInTheDocument()
  })

  it('renders address', () => {
    render(<ShopCard shop={baseShop} lang="en" />)
    expect(screen.getByText('42 Main Street, Larnaca')).toBeInTheDocument()
  })

  it('renders formatted distance < 1 km as metres', () => {
    const shop = { ...baseShop, dist_km: 0.35 }
    render(<ShopCard shop={shop} lang="en" />)
    expect(screen.getByText('350m')).toBeInTheDocument()
  })

  it('renders formatted distance ≥ 1 km with one decimal', () => {
    render(<ShopCard shop={baseShop} lang="en" />)
    expect(screen.getByText('1.5km')).toBeInTheDocument()
  })

  it('does NOT render distance when dist_km is null', () => {
    const shop = { ...baseShop, dist_km: null }
    render(<ShopCard shop={shop} lang="en" />)
    expect(screen.queryByText(/\dkm$/)).not.toBeInTheDocument()
  })

  it('shows product count', () => {
    render(<ShopCard shop={baseShop} lang="en" />)
    expect(screen.getByText(/12/)).toBeInTheDocument()
  })

  it('falls back to "Shop" when name is null', () => {
    const shop = { ...baseShop, name: null }
    render(<ShopCard shop={shop} lang="en" />)
    expect(screen.getByText('Shop')).toBeInTheDocument()
  })

  // ── Rating ──────────────────────────────────────────────────────────────────

  it('shows review count when review_stats is present', () => {
    render(<ShopCard shop={shopWithAll} lang="en" />)
    expect(screen.getByText('27 reviews')).toBeInTheDocument()
  })

  it('uses singular for exactly 1 review (EN)', () => {
    const shop = { ...baseShop, review_stats: { average_stars: 5, total_count: 1 } }
    render(<ShopCard shop={shop} lang="en" />)
    expect(screen.getByText('1 review')).toBeInTheDocument()
  })

  it('hides reviews block when review_stats is null', () => {
    render(<ShopCard shop={baseShop} lang="en" />)
    expect(screen.queryByText(/review/)).not.toBeInTheDocument()
  })

  // ── Shop type ───────────────────────────────────────────────────────────────

  it('shows translated shop type in German', () => {
    render(<ShopCard shop={shopWithAll} lang="de" />)
    expect(screen.getByText('Supermarkt')).toBeInTheDocument()
  })

  it('shows translated shop type in Greek', () => {
    render(<ShopCard shop={shopWithAll} lang="el" />)
    expect(screen.getByText('Σούπερ Μάρκετ')).toBeInTheDocument()
  })

  it('falls back to canonical when no translation for lang (ru→null)', () => {
    render(<ShopCard shop={shopWithAll} lang="ru" />)
    expect(screen.getByText('supermarket')).toBeInTheDocument()
  })

  it('falls back to canonical for English (not in translations map)', () => {
    render(<ShopCard shop={shopWithAll} lang="en" />)
    expect(screen.getByText('supermarket')).toBeInTheDocument()
  })

  it('hides shop type badge when shop_type is null', () => {
    render(<ShopCard shop={baseShop} lang="en" />)
    expect(screen.queryByText('supermarket')).not.toBeInTheDocument()
  })

  // ── Open/Closed ──────────────────────────────────────────────────────────────

  it('shows "Open now" badge when is_open_now=true (EN)', () => {
    render(<ShopCard shop={shopWithAll} lang="en" />)
    expect(screen.getByText('Open now')).toBeInTheDocument()
  })

  it('shows "Jetzt geöffnet" in German', () => {
    render(<ShopCard shop={shopWithAll} lang="de" />)
    expect(screen.getByText('Jetzt geöffnet')).toBeInTheDocument()
  })

  it('shows closed badge when is_open_now=false', () => {
    const shop = { ...shopWithAll, is_open_now: false }
    render(<ShopCard shop={shop} lang="en" />)
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('hides open/closed badge when is_open_now=null', () => {
    const shop = { ...shopWithAll, is_open_now: null }
    render(<ShopCard shop={shop} lang="en" />)
    expect(screen.queryByText('Open now')).not.toBeInTheDocument()
    expect(screen.queryByText('Closed')).not.toBeInTheDocument()
  })

  // ── RTL — AR/HE ──────────────────────────────────────────────────────────────

  it('shows "مفتوح الآن" in Arabic', () => {
    render(<ShopCard shop={shopWithAll} lang="ar" />)
    expect(screen.getByText('مفتوح الآن')).toBeInTheDocument()
  })

  it('shows "פתוח עכשיו" in Hebrew', () => {
    render(<ShopCard shop={shopWithAll} lang="he" />)
    expect(screen.getByText('פתוח עכשיו')).toBeInTheDocument()
  })

  // ── Language badges ──────────────────────────────────────────────────────────
  // Note: CSS `uppercase` is visual only — DOM text stays lowercase.
  // We test for lowercase codes as they appear in the DOM.

  it('renders language badges for all spoken languages with votes ≥1', () => {
    render(<ShopCard shop={shopWithAll} lang="en" />)
    expect(screen.getByText('en')).toBeInTheDocument()
    expect(screen.getByText('de')).toBeInTheDocument()
    expect(screen.getByText('el')).toBeInTheDocument()
  })

  it('hides badge for a language whose vote_count=0', () => {
    const shop: ShopListItem = {
      ...baseShop,
      spoken_languages: ['en', 'ru'],
      language_votes: [
        { attribute_type: 'language_en', weighted_avg: 4.0, vote_count: 3, my_value: null },
        { attribute_type: 'language_ru', weighted_avg: 0,   vote_count: 0, my_value: null },
      ],
    }
    render(<ShopCard shop={shop} lang="en" />)
    expect(screen.getByText('en')).toBeInTheDocument()
    expect(screen.queryByText('ru')).not.toBeInTheDocument()
  })

  it('hides all language badges when spoken_languages is null', () => {
    const shop = { ...baseShop, spoken_languages: null, language_votes: [] }
    render(<ShopCard shop={shop} lang="en" />)
    // no badge codes visible
    expect(screen.queryByText('en')).not.toBeInTheDocument()
  })

  it('hides badge for spoken language with no matching vote entry', () => {
    const shop: ShopListItem = {
      ...baseShop,
      spoken_languages: ['en'],
      language_votes: [], // no votes at all
    }
    render(<ShopCard shop={shop} lang="en" />)
    expect(screen.queryByText('en')).not.toBeInTheDocument()
  })
})

// ── Translation keys ──────────────────────────────────────────────────────────

describe('shop_open_now translation key', () => {
  it.each([
    ['en', 'Open now'],
    ['de', 'Jetzt geöffnet'],
    ['ru', 'Открыто'],
    ['el', 'Ανοιχτό τώρα'],
    ['ar', 'مفتوح الآن'],
    ['he', 'פתוח עכשיו'],
  ])('lang=%s → "%s"', (lang, expected) => {
    expect(t(lang).shop_open_now).toBe(expected)
  })
})

describe('filter_all translation key', () => {
  it.each([
    ['en', 'All'],
    ['de', 'Alle'],
    ['ru', 'Все'],
    ['el', 'Όλα'],
    ['ar', 'الكل'],
    ['he', 'הכל'],
  ])('lang=%s → "%s"', (lang, expected) => {
    expect(t(lang).filter_all).toBe(expected)
  })
})

describe('shop_reviews_count translation', () => {
  it('EN singular and plural', () => {
    expect(t('en').shop_reviews_count(1)).toBe('1 review')
    expect(t('en').shop_reviews_count(5)).toBe('5 reviews')
  })

  it('DE singular/plural', () => {
    expect(t('de').shop_reviews_count(1)).toBe('1 Bewertung')
    expect(t('de').shop_reviews_count(3)).toBe('3 Bewertungen')
  })

  it('RU plural forms — 1/2/5/11/21', () => {
    expect(t('ru').shop_reviews_count(1)).toBe('1 отзыв')
    expect(t('ru').shop_reviews_count(2)).toBe('2 отзыва')
    expect(t('ru').shop_reviews_count(5)).toBe('5 отзывов')
    expect(t('ru').shop_reviews_count(11)).toBe('11 отзывов') // exception: 11 → ов
    expect(t('ru').shop_reviews_count(21)).toBe('21 отзыв')
  })
})
