/**
 * Tests for price_type feature:
 * - formatPriceOrLabel() util — all price_types, all 6 languages
 * - OfferList — sorting with mixed price_types, CTA rendering
 * - ProductCard — on_request label, muted color
 * - FilterChips — withPrice chip rendering and toggle
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { t } from '@/lib/translations'
import { formatPriceOrLabel } from '@/lib/utils'
import type { OfferDetail } from '@/types/api'

// ─── Shared mocks ────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('@/lib/lang', () => ({
  getLangFromCookie: () => 'en',
  isRTL: (lang: string) => lang === 'ar' || lang === 'he',
}))

// ─── formatPriceOrLabel ───────────────────────────────────────────────────────

describe('formatPriceOrLabel', () => {
  const en = t('en')
  const de = t('de')
  const ar = t('ar')
  const he = t('he')

  it('fixed: returns formatted price + currency, isNumeric=true', () => {
    const result = formatPriceOrLabel('7.9900', 'EUR', 'fixed', null, en)
    expect(result.display).toBe('7.99 EUR')
    expect(result.isNumeric).toBe(true)
    expect(result.note).toBeNull()
  })

  it('fixed: passes through price_note', () => {
    const result = formatPriceOrLabel('5.00', 'EUR', 'fixed', 'pro Stunde', de)
    expect(result.note).toBe('pro Stunde')
  })

  it('on_request: returns label, isNumeric=false', () => {
    const result = formatPriceOrLabel(null, 'EUR', 'on_request', null, en)
    expect(result.display).toBe('Price on request')
    expect(result.isNumeric).toBe(false)
  })

  it('free: returns label, isNumeric=false', () => {
    const result = formatPriceOrLabel(null, 'EUR', 'free', 'Erstberatung', en)
    expect(result.display).toBe('Free')
    expect(result.isNumeric).toBe(false)
    expect(result.note).toBe('Erstberatung')
  })

  it('variable: returns label', () => {
    const result = formatPriceOrLabel(null, 'EUR', 'variable', 'ab 5 €/kg', en)
    expect(result.display).toBe('Variable price')
    expect(result.note).toBe('ab 5 €/kg')
  })

  it('DE: on_request = "Preis auf Anfrage"', () => {
    expect(formatPriceOrLabel(null, 'EUR', 'on_request', null, de).display).toBe('Preis auf Anfrage')
  })

  it('AR: on_request = Arabic string', () => {
    expect(formatPriceOrLabel(null, 'EUR', 'on_request', null, ar).display).toBe('السعر عند الطلب')
  })

  it('HE: free = Hebrew string', () => {
    expect(formatPriceOrLabel(null, 'EUR', 'free', null, he).display).toBe('חינם')
  })

  it('unknown price_type falls back to on_request label', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = formatPriceOrLabel(null, 'EUR', 'unknown_type' as any, null, en)
    expect(result.display).toBe('Price on request')
    expect(result.isNumeric).toBe(false)
  })
})

// ─── OfferList sorting ────────────────────────────────────────────────────────

describe('OfferList sorting', () => {
  const makeOffer = (overrides: Partial<OfferDetail>): OfferDetail => ({
    shop_id: 1, shop_slug: 'shop-a', shop_name: 'Shop A', shop_address: null,
    shop_location: null, price: null, currency: 'EUR',
    price_type: 'on_request', price_note: null, shop_phone: null,
    is_available: true, sku: null, url: null, crawled_at: '2026-01-01T00:00:00Z',
    ...overrides,
  })

  it('fixed offers appear before on_request', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offers = [
      makeOffer({ shop_name: 'Shop On Request', price_type: 'on_request' }),
      makeOffer({ shop_name: 'Shop Fixed', price: '5.00', price_type: 'fixed' }),
    ]
    render(<OfferList offers={offers} lang="en" />)
    const items = screen.getAllByRole('link').map(el => el.textContent)
    expect(items[0]).toBe('Shop Fixed')
    expect(items[1]).toBe('Shop On Request')
  })

  it('fixed offers sorted by price ascending', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offers = [
      makeOffer({ shop_name: 'Expensive', price: '10.00', price_type: 'fixed' }),
      makeOffer({ shop_name: 'Cheap', price: '3.00', price_type: 'fixed' }),
      makeOffer({ shop_name: 'Medium', price: '6.00', price_type: 'fixed' }),
    ]
    render(<OfferList offers={offers} lang="en" />)
    const links = screen.getAllByRole('link').map(el => el.textContent)
    expect(links[0]).toBe('Cheap')
    expect(links[1]).toBe('Medium')
    expect(links[2]).toBe('Expensive')
  })

  it('non-fixed offers sorted alphabetically after fixed', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offers = [
      makeOffer({ shop_name: 'Zebra Shop', price_type: 'on_request' }),
      makeOffer({ shop_name: 'Alpha Shop', price_type: 'free' }),
      makeOffer({ shop_name: 'Fixed Shop', price: '9.99', price_type: 'fixed' }),
    ]
    render(<OfferList offers={offers} lang="en" />)
    const links = screen.getAllByRole('link').map(el => el.textContent)
    expect(links[0]).toBe('Fixed Shop')
    expect(links[1]).toBe('Alpha Shop')
    expect(links[2]).toBe('Zebra Shop')
  })

  it('on_request shows muted price label, not accent', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offers = [makeOffer({ shop_name: 'Pet Vet', price_type: 'on_request' })]
    const { container } = render(<OfferList offers={offers} lang="en" />)
    expect(screen.getByText('Price on request')).toBeInTheDocument()
    // Should NOT have accent color on the price element
    const priceEl = container.querySelector('p.font-bold')
    expect(priceEl?.className).toContain('text-text-muted')
    expect(priceEl?.className).not.toContain('text-accent')
  })

  it('shows price_note when provided', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offers = [makeOffer({ price: '5.00', price_type: 'fixed', price_note: 'pro Stunde' })]
    render(<OfferList offers={offers} lang="en" />)
    expect(screen.getByText('pro Stunde')).toBeInTheDocument()
  })

  it('shows CTA links when on_request and phone/url present', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offers = [makeOffer({
      price_type: 'on_request',
      shop_phone: '+357 99 123456',
      url: 'https://example.com',
    })]
    render(<OfferList offers={offers} lang="en" />)
    const telLink = screen.getByText('Contact shop').closest('a')
    expect(telLink?.getAttribute('href')).toBe('tel:+357 99 123456')
    const webLink = screen.getByText('Website').closest('a')
    expect(webLink?.getAttribute('href')).toBe('https://example.com')
  })

  it('no CTA block when on_request but no phone and no url', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offers = [makeOffer({ price_type: 'on_request', shop_phone: null, url: null })]
    render(<OfferList offers={offers} lang="en" />)
    expect(screen.queryByText('Contact shop')).not.toBeInTheDocument()
    expect(screen.queryByText('Website')).not.toBeInTheDocument()
  })

  it('no CTA for fixed-price offers', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offers = [makeOffer({
      price: '9.99', price_type: 'fixed',
      shop_phone: '+357 99 000000', url: 'https://shop.com',
    })]
    render(<OfferList offers={offers} lang="en" />)
    expect(screen.queryByText('Contact shop')).not.toBeInTheDocument()
  })
})

// ─── ProductCard with on_request ─────────────────────────────────────────────

describe('ProductCard price_type rendering', () => {
  const base = {
    id: 1, slug: 'dog-toys', name: 'Dog Toys', brand: null,
    category_id: null, thumbnail_url: null, images: [], best_offer: null,
  }

  it('shows muted label for on_request best_offer', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = {
      ...base,
      best_offer: {
        price: null, currency: 'EUR', price_type: 'on_request', price_note: null,
        shop_id: 1, shop_name: 'Vet Clinic', shop_slug: 'vet-clinic',
        dist_km: null, is_available: true, crawled_at: '2026-01-01T00:00:00Z',
        url: null, shop_location: null,
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(<ProductCard item={item as any} lang="en" />)
    expect(screen.getByText('Price on request')).toBeInTheDocument()
    const span = container.querySelector('span.font-bold')
    expect(span?.className).toContain('text-text-muted')
  })

  it('shows accent price for fixed best_offer', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = {
      ...base,
      best_offer: {
        price: '12.50', currency: 'EUR', price_type: 'fixed', price_note: null,
        shop_id: 1, shop_name: 'Pet Shop', shop_slug: 'pet-shop',
        dist_km: null, is_available: true, crawled_at: '2026-01-01T00:00:00Z',
        url: null, shop_location: null,
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(<ProductCard item={item as any} lang="en" />)
    const span = container.querySelector('span.font-bold')
    expect(span?.className).toContain('text-accent')
  })
})

// ─── FilterChips with withPrice ───────────────────────────────────────────────

describe('FilterChips withPrice', () => {
  it('renders "With price only" chip', async () => {
    const { FilterChips } = await import('@/components/search/FilterChips')
    render(
      <FilterChips
        available={false} onAvailableChange={vi.fn()}
        withPrice={false} onWithPriceChange={vi.fn()}
        includeOnline={true} onIncludeOnlineChange={vi.fn()}
        lang="en"
      />
    )
    expect(screen.getByText('With price only')).toBeInTheDocument()
  })

  it('calls onWithPriceChange when chip clicked', async () => {
    const { FilterChips } = await import('@/components/search/FilterChips')
    const spy = vi.fn()
    render(
      <FilterChips
        available={false} onAvailableChange={vi.fn()}
        withPrice={false} onWithPriceChange={spy}
        includeOnline={true} onIncludeOnlineChange={vi.fn()}
        lang="en"
      />
    )
    fireEvent.click(screen.getByText('With price only'))
    expect(spy).toHaveBeenCalledWith(true)
  })

  it('chip has accent style when withPrice=true', async () => {
    const { FilterChips } = await import('@/components/search/FilterChips')
    render(
      <FilterChips
        available={false} onAvailableChange={vi.fn()}
        withPrice={true} onWithPriceChange={vi.fn()}
        includeOnline={true} onIncludeOnlineChange={vi.fn()}
        lang="de"
      />
    )
    const btn = screen.getByText('Nur mit Preis')
    expect(btn.className).toContain('bg-accent')
  })
})

// ─── translations: all 6 languages have all 5 new keys ───────────────────────

describe('translations: new price_type keys', () => {
  const langs = ['en', 'de', 'ru', 'el', 'ar', 'he'] as const
  const keys = ['price_on_request', 'price_free', 'price_variable', 'filter_price_only', 'contact_shop'] as const

  for (const lang of langs) {
    for (const key of keys) {
      it(`${lang}.${key} is non-empty string`, () => {
        const tr = t(lang)
        const val = tr[key] as string
        expect(typeof val).toBe('string')
        expect(val.length).toBeGreaterThan(0)
      })
    }
  }
})
