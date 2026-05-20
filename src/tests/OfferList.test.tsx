import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { OfferDetail } from '@/types/api'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

const baseOffer: OfferDetail = {
  shop_id: 1,
  shop_slug: 'test-shop',
  shop_name: 'Test Shop',
  shop_address: null,
  shop_location: null,
  price: null,
  currency: 'EUR',
  price_type: 'on_request',
  price_note: null,
  shop_phone: null,
  is_available: true,
  sku: null,
  url: null,
  crawled_at: '2026-05-01T10:00:00Z',
}

describe('OfferList — Aktionspreis-Regression (Bug: 3€ statt 39,99€)', () => {
  it('zeigt promo_price prominent wenn gesetzt', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = {
      ...baseOffer,
      price: '39.9900',
      price_type: 'fixed',
      currency: 'EUR',
      standard_price: '50.0000',
      standard_currency: 'EUR',
      promo_price: '39.9900',
      promo_currency: 'EUR',
      promo_valid_until: '2026-06-19T00:00:00Z',
    }
    render(<OfferList offers={[offer]} lang="en" productName="Budgie Food" />)
    expect(screen.getByText('39.99 EUR')).toBeInTheDocument()
    expect(screen.getByText('50.00 EUR')).toBeInTheDocument()
  })

  it('zeigt standard_price durchgestrichen wenn promo aktiv', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = {
      ...baseOffer,
      price: '39.9900',
      price_type: 'fixed',
      currency: 'EUR',
      standard_price: '50.0000',
      standard_currency: 'EUR',
      promo_price: '39.9900',
      promo_currency: 'EUR',
      promo_valid_until: '2026-06-19T00:00:00Z',
    }
    const { container } = render(<OfferList offers={[offer]} lang="en" productName="Budgie Food" />)
    const strikethrough = container.querySelector('s')
    expect(strikethrough).not.toBeNull()
    expect(strikethrough?.textContent).toBe('50.00 EUR')
  })

  it('zeigt keinen Durchstreichpreis wenn kein promo_price', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = {
      ...baseOffer,
      price: '50.0000',
      price_type: 'fixed',
      currency: 'EUR',
      standard_price: '50.0000',
      standard_currency: 'EUR',
    }
    const { container } = render(<OfferList offers={[offer]} lang="en" productName="Budgie Food" />)
    expect(container.querySelector('s')).toBeNull()
    expect(screen.getByText('50.00 EUR')).toBeInTheDocument()
  })

  it('fällt auf offer.price zurück wenn standard_price fehlt (Legacy-Antwort)', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = {
      ...baseOffer,
      price: '7.9900',
      price_type: 'fixed',
      currency: 'EUR',
    }
    render(<OfferList offers={[offer]} lang="en" productName="Budgie Food" />)
    expect(screen.getByText('7.99 EUR')).toBeInTheDocument()
  })
})

describe('OfferList — URL sanitization', () => {
  it('does not render a link when url is a raw base64 token', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = { ...baseOffer, url: 'Sa7Puak8aJ4JLDsUdQi7Q==' }
    render(<OfferList offers={[offer]} lang="en" productName="Test Product" />)
    expect(document.querySelector('a[href="Sa7Puak8aJ4JLDsUdQi7Q=="]')).toBeNull()
  })

  it('renders a Website link when url is a valid https URL', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offer: OfferDetail = { ...baseOffer, url: 'https://example.cy' }
    render(<OfferList offers={[offer]} lang="en" productName="Test Product" />)
    const links = screen.getAllByRole('link', { name: 'Website' })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('https://example.cy')
  })

  it('renders exactly one Website link when three offers have mixed urls (valid / token / null)', async () => {
    const { OfferList } = await import('@/components/product/OfferList')
    const offers: OfferDetail[] = [
      { ...baseOffer, shop_id: 1, shop_name: 'Shop A', url: 'https://valid.cy' },
      { ...baseOffer, shop_id: 2, shop_name: 'Shop B', url: 'Sa7Puak8aJ4JLDsUdQi7Q==' },
      { ...baseOffer, shop_id: 3, shop_name: 'Shop C', url: null },
    ]
    render(<OfferList offers={offers} lang="en" productName="Test Product" />)
    const websiteLinks = screen.getAllByRole('link', { name: 'Website' })
    expect(websiteLinks).toHaveLength(1)
    expect(websiteLinks[0].getAttribute('href')).toBe('https://valid.cy')
  })
})
