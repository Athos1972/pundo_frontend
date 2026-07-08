/**
 * B5900-007 — ShopLinkRow: the plain SSR <a href> used on /shops/city/[city]
 * to fix the orphan-shop-pages issue. Must always render a real Link with a
 * locale-prefixed href (per CLAUDE.md i18n-routing rule) — this is the core
 * regression this whole ticket protects against.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ShopListItem } from '@/types/api'

function makeShop(overrides: Partial<ShopListItem> = {}): ShopListItem {
  return {
    id: 1,
    slug: 'artemis-larnaca',
    name: 'Artemis',
    address_raw: 'Zinonos Kitieos 12, Larnaca',
    location: null,
    dist_km: null,
    phone: null,
    whatsapp_number: null,
    whatsapp_url: null,
    website: null,
    opening_hours: null,
    status: 'active',
    product_count: 0,
    last_scraped: null,
    ...overrides,
  }
}

describe('ShopLinkRow', () => {
  it('renders a locale-prefixed <a href> to the shop detail page', async () => {
    const { ShopLinkRow } = await import('@/components/shop/ShopLinkRow')
    render(<ShopLinkRow shop={makeShop()} lang="de" />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/de/shops/artemis-larnaca')
  })

  it('renders the shop name', async () => {
    const { ShopLinkRow } = await import('@/components/shop/ShopLinkRow')
    render(<ShopLinkRow shop={makeShop({ name: 'Artemis Bakery' })} lang="en" />)
    expect(screen.getByText('Artemis Bakery')).toBeInTheDocument()
  })

  it('falls back to slug when name is null/blank', async () => {
    const { ShopLinkRow } = await import('@/components/shop/ShopLinkRow')
    render(<ShopLinkRow shop={makeShop({ name: null })} lang="en" />)
    expect(screen.getByText('artemis-larnaca')).toBeInTheDocument()
  })

  it('renders address_raw when present', async () => {
    const { ShopLinkRow } = await import('@/components/shop/ShopLinkRow')
    render(<ShopLinkRow shop={makeShop({ address_raw: 'Main Street 1, Nicosia' })} lang="en" />)
    expect(screen.getByText('Main Street 1, Nicosia')).toBeInTheDocument()
  })

  it('does not render an address paragraph when address_raw is null', async () => {
    const { ShopLinkRow } = await import('@/components/shop/ShopLinkRow')
    render(<ShopLinkRow shop={makeShop({ address_raw: null })} lang="en" />)
    // Only the name paragraph should be present
    expect(screen.queryByText(/Street|Main/)).not.toBeInTheDocument()
  })
})
