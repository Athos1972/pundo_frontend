/**
 * Unit tests for ShopOfferCard — offer-price-model-and-display-20260520 (T9)
 *
 * Tests:
 * - renders item_name
 * - shows promo price (bold accent) + strikethrough standard price when promo active
 * - shows only standard price when no promo
 * - renders "on request" label for on_request price_type
 * - renders image when item_photo_url present
 * - renders SVG placeholder when item_photo_url null
 * - renders product link when item_slug present
 * - renders plain text name when item_slug null
 * - shows promo_badge with date
 * - RTL: renders rtl:flex-row-reverse class (layout direction correct)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShopOfferCard } from '@/components/shop/ShopOfferCard'
import type { ShopOffer } from '@/types/api'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

vi.mock('@/lib/seo', () => ({
  getSiteUrl: () => 'https://example.com',
}))

vi.mock('@/lib/seo/absolutize', () => ({
  absolutizeImageUrl: (url: string | null, _base: string) => url,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FUTURE_DATE = '2099-12-31T23:59:59Z'

const BASE_OFFER: ShopOffer = {
  id: 1,
  item_name: 'PV-Anlage 5kW',
  item_slug: 'pv-anlage-5kw',
  item_photo_url: null,
  item_brand: 'SolarBrand',
  item_description: 'Komplette Installation inklusive',
  standard_price: '1200.0000',
  standard_price_type: 'fixed',
  standard_currency: 'EUR',
  promo_price: null,
  promo_price_type: null,
  promo_currency: null,
  promo_valid_until: null,
}

const OFFER_WITH_PROMO: ShopOffer = {
  ...BASE_OFFER,
  id: 2,
  standard_price: '1200.0000',
  promo_price: '990.0000',
  promo_price_type: 'fixed',
  promo_currency: 'EUR',
  promo_valid_until: FUTURE_DATE,
}

const OFFER_ON_REQUEST: ShopOffer = {
  ...BASE_OFFER,
  id: 3,
  item_slug: null,
  standard_price: null,
  standard_price_type: 'on_request',
  standard_currency: 'EUR',
  promo_price: null,
  promo_price_type: null,
  promo_currency: null,
  promo_valid_until: null,
}

const OFFER_WITH_IMAGE: ShopOffer = {
  ...BASE_OFFER,
  id: 4,
  item_photo_url: 'https://cdn.example.com/product.jpg',
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('ShopOfferCard — standard price (no promo)', () => {
  it('renders item_name', () => {
    render(<ShopOfferCard offer={BASE_OFFER} lang="en" />)
    expect(screen.getByText('PV-Anlage 5kW')).toBeDefined()
  })

  it('renders standard price formatted (4 decimal backend format → 2 decimals)', () => {
    render(<ShopOfferCard offer={BASE_OFFER} lang="en" />)
    expect(screen.getByText('1200.00 EUR')).toBeDefined()
  })

  it('renders item_brand', () => {
    render(<ShopOfferCard offer={BASE_OFFER} lang="en" />)
    expect(screen.getByText('SolarBrand')).toBeDefined()
  })

  it('renders item_description', () => {
    render(<ShopOfferCard offer={BASE_OFFER} lang="en" />)
    expect(screen.getByText('Komplette Installation inklusive')).toBeDefined()
  })

  it('renders link to product page when item_slug present', () => {
    render(<ShopOfferCard offer={BASE_OFFER} lang="en" />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/en/products/pv-anlage-5kw')
  })

  it('does NOT render a link when item_slug is null', () => {
    render(<ShopOfferCard offer={OFFER_ON_REQUEST} lang="en" />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders SVG placeholder when item_photo_url is null', () => {
    const { container } = render(<ShopOfferCard offer={BASE_OFFER} lang="en" />)
    expect(container.querySelector('svg')).toBeDefined()
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders img tag when item_photo_url is set', () => {
    const { container } = render(<ShopOfferCard offer={OFFER_WITH_IMAGE} lang="en" />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('https://cdn.example.com/product.jpg')
  })
})

describe('ShopOfferCard — on_request price_type', () => {
  it('renders "on request" label (EN)', () => {
    render(<ShopOfferCard offer={OFFER_ON_REQUEST} lang="en" />)
    // formatPriceOrLabel uses tr.price_on_request
    expect(screen.getByText(/on request/i)).toBeDefined()
  })

  it('renders "Auf Anfrage" label (DE)', () => {
    render(<ShopOfferCard offer={OFFER_ON_REQUEST} lang="de" />)
    expect(screen.getByText(/auf anfrage/i)).toBeDefined()
  })
})

describe('ShopOfferCard — promo price active', () => {
  it('renders promo price (990.00)', () => {
    render(<ShopOfferCard offer={OFFER_WITH_PROMO} lang="en" />)
    expect(screen.getByText('990.00 EUR')).toBeDefined()
  })

  it('renders standard price as strikethrough', () => {
    const { container } = render(<ShopOfferCard offer={OFFER_WITH_PROMO} lang="en" />)
    const s = container.querySelector('s')
    expect(s).not.toBeNull()
    expect(s?.textContent).toContain('1200.00')
  })

  it('renders promo badge with "Sale until" (EN)', () => {
    render(<ShopOfferCard offer={OFFER_WITH_PROMO} lang="en" />)
    // Badge text starts with tr.promo_badge = "Sale until"
    const badge = screen.getByText(/sale until/i)
    expect(badge).toBeDefined()
  })

  it('renders promo badge with "Aktion bis" (DE)', () => {
    render(<ShopOfferCard offer={OFFER_WITH_PROMO} lang="de" />)
    const badge = screen.getByText(/aktion bis/i)
    expect(badge).toBeDefined()
  })

  it('does NOT render strikethrough when standard_price_type is on_request', () => {
    const onRequestWithPromo: ShopOffer = {
      ...OFFER_WITH_PROMO,
      standard_price: null,
      standard_price_type: 'on_request',
    }
    const { container } = render(<ShopOfferCard offer={onRequestWithPromo} lang="en" />)
    // on_request is not numeric, so no strikethrough should appear
    expect(container.querySelector('s')).toBeNull()
  })
})

describe('ShopOfferCard — RTL layout', () => {
  it('root div has rtl:flex-row-reverse class', () => {
    const { container } = render(<ShopOfferCard offer={BASE_OFFER} lang="ar" />)
    const root = container.firstElementChild
    expect(root?.className).toContain('rtl:flex-row-reverse')
  })
})

describe('ShopOfferCard — no promo badge when promo_valid_until null', () => {
  it('does not render Sale-until badge for standard offer', () => {
    render(<ShopOfferCard offer={BASE_OFFER} lang="en" />)
    expect(screen.queryByText(/sale until/i)).toBeNull()
  })
})
