import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

// ── Variants (shop hits in search) ────────────────────────────────────────────

const DEFAULT_LINK_CLASS = 'block bg-surface border border-border rounded-xl p-4 hover:border-accent transition-colors'

const richShop: ShopListItem = {
  ...baseShop,
  city: 'Larnaca',
  dist_km: 0.69,
  description: 'Fresh bread every morning.',
  is_open_now: true,
  is_charity_supporter: true,
  has_parking: true,
  spoken_languages: ['EL', 'EN'],
  review_stats: { average_stars: 4.5, total_count: 3 },
  shop_type: {
    id: 1, canonical: 'Bakery', google_types: [],
    translations: { de: 'Bäckerei', ru: null, el: null, ar: null, he: null },
  },
}

describe('ShopCard — default variant is unchanged (/shops look)', () => {
  it('keeps the exact link classes and renders no data-* attributes without testId', () => {
    const { container } = render(<ShopCard shop={richShop} lang="en" />)
    const link = container.querySelector('a')!
    expect(link.className).toBe(DEFAULT_LINK_CLASS)
    expect(link.getAttributeNames().filter(n => n.startsWith('data-'))).toEqual([])
    expect(link.getAttribute('href')).toBe('/en/shops/test-shop')
  })

  it('still renders description, rating row, attribute icons and language badges', () => {
    const { container } = render(<ShopCard shop={richShop} lang="en" />)
    expect(screen.getByText('Fresh bread every morning.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /3/ })).toBeInTheDocument() // ReviewsPopover trigger
    expect(screen.getByText('EL')).toBeInTheDocument()
    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
    expect(screen.getByText('5 Products')).toBeInTheDocument()
  })

  it('ignores the compact-only props (isHighlighted, hover handlers)', () => {
    const { container } = render(<ShopCard shop={richShop} lang="en" isHighlighted />)
    expect(container.querySelector('a')!.className).toBe(DEFAULT_LINK_CLASS)
  })

  it('testId adds the data attributes without touching the classes', () => {
    const { container } = render(<ShopCard shop={richShop} lang="en" testId="x" />)
    const link = container.querySelector('a')!
    expect(link.className).toBe(DEFAULT_LINK_CLASS)
    expect(link.getAttribute('data-testid')).toBe('x')
  })
})

describe('ShopCard — compact variant', () => {
  it('is a link to the localized shop page with name, distance, address and type', () => {
    render(<ShopCard shop={{ ...richShop, address_raw: 'Main St 1' }} lang="de" variant="compact" />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/de/shops/test-shop')
    expect(link).toHaveTextContent('Test Shop')
    expect(link).toHaveTextContent('690m')
    expect(link).toHaveTextContent('Main St 1')
    expect(link).toHaveTextContent('Bäckerei')
  })

  it('falls back to the city when there is no address', () => {
    render(<ShopCard shop={{ ...richShop, address_raw: null }} lang="en" variant="compact" />)
    expect(screen.getByRole('link')).toHaveTextContent('Larnaca')
  })

  it('has no description, no reviews popover trigger, no language badges, no attribute icons', () => {
    render(<ShopCard shop={richShop} lang="en" variant="compact" />)
    expect(screen.queryByText('Fresh bread every morning.')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText('EL')).toBeNull()
    expect(screen.queryByText('EN')).toBeNull()
  })

  it('shows open/closed and the charity badge like the default card', () => {
    const { rerender } = render(<ShopCard shop={richShop} lang="en" variant="compact" />)
    expect(screen.getByText('Open now')).toBeInTheDocument()
    expect(screen.getAllByText('Supports charity').length).toBeGreaterThan(0)
    rerender(<ShopCard shop={{ ...richShop, is_open_now: false, is_charity_supporter: false }} lang="en" variant="compact" />)
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('shows the product count only when it is above zero', () => {
    const { rerender } = render(<ShopCard shop={{ ...richShop, product_count: 12 }} lang="en" variant="compact" />)
    expect(screen.getByText('12 Products')).toBeInTheDocument()
    rerender(<ShopCard shop={{ ...richShop, product_count: 0 }} lang="en" variant="compact" />)
    expect(screen.queryByText(/Products/)).toBeNull()
  })

  it('testId sets data-testid, data-shop-slug and data-shop-id', () => {
    render(<ShopCard shop={richShop} lang="en" variant="compact" testId="search-shop-result" />)
    const link = screen.getByTestId('search-shop-result')
    expect(link.getAttribute('data-shop-slug')).toBe('test-shop')
    expect(link.getAttribute('data-shop-id')).toBe('1')
  })

  it('isHighlighted switches to the accent frame', () => {
    const { rerender } = render(<ShopCard shop={richShop} lang="en" variant="compact" />)
    expect(screen.getByRole('link').className).toContain('border-border hover:border-accent')
    rerender(<ShopCard shop={richShop} lang="en" variant="compact" isHighlighted />)
    const cls = screen.getByRole('link').className
    expect(cls).toContain('border-accent bg-accent/5 ring-1 ring-accent')
    expect(cls).not.toContain('hover:border-accent')
  })

  it('forwards hover handlers', () => {
    const enter = vi.fn()
    const leave = vi.fn()
    render(<ShopCard shop={richShop} lang="en" variant="compact" onMouseEnter={enter} onMouseLeave={leave} />)
    fireEvent.mouseEnter(screen.getByRole('link'))
    fireEvent.mouseLeave(screen.getByRole('link'))
    expect(enter).toHaveBeenCalledTimes(1)
    expect(leave).toHaveBeenCalledTimes(1)
  })

  it.each(['ar', 'he'])('renders in %s with the localized href and no hardcoded LTR direction', lang => {
    const { container } = render(<ShopCard shop={richShop} lang={lang} variant="compact" />)
    expect(screen.getByRole('link').getAttribute('href')).toBe(`/${lang}/shops/test-shop`)
    // layout flips with the document direction (dir=rtl on <html>): no forced dir/ltr classes on the card
    expect(container.querySelector('[dir="ltr"]')).toBeNull()
    expect(container.innerHTML).not.toContain('text-left')
    expect(container.innerHTML).not.toContain('flex-row-reverse')
  })
})
