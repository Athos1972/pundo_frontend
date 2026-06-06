/**
 * Regression tests for B5900-004 — shop_id mode in SearchContent.
 *
 * Covers:
 *  - When ?shop_id=75 is set (no q, no category_id), searchProducts IS called with shop_id
 *  - shop_id is passed as number (not string) to searchProducts
 *  - searchAll is NOT called in shop mode
 *  - Without category_id, shop_id, or sufficient q, neither function is called (guard unchanged)
 *  - When shop_id is set together with a query, both are passed to searchProducts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import type { ProductListItem } from '@/types/api'

// ─── API mocks ────────────────────────────────────────────────────────────────

const mockSearchProducts = vi.fn()
const mockSearchAll = vi.fn()
const mockGetCategories = vi.fn()
const mockGetRelatedCategories = vi.fn()

vi.mock('@/lib/api', () => ({
  searchProducts: (...args: unknown[]) => mockSearchProducts(...args),
  searchAll: (...args: unknown[]) => mockSearchAll(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
  getRelatedCategories: (...args: unknown[]) => mockGetRelatedCategories(...args),
}))

// ─── Next.js mocks ────────────────────────────────────────────────────────────

let mockSearchParamsValue = new URLSearchParams()

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParamsValue,
}))

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="shop-map-placeholder" />,
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

// ─── Internal lib mocks ───────────────────────────────────────────────────────

vi.mock('@/lib/useGeolocation', () => ({
  useGeolocation: () => ({ lat: undefined, lng: undefined }),
}))

vi.mock('@/lib/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null }, isSupported: false }),
}))

vi.mock('@/components/search/SearchBar', () => ({
  SearchBar: ({ placeholder }: { placeholder: string }) => <input placeholder={placeholder} />,
}))

vi.mock('@/components/search/FilterChips', () => ({
  FilterChips: () => <div data-testid="filter-chips" />,
}))

vi.mock('@/components/search/DistanceSlider', () => ({
  DistanceSlider: () => <div data-testid="distance-slider" />,
}))

vi.mock('@/components/product/ProductCard', () => ({
  ProductCard: ({ item }: { item: { id: number } }) => <div data-testid={`product-card-${item.id}`} />,
}))

vi.mock('@/components/search/ServiceResultCard', () => ({
  ServiceResultCard: () => <div data-testid="service-result-card" />,
}))

vi.mock('@/lib/routing', () => ({
  localePath: (_lang: string, path: string) => `/en${path}`,
}))

vi.mock('@/lib/meta-pixel', () => ({
  trackPixelEvent: vi.fn(),
  PixelEvents: { Search: 'Search' },
}))

vi.mock('@/components/contact/ContactCtaLink', () => ({
  ContactCtaLink: () => <div data-testid="contact-cta" />,
}))

vi.mock('@/components/search/CategoryEmptyState', () => ({
  CategoryEmptyState: () => <div data-testid="category-empty-state" />,
}))

vi.mock('@/components/map/SearchMapBottomSheet', () => ({
  SearchMapBottomSheet: ({ children }: { children: React.ReactNode }) => <div data-testid="bottom-sheet">{children}</div>,
}))

// ─── Helper factories ─────────────────────────────────────────────────────────

function makeProductListItem(id: number): ProductListItem {
  return {
    id,
    slug: `product-${id}`,
    name: `Product ${id}`,
    brand: null,
    category_id: 10,
    thumbnail_url: null,
    images: null,
    best_offer: null,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SearchContent — shop_id mode (B5900-004)', () => {
  beforeEach(() => {
    mockSearchProducts.mockReset()
    mockSearchAll.mockReset()
    mockGetCategories.mockReset()
    mockGetRelatedCategories.mockReset()
    mockGetCategories.mockResolvedValue({ items: [] })
    mockGetRelatedCategories.mockResolvedValue({ items: [] })
  })

  it('calls searchProducts (not searchAll) when ?shop_id=75 is set without q', async () => {
    // BUG REGRESSION: before fix, guard `!categoryId && q.length < 2` returned early
    // and neither function was called → empty results shown.
    mockSearchParamsValue = new URLSearchParams('shop_id=75')
    mockSearchProducts.mockResolvedValue({ total: 3, items: [makeProductListItem(1), makeProductListItem(2), makeProductListItem(3)] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await waitFor(() => {
      expect(mockSearchProducts).toHaveBeenCalledWith(
        expect.objectContaining({ shop_id: 75 }),
        'en'
      )
    })
    expect(mockSearchAll).not.toHaveBeenCalled()
  })

  it('passes shop_id as number (not string) to searchProducts', async () => {
    mockSearchParamsValue = new URLSearchParams('shop_id=75')
    mockSearchProducts.mockResolvedValue({ total: 1, items: [makeProductListItem(10)] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await waitFor(() => {
      const [params] = mockSearchProducts.mock.calls[0] as [{ shop_id: number }, string]
      expect(typeof params.shop_id).toBe('number')
      expect(params.shop_id).toBe(75)
    })
  })

  it('does not pass category_id when only shop_id is set', async () => {
    mockSearchParamsValue = new URLSearchParams('shop_id=75')
    mockSearchProducts.mockResolvedValue({ total: 1, items: [makeProductListItem(1)] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await waitFor(() => {
      const [params] = mockSearchProducts.mock.calls[0] as [Record<string, unknown>, string]
      expect(params.category_id).toBeUndefined()
      expect(params.shop_id).toBe(75)
    })
  })

  it('passes both shop_id and q when both are in URL', async () => {
    mockSearchParamsValue = new URLSearchParams('shop_id=75&q=Katze')
    mockSearchProducts.mockResolvedValue({ total: 1, items: [makeProductListItem(5)] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await waitFor(() => {
      expect(mockSearchProducts).toHaveBeenCalledWith(
        expect.objectContaining({ shop_id: 75, q: 'Katze' }),
        'en'
      )
    })
  })

  it('still blocks search when no shop_id, no category_id, and q < 2 chars', async () => {
    // Guard must still protect against empty/trivial searches
    mockSearchParamsValue = new URLSearchParams('q=x')

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await new Promise(r => setTimeout(r, 50))
    expect(mockSearchProducts).not.toHaveBeenCalled()
    expect(mockSearchAll).not.toHaveBeenCalled()
  })

  it('still blocks search when URL has no params at all', async () => {
    mockSearchParamsValue = new URLSearchParams('')

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await new Promise(r => setTimeout(r, 50))
    expect(mockSearchProducts).not.toHaveBeenCalled()
    expect(mockSearchAll).not.toHaveBeenCalled()
  })
})
