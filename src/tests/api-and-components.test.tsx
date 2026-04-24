import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className, onClick }: {
    href: string; children: React.ReactNode; className?: string; onClick?: () => void
  }) => <a href={href} className={className} onClick={onClick}>{children}</a>,
}))

// ─── api.ts — searchProducts query-string builder ─────────────────────────────

describe('searchProducts query-string building', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 })
    )
  })

  afterEach(() => { fetchSpy.mockRestore() })

  it('calls fetch with no query string when params are empty', async () => {
    const { searchProducts } = await import('@/lib/api')
    await searchProducts({}, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).not.toContain('?')
    expect(url).toContain('/products')
  })

  it('includes q param when provided', async () => {
    const { searchProducts } = await import('@/lib/api')
    await searchProducts({ q: 'cat food' }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('q=cat+food')
  })

  it('includes category_id, available, lat, lng, limit, offset', async () => {
    const { searchProducts } = await import('@/lib/api')
    await searchProducts({ category_id: 5, available: true, lat: 34.9, lng: 33.6, limit: 10, offset: 20 }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('category_id=5')
    expect(url).toContain('available=true')
    expect(url).toContain('lat=34.9')
    expect(url).toContain('lng=33.6')
    expect(url).toContain('limit=10')
    expect(url).toContain('offset=20')
  })

  it('includes shop_id when provided', async () => {
    const { searchProducts } = await import('@/lib/api')
    await searchProducts({ shop_id: 42 }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('shop_id=42')
  })

  it('sends Accept-Language header', async () => {
    const { searchProducts } = await import('@/lib/api')
    await searchProducts({}, 'de')
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['Accept-Language']).toBe('de')
  })

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }))
    const { searchProducts } = await import('@/lib/api')
    await expect(searchProducts({}, 'en')).rejects.toThrow('API 500')
  })
})

describe('getProduct', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Test', slug: 'test' }), { status: 200 })
    )
  })

  afterEach(() => { fetchSpy.mockRestore() })

  it('fetches by slug', async () => {
    const { getProduct } = await import('@/lib/api')
    await getProduct('cat-food', 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('/products/by-slug/cat-food')
  })
})

describe('getShops', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 })
    )
  })

  afterEach(() => { fetchSpy.mockRestore() })

  it('calls /shops with no params', async () => {
    const { getShops } = await import('@/lib/api')
    await getShops({}, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('/shops')
    expect(url).not.toContain('?')
  })

  it('includes lat, lng, limit, offset', async () => {
    const { getShops } = await import('@/lib/api')
    await getShops({ lat: 34.9, lng: 33.6, limit: 5, offset: 0, q: 'pet' }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('lat=34.9')
    expect(url).toContain('lng=33.6')
    expect(url).toContain('limit=5')
    expect(url).toContain('q=pet')
  })

  it('includes status param when provided', async () => {
    const { getShops } = await import('@/lib/api')
    await getShops({ status: 'active' }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('status=active')
  })

  it('omits status param when not provided', async () => {
    const { getShops } = await import('@/lib/api')
    await getShops({}, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).not.toContain('status')
  })
})

describe('getCategories', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 })
    )
  })

  afterEach(() => { fetchSpy.mockRestore() })

  it('calls /categories with no params', async () => {
    const { getCategories } = await import('@/lib/api')
    await getCategories({}, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('/categories')
  })

  it('includes parent_id, taxonomy_type, only_with_products', async () => {
    const { getCategories } = await import('@/lib/api')
    await getCategories({ parent_id: 2, taxonomy_type: 'pet', only_with_products: true, q: 'dog', limit: 50 }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('parent_id=2')
    expect(url).toContain('taxonomy_type=pet')
    expect(url).toContain('only_with_products=true')
    expect(url).toContain('q=dog')
    expect(url).toContain('limit=50')
  })
})

// ─── Toast ────────────────────────────────────────────────────────────────────

describe('ToastProvider', () => {
  it('renders nothing initially', async () => {
    const { ToastProvider } = await import('@/components/shop-admin/Toast')
    const { container } = render(<ToastProvider />)
    expect(container.firstChild).toBeNull()
  })

  it('shows a toast when showToast is called', async () => {
    const { ToastProvider, showToast } = await import('@/components/shop-admin/Toast')
    render(<ToastProvider />)
    act(() => { showToast('Hello world', 'success') })
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('uses info type by default', async () => {
    const { ToastProvider, showToast } = await import('@/components/shop-admin/Toast')
    render(<ToastProvider />)
    act(() => { showToast('Info message') })
    expect(screen.getByText('Info message')).toBeInTheDocument()
  })

  it('shows error toast with red background class', async () => {
    const { ToastProvider, showToast } = await import('@/components/shop-admin/Toast')
    render(<ToastProvider />)
    act(() => { showToast('Error occurred', 'error') })
    const toast = screen.getByText('Error occurred')
    expect(toast.className).toContain('bg-red-600')
  })
})

// ─── ProductList ──────────────────────────────────────────────────────────────

describe('ProductList', () => {
  const makeProduct = (id: number) => ({
    id,
    name: `Product ${id}`,
    category_id: 1,
    available: true,
    price_tiers: [{
      id: 1,
      unit: 'per_kg',
      steps: [{ id: 1, min_quantity: 1, price: '9.99', currency: 'EUR' }],
    }],
  })

  it('shows no_results when list is empty', async () => {
    const { ProductList } = await import('@/components/shop-admin/ProductList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    render(<ProductList initialItems={[]} lang="en" />)
    expect(screen.getByText(tAdmin('en').no_results)).toBeInTheDocument()
  })

  it('renders product name and price', async () => {
    const { ProductList } = await import('@/components/shop-admin/ProductList')
    render(<ProductList initialItems={[makeProduct(1)]} lang="en" />)
    expect(screen.getByText('Product 1')).toBeInTheDocument()
    expect(screen.getByText(/9\.99/)).toBeInTheDocument()
  })

  it('shows edit link for each product', async () => {
    const { ProductList } = await import('@/components/shop-admin/ProductList')
    render(<ProductList initialItems={[makeProduct(5)]} lang="en" />)
    const editLink = screen.getByRole('link', { name: /edit/i })
    expect(editLink.getAttribute('href')).toContain('/5/edit')
  })

  it('shows confirm buttons when delete is clicked', async () => {
    const { ProductList } = await import('@/components/shop-admin/ProductList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ProductList initialItems={[makeProduct(2)]} lang="en" />)
    const deleteBtn = screen.getByRole('button', { name: tr.delete })
    fireEvent.click(deleteBtn)
    // After click, confirm + cancel buttons appear
    const buttons = screen.getAllByRole('button')
    const labels = buttons.map((b) => b.textContent)
    expect(labels).toContain(tr.cancel)
  })

  it('removes product from list on successful delete', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 200 }))
    const { ProductList } = await import('@/components/shop-admin/ProductList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ProductList initialItems={[makeProduct(7)]} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: tr.delete }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: tr.delete }))
    })
    expect(screen.queryByText('Product 7')).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('shows unavailable label for unavailable product', async () => {
    const { ProductList } = await import('@/components/shop-admin/ProductList')
    const product = { ...makeProduct(3), available: false }
    render(<ProductList initialItems={[product]} lang="en" />)
    expect(screen.getByText('unavailable')).toBeInTheDocument()
  })
})

// ─── OfferList ────────────────────────────────────────────────────────────────

describe('OfferList (shop-admin)', () => {
  const makeOffer = (id: number, archived = false): import('@/types/shop-admin').AdminOffer => ({
    id,
    shop_listing_id: 100 + id,
    title: `Offer ${id}`,
    description: 'Test',
    price_type: 'fixed',
    price_tiers: [{ unit: 'piece', steps: [{ min_quantity: 1, price: '5.00', currency: 'EUR' }] }],
    currency: 'EUR',
    valid_from: '2026-01-01',
    valid_until: '2026-12-31',
    source: 'shop_manual',
    offer_url: null,
    archived,
    crawled_at: null,
    created_at: '2026-01-01T00:00:00Z',
  })

  it('shows active tab by default', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    render(<OfferList activeItems={[makeOffer(1)]} expiredItems={[]} lang="en" />)
    expect(screen.getByText('Offer 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: tAdmin('en').active })).toBeInTheDocument()
  })

  it('switches to expired tab', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<OfferList activeItems={[makeOffer(1)]} expiredItems={[makeOffer(2, true)]} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: tr.expired }))
    expect(screen.getByText('Offer 2')).toBeInTheDocument()
    expect(screen.queryByText('Offer 1')).not.toBeInTheDocument()
  })

  it('shows no_results on empty active tab', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    render(<OfferList activeItems={[]} expiredItems={[]} lang="en" />)
    expect(screen.getByText(tAdmin('en').no_results)).toBeInTheDocument()
  })

  it('shows archive confirm on active offer', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<OfferList activeItems={[makeOffer(3)]} expiredItems={[]} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: tr.archive }))
    expect(screen.getByRole('button', { name: tr.cancel })).toBeInTheDocument()
  })

  it('moves offer to expired after archive', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 200 }))
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<OfferList activeItems={[makeOffer(4)]} expiredItems={[]} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: tr.archive }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: tr.archive }))
    })
    expect(screen.queryByText('Offer 4')).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('does not show archive button on expired tab', async () => {
    const { OfferList } = await import('@/components/shop-admin/OfferList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<OfferList activeItems={[]} expiredItems={[makeOffer(5, true)]} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: tr.expired }))
    expect(screen.queryByRole('button', { name: tr.archive })).not.toBeInTheDocument()
  })
})

// ─── ApiKeyList ───────────────────────────────────────────────────────────────

describe('ApiKeyList', () => {
  const makeKey = (id: number): import('@/types/shop-admin').ApiKey => ({
    id,
    name: `Key ${id}`,
    scope: 'read',
    created_at: '2026-01-15T10:00:00Z',
  })

  it('shows no_results when empty and create form hidden', async () => {
    const { ApiKeyList } = await import('@/components/shop-admin/ApiKeyList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    render(<ApiKeyList initialKeys={[]} lang="en" />)
    expect(screen.getByText(tAdmin('en').no_results)).toBeInTheDocument()
  })

  it('renders key name and scope', async () => {
    const { ApiKeyList } = await import('@/components/shop-admin/ApiKeyList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    render(<ApiKeyList initialKeys={[makeKey(1)]} lang="en" />)
    expect(screen.getByText('Key 1')).toBeInTheDocument()
    expect(screen.getByText(/read/i)).toBeInTheDocument()
    expect(document.body.textContent).toContain(tAdmin('en').key_never)
  })

  it('shows create form when add key button clicked', async () => {
    const { ApiKeyList } = await import('@/components/shop-admin/ApiKeyList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ApiKeyList initialKeys={[]} lang="en" />)
    // Click the "+ Add Key" button
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr.add_key, 'i') }))
    expect(screen.getByRole('textbox', { name: tr.key_name })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: tr.key_scope })).toBeInTheDocument()
  })

  it('shows delete confirm buttons when delete clicked', async () => {
    const { ApiKeyList } = await import('@/components/shop-admin/ApiKeyList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ApiKeyList initialKeys={[makeKey(2)]} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: tr.delete }))
    expect(screen.getByRole('button', { name: tr.cancel })).toBeInTheDocument()
  })

  it('removes key from list on successful delete', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 200 }))
    const { ApiKeyList } = await import('@/components/shop-admin/ApiKeyList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ApiKeyList initialKeys={[makeKey(3)]} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: tr.delete }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: tr.delete }))
    })
    expect(screen.queryByText('Key 3')).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('shows read_write scope label correctly', async () => {
    const { ApiKeyList } = await import('@/components/shop-admin/ApiKeyList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    const rwKey = { ...makeKey(4), scope: 'read_write' as const }
    render(<ApiKeyList initialKeys={[rwKey]} lang="en" />)
    expect(screen.getByText(new RegExp(tr.scope_read_write, 'i'))).toBeInTheDocument()
  })

  it('shows one-time key display after successful creation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      id: 99, name: 'New Key', scope: 'read', created_at: '2026-01-01T00:00:00Z', key: 'sk_test_abc123',
    }), { status: 200 }))
    const { ApiKeyList } = await import('@/components/shop-admin/ApiKeyList')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('en')
    render(<ApiKeyList initialKeys={[]} lang="en" />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr.add_key, 'i') }))
    const nameInput = screen.getByRole('textbox', { name: tr.key_name })
    fireEvent.change(nameInput, { target: { value: 'New Key' } })
    await act(async () => {
      fireEvent.submit(nameInput.closest('form')!)
    })
    expect(screen.getByText('sk_test_abc123')).toBeInTheDocument()
    expect(screen.getByText(new RegExp(tr.key_once_warning, 'i'))).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
