import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShopCard } from '@/components/shop/ShopCard'
import type { ShopListItem } from '@/types/api'

const baseShop: ShopListItem = {
  id: 1,
  slug: 'test-shop',
  name: 'Test Shop',
  address_raw: 'Nicosia, Cyprus',
  location: null,
  dist_km: null,
  phone: null,
  whatsapp_number: null,
  whatsapp_url: null,
  website: null,
  opening_hours: null,
  status: 'active',
  product_count: 5,
  last_scraped: null,
}

describe('ShopCard — description field', () => {
  it('renders description excerpt when shop.description is provided', () => {
    const shop: ShopListItem = {
      ...baseShop,
      description: 'Fresh fruits and vegetables from local farmers.',
    }
    render(<ShopCard shop={shop} lang="en" />)
    expect(screen.getByText('Fresh fruits and vegetables from local farmers.')).toBeInTheDocument()
  })

  it('applies line-clamp-2 class to description paragraph', () => {
    const shop: ShopListItem = {
      ...baseShop,
      description: 'A longer description that might wrap across multiple lines in the card.',
    }
    const { container } = render(<ShopCard shop={shop} lang="en" />)
    const descEl = container.querySelector('.line-clamp-2')
    expect(descEl).not.toBeNull()
    expect(descEl?.textContent).toContain('A longer description')
  })

  it('renders no description paragraph when shop.description is undefined', () => {
    const shop: ShopListItem = { ...baseShop }
    const { container } = render(<ShopCard shop={shop} lang="en" />)
    expect(container.querySelector('.line-clamp-2')).toBeNull()
  })

  it('renders no description paragraph when shop.description is null', () => {
    const shop: ShopListItem = { ...baseShop, description: null }
    const { container } = render(<ShopCard shop={shop} lang="en" />)
    expect(container.querySelector('.line-clamp-2')).toBeNull()
  })

  it('renders no description paragraph when shop.description is empty string', () => {
    const shop: ShopListItem = { ...baseShop, description: '' }
    const { container } = render(<ShopCard shop={shop} lang="en" />)
    expect(container.querySelector('.line-clamp-2')).toBeNull()
  })

  it('description appears between address row and shop-type row', () => {
    const shop: ShopListItem = {
      ...baseShop,
      description: 'Great local shop.',
      shop_type: {
        id: 1,
        canonical: 'grocery',
        google_types: [],
        translations: { de: 'Lebensmittel', ru: null, el: null, ar: null, he: null },
      },
    }
    const { container } = render(<ShopCard shop={shop} lang="de" />)
    const allParagraphs = Array.from(container.querySelectorAll('p'))
    const descIdx = allParagraphs.findIndex(p => p.classList.contains('line-clamp-2'))
    const addrIdx = allParagraphs.findIndex(p => p.textContent === 'Nicosia, Cyprus')
    expect(descIdx).toBeGreaterThan(addrIdx)
  })
})
