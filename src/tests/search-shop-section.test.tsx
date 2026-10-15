/**
 * SearchContent — shop name hits section (feature "Shop-Treffer in der Suche").
 *
 * SearchContent renders its list twice (mobile sheet + desktop panel), so every card exists twice in
 * the DOM. The assertions scope to the desktop panel (`[aria-busy]`) unless they check both copies.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent, act } from '@testing-library/react'
import React from 'react'
import type { ShopListItem, SearchResultItem } from '@/types/api'

// ─── API mocks ────────────────────────────────────────────────────────────────
const mockSearchProducts = vi.fn()
const mockSearchAll = vi.fn()
const mockGetShops = vi.fn()
vi.mock('@/lib/api', () => ({
  searchProducts: (...a: unknown[]) => mockSearchProducts(...a),
  searchAll: (...a: unknown[]) => mockSearchAll(...a),
  getShops: (...a: unknown[]) => mockGetShops(...a),
  getCategories: vi.fn().mockResolvedValue({ items: [] }),
  getRelatedCategories: vi.fn().mockResolvedValue({ items: [] }),
}))

// ─── Next.js mocks ────────────────────────────────────────────────────────────
let mockParams = new URLSearchParams()
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockParams,
}))

interface MapProps {
  shops: { id: number; name: string; lat: number; lng: number }[]
  onPinClick?: (id: number) => void
}
vi.mock('next/dynamic', () => ({
  default: () => function FakeMap(props: MapProps) {
    return (
      <div data-testid="shop-map" data-shop-ids={props.shops.map(s => s.id).join(',')}>
        {props.shops.map(s => (
          <button key={s.id} data-testid={`pin-${s.id}`} onClick={() => props.onPinClick?.(s.id)}>pin</button>
        ))}
      </div>
    )
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className, ...rest }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className} {...rest}>{children}</a>,
}))

vi.mock('@/lib/useGeolocation', () => ({
  useGeolocation: () => ({ lat: 34.9, lng: 33.6 }),
}))
vi.mock('@/lib/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null }, isSupported: false }),
}))
vi.mock('@/components/search/SearchBar', () => ({
  SearchBar: ({ placeholder }: { placeholder: string }) => <input placeholder={placeholder} />,
}))
vi.mock('@/components/search/FilterChips', () => ({ FilterChips: () => <div /> }))
vi.mock('@/components/product/ProductCard', () => ({
  ProductCard: ({ item }: { item: { id: number } }) => <div data-testid="product-card">{`P${item.id}`}</div>,
}))
vi.mock('@/components/search/ServiceResultCard', () => ({
  ServiceResultCard: () => <div data-testid="service-result-card" />,
}))
vi.mock('@/components/contact/ContactCtaLink', () => ({
  ContactCtaLink: () => <div data-testid="contact-cta" />,
}))

// ─── Factories ────────────────────────────────────────────────────────────────
function shop(id: number, name = `Shop ${id}`, extra: Partial<ShopListItem> = {}): ShopListItem {
  return {
    id, slug: `shop-${id}`, name, address_raw: 'Main St 1', location: { lat: 34.9, lng: 33.6 }, dist_km: 1.5,
    phone: null, whatsapp_number: null, whatsapp_url: null, website: null, opening_hours: null,
    status: 'active', product_count: 0, last_scraped: null, ...extra,
  }
}
function localProduct(id: number): SearchResultItem {
  return {
    result_type: 'product', id, slug: `p-${id}`, name: `Product ${id}`, brand: null, category_id: 1,
    thumbnail_url: null, images: null, score: 1,
    best_offer: { shop_id: 500 + id, shop_name: 'Offer Shop', shop_location: { lat: 34.8, lng: 33.5 }, dist_km: 2, shop_type: 'local' },
  } as unknown as SearchResultItem
}
const serviceItem = { result_type: 'service', category_id: 9, name: 'Svc', score: 1 } as unknown as SearchResultItem

async function renderSearch(query: string, lang: 'en' | 'ar' = 'en') {
  mockParams = new URLSearchParams(query)
  const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
  return render(<SearchContent lang={lang} />)
}
const desktop = () => document.querySelector('[aria-busy]') as HTMLElement
const hits = () => within(desktop()).queryAllByTestId('search-shop-result')

beforeEach(() => {
  for (const m of [mockSearchProducts, mockSearchAll, mockGetShops, mockPush]) m.mockReset()
  mockSearchAll.mockResolvedValue({ items: [], total: 0 })
  mockGetShops.mockResolvedValue({ items: [], total: 0 })
})

describe('shop section — content', () => {
  it('AC1: shows the section with a compact card linking to /{lang}/shops/{slug}', async () => {
    mockGetShops.mockResolvedValue({ items: [shop(7, 'Happy Pets Nicosia')], total: 1 })
    await renderSearch('q=happy')
    await waitFor(() => expect(hits()).toHaveLength(1))
    const card = hits()[0]
    expect(card).toHaveTextContent('Happy Pets Nicosia')
    expect(card).toHaveAttribute('href', '/en/shops/shop-7')
    expect(card).toHaveAttribute('data-shop-slug', 'shop-7')
    expect(within(desktop()).getByTestId('search-shop-results')).toBeInTheDocument()
    expect(within(desktop()).getByRole('heading', { name: 'Shops' })).toBeInTheDocument()
    // both layout copies (mobile + desktop) carry the card
    expect(screen.getAllByTestId('search-shop-result')).toHaveLength(2)
  })

  it('AC3: shop section comes before services and products', async () => {
    mockGetShops.mockResolvedValue({ items: [shop(7)], total: 1 })
    mockSearchAll.mockResolvedValue({ items: [serviceItem, localProduct(1)], total: 2 })
    await renderSearch('q=happy')
    await waitFor(() => expect(hits()).toHaveLength(1))
    await waitFor(() => expect(within(desktop()).getAllByTestId('product-card')).toHaveLength(1))
    const section = within(desktop()).getByTestId('search-shop-results')
    const service = within(desktop()).getByTestId('service-result-card')
    const product = within(desktop()).getByTestId('product-card')
    expect(section.compareDocumentPosition(service) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(section.compareDocumentPosition(product) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('AC4: 4+ hits -> 3 cards and the "all shops" link to /shops?q=<encoded>', async () => {
    mockGetShops.mockResolvedValue({ items: [shop(1), shop(2), shop(3), shop(4)], total: 27 })
    await renderSearch(`q=${encodeURIComponent("pet & co")}`)
    await waitFor(() => expect(hits()).toHaveLength(3))
    const link = within(desktop()).getByTestId('search-shop-results-all')
    expect(link).toHaveAttribute('href', '/en/shops?q=pet%20%26%20co')
    expect(link).toHaveTextContent('All shops matching “pet & co”')
  })

  it('AC5: 1 to 3 hits -> no "all shops" link', async () => {
    mockGetShops.mockResolvedValue({ items: [shop(1), shop(2), shop(3)], total: 3 })
    await renderSearch('q=pet')
    await waitFor(() => expect(hits()).toHaveLength(3))
    expect(within(desktop()).queryByTestId('search-shop-results-all')).toBeNull()
  })

  it('AC7: only shop hits -> no "no results", no "no local results", no "Local Shops" heading', async () => {
    mockGetShops.mockResolvedValue({ items: [shop(1), shop(2)], total: 2 })
    await renderSearch('q=alphamega')
    await waitFor(() => expect(hits()).toHaveLength(2))
    expect(screen.queryByText('No results found.')).toBeNull()
    expect(screen.queryByText('No local shops in this radius.')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Local Shops' })).toBeNull()
    expect(screen.queryByTestId('contact-cta')).toBeNull()
  })

  it('without shop hits the product list keeps its headings (unchanged behaviour)', async () => {
    mockSearchAll.mockResolvedValue({ items: [localProduct(1)], total: 1 })
    await renderSearch('q=cat')
    await waitFor(() => expect(within(desktop()).getAllByTestId('product-card')).toHaveLength(1))
    expect(within(desktop()).getByRole('heading', { name: 'Local Shops' })).toBeInTheDocument()
    expect(within(desktop()).queryByTestId('search-shop-results')).toBeNull()
  })

  it('AC8: nothing found -> no shop section, the existing empty state is shown', async () => {
    await renderSearch('q=xyzqq')
    await waitFor(() => expect(within(desktop()).getByTestId('contact-cta')).toBeInTheDocument())
    expect(within(desktop()).getAllByText('No results found.').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('search-shop-results')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Shops' })).toBeNull()
  })

  it('AC11: getShops rejects -> products render, no section, no error text', async () => {
    mockGetShops.mockRejectedValue(new Error('500'))
    mockSearchAll.mockResolvedValue({ items: [localProduct(1)], total: 1 })
    await renderSearch('q=cat')
    await waitFor(() => expect(within(desktop()).getAllByTestId('product-card')).toHaveLength(1))
    expect(screen.queryByTestId('search-shop-results')).toBeNull()
    expect(screen.queryByText(/error|failed/i)).toBeNull()
  })
})

describe('shop section — requests', () => {
  it('AC9: category mode and shop mode never ask for shops', async () => {
    mockSearchProducts.mockResolvedValue({ items: [], total: 0 })
    const { unmount } = await renderSearch('category_id=5&q=pet')
    await waitFor(() => expect(mockSearchProducts).toHaveBeenCalled())
    unmount()
    await renderSearch('shop_id=12')
    await waitFor(() => expect(mockSearchProducts).toHaveBeenCalledTimes(2))
    expect(mockGetShops).not.toHaveBeenCalled()
    expect(screen.queryByTestId('search-shop-results')).toBeNull()
  })

  it('AC17: a 1-character query sends no request', async () => {
    await renderSearch('q=a')
    await new Promise(r => setTimeout(r, 40))
    expect(mockGetShops).not.toHaveBeenCalled()
    expect(mockSearchAll).not.toHaveBeenCalled()
  })

  it('R1 parameters: q, active, limit 4, coordinates and the radius of the page', async () => {
    await renderSearch('q=pet&max_dist_km=30')
    await waitFor(() => expect(mockGetShops).toHaveBeenCalled())
    expect(mockGetShops.mock.calls[0][0]).toEqual({
      q: 'pet', status: 'active', limit: 4, lat: 34.9, lng: 33.6, max_dist_km: 30,
    })
    expect(mockGetShops.mock.calls[0][1]).toBe('en')
  })

  it('AC18: include_online=0 -> is_online_only=false', async () => {
    await renderSearch('q=pet&include_online=0')
    await waitFor(() => expect(mockGetShops).toHaveBeenCalled())
    expect(mockGetShops.mock.calls[0][0]).toMatchObject({ is_online_only: false })
  })

  it('AC18: the default does not restrict online shops', async () => {
    await renderSearch('q=pet')
    await waitFor(() => expect(mockGetShops).toHaveBeenCalled())
    expect(mockGetShops.mock.calls[0][0]).not.toHaveProperty('is_online_only')
  })

  it('AC12: "load more" does not refetch or duplicate the shop hits', async () => {
    mockGetShops.mockResolvedValue({ items: [shop(1), shop(2)], total: 2 })
    mockSearchAll
      .mockResolvedValueOnce({ items: [localProduct(1)], total: 2 })
      .mockResolvedValueOnce({ items: [localProduct(2)], total: 2 })
    await renderSearch('q=pet')
    await waitFor(() => expect(hits()).toHaveLength(2))
    const more = await within(desktop()).findByRole('button', { name: /Load more/ })
    await act(async () => { fireEvent.click(more) })
    await waitFor(() => expect(mockSearchAll).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(within(desktop()).getAllByTestId('product-card')).toHaveLength(2))
    expect(mockGetShops).toHaveBeenCalledTimes(1)
    expect(hits()).toHaveLength(2)
  })

  it('race: an older, slower response does not overwrite the newer result', async () => {
    let resolveOld!: (v: unknown) => void
    mockGetShops
      .mockImplementationOnce(() => new Promise(r => { resolveOld = r }))
      .mockResolvedValue({ items: [shop(2, 'Newer Shop')], total: 1 })
    mockSearchAll.mockResolvedValue({ items: [], total: 0 })
    const SearchContent = (await import('@/app/(customer)/[lang]/search/SearchContent')).default
    mockParams = new URLSearchParams('q=old')
    const view = render(<SearchContent lang="en" />)
    await waitFor(() => expect(mockGetShops).toHaveBeenCalledTimes(1))
    mockParams = new URLSearchParams('q=new')
    view.rerender(<SearchContent lang="en" />)
    await waitFor(() => expect(hits()).toHaveLength(1))
    await act(async () => { resolveOld({ items: [shop(1, 'Older Shop')], total: 1 }) })
    expect(hits()).toHaveLength(1)
    expect(hits()[0]).toHaveTextContent('Newer Shop')
  })
})

describe('shop section — outside the radius', () => {
  beforeEach(() => {
    // R1 (inside) empty, R2 (outside) has hits
    mockGetShops.mockImplementation((p: { max_dist_km?: number }) =>
      Promise.resolve(p.max_dist_km != null
        ? { items: [], total: 0 }
        : { items: [shop(1, 'Far A', { dist_km: 57.2 }), shop(2, 'Far B', { dist_km: 64 })], total: 2 }))
  })

  it('shows the hint instead of cards and suppresses the empty state', async () => {
    await renderSearch('q=happy')
    const hint = await within(desktop()).findByTestId('search-shop-outside-hint')
    expect(hint).toHaveTextContent('2 shops outside your radius')
    expect(hits()).toHaveLength(0)
    expect(screen.queryByText('No results found.')).toBeNull()
    expect(screen.queryByTestId('contact-cta')).toBeNull()
  })

  it('"Expand radius" sets max_dist_km to the nearest hit rounded up to the slider step', async () => {
    await renderSearch('q=happy')
    const btn = await within(desktop()).findByTestId('search-shop-expand-radius')
    expect(btn).toHaveTextContent('Expand radius')
    fireEvent.click(btn)
    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('/en/search?')
    expect(new URL(url, 'http://x').searchParams.get('max_dist_km')).toBe('60')
    expect(new URL(url, 'http://x').searchParams.get('q')).toBe('happy')
  })

  it('no distance known -> link to /shops instead of the button', async () => {
    mockGetShops.mockImplementation((p: { max_dist_km?: number }) =>
      Promise.resolve(p.max_dist_km != null ? { items: [], total: 0 } : { items: [shop(1, 'No Geo', { dist_km: null })], total: 1 }))
    await renderSearch('q=happy')
    const link = await within(desktop()).findByTestId('search-shop-results-all')
    expect(link).toHaveAttribute('href', '/en/shops?q=happy')
    expect(within(desktop()).queryByTestId('search-shop-expand-radius')).toBeNull()
  })

  it('slider already at the maximum -> link instead of the button', async () => {
    await renderSearch('q=happy&max_dist_km=100')
    const link = await within(desktop()).findByTestId('search-shop-results-all')
    expect(link).toHaveAttribute('href', '/en/shops?q=happy')
    expect(within(desktop()).queryByTestId('search-shop-expand-radius')).toBeNull()
  })

  it('expanding to the default radius removes the parameter instead of writing max_dist_km=50', async () => {
    mockGetShops.mockImplementation((p: { max_dist_km?: number }) =>
      Promise.resolve(p.max_dist_km != null ? { items: [], total: 0 } : { items: [shop(1, 'Edge', { dist_km: 46 })], total: 1 }))
    await renderSearch('q=happy&max_dist_km=30')
    fireEvent.click(await within(desktop()).findByTestId('search-shop-expand-radius'))
    expect(new URL(mockPush.mock.calls[0][0] as string, 'http://x').searchParams.has('max_dist_km')).toBe(false)
  })

  it('hint is not shown when the radius has hits', async () => {
    mockGetShops.mockResolvedValue({ items: [shop(1)], total: 1 })
    await renderSearch('q=happy')
    await waitFor(() => expect(hits()).toHaveLength(1))
    expect(screen.queryByTestId('search-shop-outside-hint')).toBeNull()
  })
})

describe('shop section — live region, map, RTL', () => {
  const status = () => within(desktop()).getByRole('status')

  it('live region counts products plus shown shop hits', async () => {
    mockGetShops.mockResolvedValue({ items: [shop(1), shop(2)], total: 2 })
    mockSearchAll.mockResolvedValue({ items: [localProduct(1)], total: 5 })
    await renderSearch('q=pet')
    await waitFor(() => expect(status()).toHaveTextContent('7 results'))
  })

  it('live region never says "0 results" for shop-only hits', async () => {
    mockGetShops.mockResolvedValue({ items: [shop(1)], total: 1 })
    await renderSearch('q=pet')
    await waitFor(() => expect(status()).toHaveTextContent('1 result'))
    expect(status()).not.toHaveTextContent('No results')
  })

  it('live region announces the outside-radius hint when that is all there is', async () => {
    mockGetShops.mockImplementation((p: { max_dist_km?: number }) =>
      Promise.resolve(p.max_dist_km != null ? { items: [], total: 0 } : { items: [shop(1, 'Far', { dist_km: 80 })], total: 1 }))
    await renderSearch('q=pet')
    await waitFor(() => expect(status()).toHaveTextContent('1 shop outside your radius'))
  })

  it('AC13: shop hits with a location become map pins, merged with offer shops without duplicates', async () => {
    mockGetShops.mockResolvedValue({
      items: [shop(7), shop(8, 'No Loc', { location: null }), shop(501)], total: 3,
    })
    mockSearchAll.mockResolvedValue({ items: [localProduct(1)], total: 1 }) // offer shop id 501
    await renderSearch('q=pet')
    await waitFor(() => expect(screen.getAllByTestId('shop-map')[0].dataset.shopIds).toBe('7,501'))
  })

  describe('pin tap scrolls the card in the VISIBLE layout', () => {
    let scrolled: Element[]
    beforeEach(() => {
      scrolled = []
      Element.prototype.scrollIntoView = vi.fn(function (this: Element) { scrolled.push(this) })
    })
    afterEach(() => { vi.unstubAllGlobals() })

    async function tapPin(matchesDesktop: boolean, pinId = 7) {
      vi.stubGlobal('matchMedia', (q: string) => ({ matches: matchesDesktop, media: q, addEventListener() {}, removeEventListener() {} }))
      mockGetShops.mockResolvedValue({ items: [shop(7)], total: 1 })
      await renderSearch('q=pet')
      await waitFor(() => expect(hits()).toHaveLength(1))
      vi.useFakeTimers()
      fireEvent.click(screen.getAllByTestId(`pin-${pinId}`)[0])
      await act(async () => { vi.advanceTimersByTime(300) })
      vi.useRealTimers()
    }

    it('desktop: the card inside the desktop panel', async () => {
      await tapPin(true)
      expect(scrolled).toHaveLength(1)
      expect(desktop().contains(scrolled[0])).toBe(true)
      expect(scrolled[0]).toHaveAttribute('data-shop-id', '7')
    })

    it('mobile: the card inside the bottom sheet, not the hidden desktop copy', async () => {
      await tapPin(false)
      expect(scrolled).toHaveLength(1)
      expect(desktop().contains(scrolled[0])).toBe(false)
      expect(scrolled[0]).toHaveAttribute('data-shop-id', '7')
    })

    // B2250-002: product cards were looked up via a ref map whose last write was the hidden desktop copy
    describe('product cards (B2250-002)', () => {
      async function tapProductPin(matchesDesktop: boolean) {
        mockSearchAll.mockResolvedValue({ items: [localProduct(1), localProduct(2)], total: 2 }) // offer shops 501, 502
        vi.stubGlobal('matchMedia', (q: string) => ({ matches: matchesDesktop, media: q, addEventListener() {}, removeEventListener() {} }))
        await renderSearch('q=pet')
        await waitFor(() => expect(within(desktop()).getAllByTestId('product-card')).toHaveLength(2))
        vi.useFakeTimers()
        fireEvent.click(screen.getAllByTestId('pin-502')[0])
        await act(async () => { vi.advanceTimersByTime(300) })
        vi.useRealTimers()
      }

      it('mobile: scrolls the product card inside the bottom sheet, not the display:none desktop copy', async () => {
        await tapProductPin(false)
        expect(scrolled).toHaveLength(1)
        expect(desktop().contains(scrolled[0])).toBe(false)
        expect(scrolled[0]).toHaveAttribute('data-testid', 'search-local-result')
        expect(scrolled[0]).toHaveAttribute('data-shop-id', '502')
        expect(scrolled[0]).toHaveTextContent('P2')
      })

      it('desktop: scrolls the product card inside the desktop panel', async () => {
        await tapProductPin(true)
        expect(scrolled).toHaveLength(1)
        expect(desktop().contains(scrolled[0])).toBe(true)
        expect(scrolled[0]).toHaveAttribute('data-shop-id', '502')
      })
    })

    it('highlights the tapped card with the accent frame', async () => {
      vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} }))
      mockGetShops.mockResolvedValue({ items: [shop(7)], total: 1 })
      await renderSearch('q=pet')
      await waitFor(() => expect(hits()).toHaveLength(1))
      expect(hits()[0].className).not.toContain('ring-accent')
      await act(async () => { fireEvent.click(screen.getAllByTestId('pin-7')[0]) })
      expect(hits()[0].className).toContain('ring-accent')
    })
  })

  it('AC15: RTL — heading follows the reading direction, arrow is mirrored, texts come from the Arabic table', async () => {
    mockGetShops.mockResolvedValue({ items: [shop(1), shop(2), shop(3), shop(4)], total: 9 })
    await renderSearch('q=pet', 'ar')
    await waitFor(() => expect(hits()).toHaveLength(3))
    const heading = within(desktop()).getByRole('heading', { name: 'المتاجر' })
    // B2250-001: text-align:end is the LEFT edge under dir=rtl. No alignment override -> inherits start (= right).
    // (jsdom has no Tailwind CSS, so the computed position is checked by the Playwright test; here the class contract.)
    expect(heading.className).not.toMatch(/text-(end|left|right|center)/)
    const link = within(desktop()).getByTestId('search-shop-results-all')
    expect(link).toHaveTextContent('كل المتاجر المطابقة لـ «pet»')
    expect(link.querySelector('svg')?.getAttribute('class')).toContain('rtl:rotate-180')
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(hits()[0]).toHaveAttribute('href', '/ar/shops/shop-1')
  })
})
