import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('@/lib/translations', () => ({
  t: () => ({
    available: 'Available', last_checked: 'Last checked',
    price_on_request: 'Price on request', price_free: 'Free',
    price_variable: 'Variable price', filter_price_only: 'With price only',
    contact_shop: 'Contact shop',
  }),
}))

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    formatCrawledAt: () => 'yesterday',
    formatPriceOrLabel: (price: string | null, currency: string) =>
      ({ display: price ? `${price} ${currency}` : 'Price on request', isNumeric: !!price, note: null }),
  }
})

// F8950 T33: aus coverage-gaps.test.tsx. Bild-Quelle: images.card vor thumbnail_url, localhost-Origin wird entfernt.
describe('ProductCard image resolution', () => {
  const base = {
    id: 1, slug: 'cat-food', name: 'Cat Food', brand: null,
    category_id: null, thumbnail_url: null, images: null, best_offer: null,
  }

  it('renders without image when no thumbnail or images', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const { container } = render(<ProductCard item={base} lang="en" />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('uses images.card variant when available', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = { ...base, images: { thumb: null, card: '/img/cat_card.webp', carousel: null, detail: null, orig: null } }
    const { container } = render(<ProductCard item={item} lang="en" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/img/cat_card.webp')
  })

  it('uses thumbnail_url as fallback when images is null', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = { ...base, thumbnail_url: '/thumb/cat.png' }
    const { container } = render(<ProductCard item={item} lang="en" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/thumb/cat.png')
  })

  it('strips localhost origin from thumbnail_url fallback', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = { ...base, thumbnail_url: 'http://localhost:8001/media/cat.jpg' }
    const { container } = render(<ProductCard item={item} lang="en" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/media/cat.jpg')
  })

  it('renders offer price and shop name', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = {
      ...base,
      best_offer: {
        price: '4.99', currency: 'EUR', price_type: 'fixed', price_note: null,
        shop_name: 'Pet Store', shop_slug: 'pet-store', is_available: true,
        crawled_at: '2026-01-01T00:00:00Z',
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ProductCard item={item as any} lang="en" />)
    expect(screen.getByText(/4\.99/)).toBeInTheDocument()
    expect(screen.getByText('Pet Store')).toBeInTheDocument()
    // "In Stock" badge removed by design — not shown in carousel cards
    expect(screen.queryByText('Available')).not.toBeInTheDocument()
  })

  it('renders offer without shop slug as plain span', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = {
      ...base,
      best_offer: {
        price: '2.50', currency: 'EUR', price_type: 'fixed', price_note: null,
        shop_name: 'Generic Shop', shop_slug: null, is_available: false,
        crawled_at: '2026-01-01T00:00:00Z',
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ProductCard item={item as any} lang="en" />)
    expect(screen.getByText('Generic Shop')).toBeInTheDocument()
    // is_available=false → no Available badge
    expect(screen.queryByText('Available')).not.toBeInTheDocument()
  })

  it('renders brand when provided', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    render(<ProductCard item={{ ...base, brand: 'Royal Canin' }} lang="en" />)
    expect(screen.getByText('Royal Canin')).toBeInTheDocument()
  })

  it('renders horizontal variant with image on left', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = {
      ...base,
      name: 'Horizontal Item',
      images: { thumb: null, card: '/img/horiz.webp', carousel: null, detail: null, orig: null },
      best_offer: {
        price: '9.99', currency: 'EUR', price_type: 'fixed', price_note: null,
        shop_name: 'Horiz Shop', shop_slug: 'horiz-shop', is_available: true,
        crawled_at: '2026-01-01T00:00:00Z',
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(<ProductCard item={item as any} lang="en" variant="horizontal" />)
    expect(screen.getByText('Horizontal Item')).toBeInTheDocument()
    // Horizontal layout: image container has fixed 120x120 width class
    expect(container.querySelector('.w-\\[120px\\]')).toBeInTheDocument()
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/img/horiz.webp')
    expect(screen.getByText(/9\.99/)).toBeInTheDocument()
  })
})

// ─── ProductCard hover props (F4300 map-hover-glow) ──────────────────────────

describe('ProductCard hover props', () => {
  const base = {
    id: 2, slug: 'fish-food', name: 'Fish Food', brand: null,
    category_id: null, thumbnail_url: null, images: null,
    best_offer: {
      shop_id: 42, shop_name: 'Fish Shop', shop_slug: 'fish-shop',
      price: '5.00', currency: 'EUR', price_type: 'fixed', price_note: null,
      is_available: true, crawled_at: '2026-01-01T00:00:00Z',
      shop_location: { lat: 34.9, lng: 33.6 },
    },
  }

  it('isHighlighted=true adds ring and accent-bg classes to horizontal card', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ProductCard item={base as any} lang="en" variant="horizontal" isHighlighted shopId={42} />
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('ring-1')
    expect(root.className).toContain('ring-accent')
    expect(root.className).toContain('bg-accent/5')
  })

  it('isHighlighted=false/undefined keeps default border class', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ProductCard item={base as any} lang="en" variant="horizontal" shopId={42} />
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('border-border')
    expect(root.className).not.toContain('ring-accent')
  })

  it('onMouseEnterShop called with shopId on mouseEnter', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const onEnter = vi.fn()
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ProductCard item={base as any} lang="en" variant="horizontal" shopId={42} onMouseEnterShop={onEnter} />
    )
    fireEvent.mouseEnter(container.firstChild as HTMLElement)
    expect(onEnter).toHaveBeenCalledWith(42)
  })

  it('onMouseLeaveShop called on mouseLeave', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const onLeave = vi.fn()
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ProductCard item={base as any} lang="en" variant="horizontal" shopId={42} onMouseLeaveShop={onLeave} />
    )
    fireEvent.mouseLeave(container.firstChild as HTMLElement)
    expect(onLeave).toHaveBeenCalled()
  })

  it('no error when shopId is undefined (online-retailer case)', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const onEnter = vi.fn()
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ProductCard item={base as any} lang="en" variant="horizontal" onMouseEnterShop={onEnter} />
    )
    // No shopId → onEnter must NOT be called (edge case A2)
    fireEvent.mouseEnter(container.firstChild as HTMLElement)
    expect(onEnter).not.toHaveBeenCalled()
  })
})
