/**
 * Targeted coverage tests for gaps identified in Phase 2:
 * - ProductCard: resolveImgSrc branches (lines 12, 16-20, 39)
 * - HoursEditor: save handler + second slot (lines 24-37, 71-115)
 * - shop-admin-translations: DE upload_success/upload_errors (lines 186-187)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

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
  t: () => ({ available: 'Available', last_checked: 'Last checked' }),
}))

vi.mock('@/lib/utils', () => ({
  formatCrawledAt: () => 'yesterday',
  fmtPrice: (p: string) => p,
}))

// ─── ProductCard: resolveImgSrc branches ─────────────────────────────────────

describe('ProductCard image resolution', () => {
  const base = {
    id: 1, slug: 'cat-food', name: 'Cat Food', brand: null,
    thumbnail_url: null, images: [], best_offer: null,
  }

  it('renders without image when no thumbnail or images', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const { container } = render(<ProductCard item={base} lang="en" />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('uses images[0].url when available', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = { ...base, images: [{ url: '/img/cat.jpg' }] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(<ProductCard item={item as any} lang="en" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/img/cat.jpg')
  })

  it('uses thumbnail_url as fallback', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = { ...base, thumbnail_url: '/thumb/cat.png' }
    const { container } = render(<ProductCard item={item} lang="en" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/thumb/cat.png')
  })

  it('strips localhost origin from thumbnail_url', async () => {
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
        price: '4.99', currency: 'EUR', shop_name: 'Pet Store',
        shop_slug: 'pet-store', is_available: true,
        crawled_at: '2026-01-01T00:00:00Z',
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ProductCard item={item as any} lang="en" />)
    expect(screen.getByText(/4\.99/)).toBeInTheDocument()
    expect(screen.getByText('Pet Store')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('renders offer without shop slug as plain span', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = {
      ...base,
      best_offer: {
        price: '2.50', currency: 'EUR', shop_name: 'Generic Shop',
        shop_slug: null, is_available: false,
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
})

// ─── HoursEditor: save and second slot ───────────────────────────────────────

describe('HoursEditor save and second slot', () => {
  const makeHours = () => Array.from({ length: 7 }, (_, i) => ({
    day: i as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    open: '09:00',
    close: '18:00',
    closed: false,
  }))

  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )
  })

  afterEach(() => { fetchSpy.mockRestore() })

  it('calls PUT /api/shop-admin/shop/hours on save', async () => {
    const { HoursEditor } = await import('@/components/shop-admin/HoursEditor')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    render(<HoursEditor initialHours={makeHours()} lang="en" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: tAdmin('en').hours_save }))
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/shop-admin/shop/hours',
      expect.objectContaining({ method: 'PUT' })
    )
  })

  it('shows error toast when save fails', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }))
    const { HoursEditor } = await import('@/components/shop-admin/HoursEditor')
    const { ToastProvider } = await import('@/components/shop-admin/Toast')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    render(<><ToastProvider /><HoursEditor initialHours={makeHours()} lang="en" /></>)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: tAdmin('en').hours_save }))
    })
    expect(document.body.textContent).toContain(tAdmin('en').error_generic)
  })

  it('adds second slot when + Second slot clicked', async () => {
    const { HoursEditor } = await import('@/components/shop-admin/HoursEditor')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    render(<HoursEditor initialHours={makeHours()} lang="en" />)
    // Click the first "+ Second slot" button (for Monday)
    const addButtons = screen.getAllByRole('button', { name: new RegExp(tAdmin('en').second_slot, 'i') })
    fireEvent.click(addButtons[0])
    // Now there should be a "second open from" input
    expect(screen.getAllByLabelText(/second open from/i).length).toBeGreaterThan(0)
  })

  it('removes second slot when ✕ button clicked', async () => {
    const { HoursEditor } = await import('@/components/shop-admin/HoursEditor')
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    render(<HoursEditor initialHours={makeHours()} lang="en" />)
    // Add second slot first
    const addButtons = screen.getAllByRole('button', { name: new RegExp(tAdmin('en').second_slot, 'i') })
    fireEvent.click(addButtons[0])
    // Remove it
    const removeBtn = screen.getByRole('button', { name: 'Remove second slot' })
    fireEvent.click(removeBtn)
    // Second slot inputs gone
    expect(screen.queryAllByLabelText(/second open from/i)).toHaveLength(0)
  })

  it('updates open time when time input changes', async () => {
    const { HoursEditor } = await import('@/components/shop-admin/HoursEditor')
    render(<HoursEditor initialHours={makeHours()} lang="en" />)
    const openInputs = screen.getAllByLabelText(/open from$/i)
    fireEvent.change(openInputs[0], { target: { value: '08:00' } })
    expect((openInputs[0] as HTMLInputElement).value).toBe('08:00')
  })
})

// ─── shop-admin-translations: DE upload functions ────────────────────────────

describe('shop-admin-translations DE coverage', () => {
  it('DE upload_success returns interpolated string', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const tr = tAdmin('de')
    expect(tr.upload_success(10)).toContain('10')
    expect(tr.upload_errors(2)).toContain('2')
  })

  it('DE days array has 7 entries', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('de').days).toHaveLength(7)
  })
})
