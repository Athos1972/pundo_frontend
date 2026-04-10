import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShopCard } from '@/components/shop/ShopCard'
import { OfferList } from '@/components/product/OfferList'
import { ProductCard } from '@/components/product/ProductCard'
import type { ShopListItem, OfferDetail, ProductListItem } from '@/types/api'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('@/lib/translations', () => ({
  t: () => ({
    available: 'Verfügbar',
    unavailable: 'Nicht verfügbar',
    last_checked: 'Zuletzt geprüft',
    price_on_request: 'Preis auf Anfrage',
    price_free: 'Kostenlos',
    price_variable: 'Variabler Preis',
    filter_price_only: 'Nur mit Preis',
    contact_shop: 'Shop kontaktieren',
  }),
}))

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    formatCrawledAt: () => '01.01.2025',
    formatPriceOrLabel: (price: string | null, currency: string) =>
      ({ display: price ? `${price} ${currency}` : 'Preis auf Anfrage', isNumeric: !!price, note: null }),
  }
})

const makeShop = (overrides?: Partial<ShopListItem>): ShopListItem => ({
  id: 42,
  slug: 'mein-testshop',
  name: 'Mein Testshop',
  address_raw: 'Hauptstraße 1, Nikosia',
  location: null,
  dist_km: null,
  phone: null,
  website: null,
  opening_hours: null,
  status: 'active',
  product_count: 5,
  last_scraped: null,
  ...overrides,
})

const makeOffer = (overrides?: Partial<OfferDetail>): OfferDetail => ({
  shop_id: 42,
  shop_slug: 'mein-testshop',
  shop_name: 'Mein Testshop',
  shop_address: 'Hauptstraße 1',
  shop_location: null,
  price: '9.99',
  currency: 'EUR',
  price_type: 'fixed',
  price_note: null,
  shop_phone: null,
  is_available: true,
  sku: null,
  url: null,
  crawled_at: new Date().toISOString(),
  ...overrides,
})

const makeProduct = (overrides?: Partial<ProductListItem>): ProductListItem => ({
  id: 1,
  slug: 'royal-canin-adult-2kg',
  name: 'Royal Canin Adult 2kg',
  brand: 'Royal Canin',
  category_id: 10,
  thumbnail_url: null,
  images: null,
  best_offer: {
    price: '12.99',
    currency: 'EUR',
    price_type: 'fixed',
    price_note: null,
    shop_id: 42,
    shop_slug: 'mein-testshop',
    shop_name: 'Mein Testshop',
    dist_km: null,
    is_available: true,
    crawled_at: new Date().toISOString(),
    url: null,
    shop_location: null,
  },
  ...overrides,
})

// ── ShopCard ─────────────────────────────────────────────────────────────────

describe('ShopCard', () => {
  it('verlinkt auf /shops/<slug> statt /shops/<id>', () => {
    render(<ShopCard shop={makeShop()} lang="de" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/shops/mein-testshop')
    expect(link).not.toHaveAttribute('href', '/shops/42')
  })

  it('zeigt Shop-Name an', () => {
    render(<ShopCard shop={makeShop()} lang="de" />)
    expect(screen.getByText('Mein Testshop')).toBeInTheDocument()
  })

  it('zeigt Distanz wenn vorhanden', () => {
    render(<ShopCard shop={makeShop({ dist_km: 1.2 })} lang="de" />)
    expect(screen.getByText('1.2km')).toBeInTheDocument()
  })

  it('zeigt Distanz in Metern wenn < 1km', () => {
    render(<ShopCard shop={makeShop({ dist_km: 0.35 })} lang="de" />)
    expect(screen.getByText('350m')).toBeInTheDocument()
  })
})

// ── OfferList ─────────────────────────────────────────────────────────────────

describe('OfferList', () => {
  it('verlinkt auf /shops/<slug>', () => {
    render(<OfferList offers={[makeOffer()]} lang="de" />)
    const link = screen.getByRole('link', { name: 'Mein Testshop' })
    expect(link).toHaveAttribute('href', '/shops/mein-testshop')
    expect(link).not.toHaveAttribute('href', '/shops/42')
  })

  it('sortiert verfügbare Angebote zuerst', () => {
    const offers = [
      makeOffer({ shop_name: 'Teuer', price: '5.00', is_available: false }),
      makeOffer({ shop_slug: 'billig', shop_name: 'Billig', price: '3.00', is_available: true }),
    ]
    render(<OfferList offers={offers} lang="de" />)
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveTextContent('Billig')
  })
})

// ── ProductCard ───────────────────────────────────────────────────────────────

describe('ProductCard', () => {
  it('verlinkt Shop via shop_slug', () => {
    render(<ProductCard item={makeProduct()} lang="de" />)
    const shopLink = screen.getByRole('link', { name: 'Mein Testshop' })
    expect(shopLink).toHaveAttribute('href', '/shops/mein-testshop')
    expect(shopLink).not.toHaveAttribute('href', '/shops/42')
  })

  it('rendert Shop-Name als Text wenn shop_slug null ist', () => {
    const product = makeProduct()
    product.best_offer!.shop_slug = null
    render(<ProductCard item={product} lang="de" />)
    // Kein Link, nur Text
    expect(screen.queryByRole('link', { name: 'Mein Testshop' })).not.toBeInTheDocument()
    expect(screen.getByText('Mein Testshop')).toBeInTheDocument()
  })

  it('verlinkt Produkt via product slug', () => {
    render(<ProductCard item={makeProduct()} lang="de" />)
    const productLink = screen.getByRole('link', { name: 'Royal Canin Adult 2kg' })
    expect(productLink).toHaveAttribute('href', '/products/royal-canin-adult-2kg')
  })
})

// ── getShop API-Client ────────────────────────────────────────────────────────

describe('getShop API-Client', () => {
  it('ruft /shops/by-slug/<slug> auf, nicht /shops/<id>', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 42, slug: 'mein-testshop', name: 'Mein Testshop',
        address_raw: null, location: null, dist_km: null,
        phone: null, website: null, opening_hours: null,
        status: 'active', product_count: 0, last_scraped: null,
        top_products: [],
      }),
    })
    global.fetch = mockFetch

    const { getShop } = await import('@/lib/api')
    await getShop('mein-testshop', 'de')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/shops/by-slug/mein-testshop'),
      expect.any(Object),
    )
  })
})
