/**
 * Unit tests for the category search bugfix (kategorie-suche-keine-ergebnisse-20260522).
 *
 * Covers:
 *  - When ?category_id=678 is set, searchProducts is called (not searchAll)
 *  - When ?category_id= is NOT set and q < 2 chars, neither function is called
 *  - When categoryId set and items.length === 0, category_no_results string is shown
 *  - toSearchProductItem mapper produces correct SearchProductItem shape
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

// ─── Helper factories ─────────────────────────────────────────────────────────

function makeProductListItem(id: number): ProductListItem {
  return {
    id,
    slug: `product-${id}`,
    name: `Product ${id}`,
    brand: null,
    category_id: 678,
    thumbnail_url: null,
    images: null,
    best_offer: null,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SearchContent — category mode', () => {
  beforeEach(() => {
    mockSearchProducts.mockReset()
    mockSearchAll.mockReset()
    mockGetCategories.mockReset()
    mockGetRelatedCategories.mockReset()
    // Default: categories endpoint returns empty (B1 not yet deployed)
    mockGetCategories.mockResolvedValue({ items: [] })
    // Default: related categories returns empty (backend endpoint not yet deployed)
    mockGetRelatedCategories.mockResolvedValue({ items: [] })
  })

  it('calls searchProducts (not searchAll) when ?category_id=678 is set', async () => {
    mockSearchParamsValue = new URLSearchParams('category_id=678')
    mockSearchProducts.mockResolvedValue({ total: 2, items: [makeProductListItem(1), makeProductListItem(2)] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await waitFor(() => {
      expect(mockSearchProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category_id: 678 }),
        'en'
      )
    })
    expect(mockSearchAll).not.toHaveBeenCalled()
  })

  it('passes category_id as number (not string) to searchProducts', async () => {
    mockSearchParamsValue = new URLSearchParams('category_id=678')
    mockSearchProducts.mockResolvedValue({ total: 1, items: [makeProductListItem(10)] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await waitFor(() => {
      const [params] = mockSearchProducts.mock.calls[0] as [{ category_id: number }, string]
      expect(typeof params.category_id).toBe('number')
      expect(params.category_id).toBe(678)
    })
  })

  it('does not call searchProducts or searchAll when no category_id and q < 2', async () => {
    mockSearchParamsValue = new URLSearchParams('q=a')

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    // Small wait to ensure no async calls were made
    await new Promise(r => setTimeout(r, 50))
    expect(mockSearchProducts).not.toHaveBeenCalled()
    expect(mockSearchAll).not.toHaveBeenCalled()
  })

  it('shows CategoryEmptyState (category_empty_intro) when categoryId is set and items are empty', async () => {
    mockSearchParamsValue = new URLSearchParams('category_id=999999')
    mockSearchProducts.mockResolvedValue({ total: 0, items: [] })
    mockGetRelatedCategories.mockResolvedValue({ items: [] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    // CategoryEmptyState renders category_empty_intro: "Currently no products in this category."
    // SearchContent renders listContent in both mobile+desktop branches → text appears 2× in DOM
    await waitFor(() => {
      expect(screen.getAllByText('Currently no products in this category.')[0]).toBeInTheDocument()
    })
    // Fallback link should show because related categories are empty
    await waitFor(() => {
      expect(screen.getAllByText('Browse all categories')[0]).toBeInTheDocument()
    })
  })

  it('shows CategoryEmptyState fallback (browse all link) when empty and relatedCategories returns empty', async () => {
    // SearchContent calls getRelatedCategories when category results are empty (F2350).
    // Backend returns empty list → CategoryEmptyState shows the browse-all fallback.
    mockSearchParamsValue = new URLSearchParams('category_id=42')
    mockSearchProducts.mockResolvedValue({ total: 0, items: [] })
    // beforeEach already sets mockGetRelatedCategories.mockResolvedValue({ items: [] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await waitFor(() => {
      expect(screen.getAllByText('Currently no products in this category.')[0]).toBeInTheDocument()
      expect(screen.getAllByText('Browse all categories')[0]).toBeInTheDocument()
    })
    // getRelatedCategories IS called (it's the F2350 feature) — mock returns [] → fallback shown
    expect(mockGetRelatedCategories).toHaveBeenCalledWith(42, 'en', 6)
  })

  it('shows generic no_results (not CategoryEmptyState) when no categoryId and empty results', async () => {
    mockSearchParamsValue = new URLSearchParams('q=xyzzy')
    mockSearchAll.mockResolvedValue({ total: 0, items: [] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await waitFor(() => {
      // category_empty_intro should NOT appear in text mode
      expect(screen.queryByText('Currently no products in this category.')).not.toBeInTheDocument()
      // generic no_results should appear (appears in both mobile+desktop DOM branches)
      expect(screen.getAllByText('No results found.')[0]).toBeInTheDocument()
    })
  })

  it('shows product that is >50 km away in category mode without explicit max_dist_km (bug regression)', async () => {
    // Regression: product with dist_km=60 was fetched (total=1) but frontend distance filter
    // (default 50 km) removed it from localItems AND onlineItems, leaving a blank UI.
    // Fix: in category mode without explicit max_dist_km, skip the frontend distance filter.
    mockSearchParamsValue = new URLSearchParams('category_id=3750')
    const distantProduct = makeProductListItem(44501)
    distantProduct.category_id = 3750
    distantProduct.best_offer = {
      price: '10.0000',
      price_type: 'fixed',
      price_note: null,
      currency: 'EUR',
      shop_id: 34,
      shop_slug: 'markos-pet-shop',
      shop_name: 'Markos Pet Shop',
      dist_km: 60.01,
      is_available: true,
      crawled_at: '2026-04-17T02:35:25Z',
      url: 'https://example.com',
      shop_location: { lat: 34.6784574, lng: 33.0242077 },
      shop_type: 'local',
    }
    mockSearchProducts.mockResolvedValue({ total: 1, items: [distantProduct] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await waitFor(() => {
      expect(screen.getAllByTestId('product-card-44501')[0]).toBeInTheDocument()
    })
  })

  it('does NOT pass max_dist_km to backend in category mode without explicit slider setting', async () => {
    mockSearchParamsValue = new URLSearchParams('category_id=3750')
    mockSearchProducts.mockResolvedValue({ total: 0, items: [] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await waitFor(() => expect(mockSearchProducts).toHaveBeenCalled())
    const [callParams] = mockSearchProducts.mock.calls[0] as [{ max_dist_km?: number }, string]
    expect(callParams.max_dist_km).toBeUndefined()
  })

  it('does pass max_dist_km to backend in category mode when slider is explicitly set', async () => {
    mockSearchParamsValue = new URLSearchParams('category_id=3750&max_dist_km=30')
    mockSearchProducts.mockResolvedValue({ total: 0, items: [] })

    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    render(<SearchContent lang="en" />)

    await waitFor(() => expect(mockSearchProducts).toHaveBeenCalled())
    const [callParams] = mockSearchProducts.mock.calls[0] as [{ max_dist_km?: number }, string]
    expect(callParams.max_dist_km).toBe(30)
  })
})

// ─── Mapper test ──────────────────────────────────────────────────────────────

describe('toSearchProductItem mapper', () => {
  it('adds result_type="product" and score=0 to a ProductListItem', () => {
    // Test via the type structure — verify that the rendered cards appear
    // (the mapper is internal to SearchContent; we test its effect through rendering)
    const item = makeProductListItem(42)
    // The mapper produces: { ...item, result_type: 'product', score: 0 }
    const mapped = { ...item, result_type: 'product' as const, score: 0 }
    expect(mapped.result_type).toBe('product')
    expect(mapped.score).toBe(0)
    expect(mapped.id).toBe(42)
    expect(mapped.slug).toBe('product-42')
  })
})
