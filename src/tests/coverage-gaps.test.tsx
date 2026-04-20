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

// ─── ProductCard: resolveImgSrc branches ─────────────────────────────────────

describe('ProductCard image resolution', () => {
  const base = {
    id: 1, slug: 'cat-food', names: { en: 'Cat Food' }, brand: null,
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
      names: { en: 'Horizontal Item' },
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

// ─── shop-admin-translations: all languages ──────────────────────────────────

describe('shop-admin-translations — all languages', () => {
  const langs = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

  for (const lang of langs) {
    it(`${lang}: upload_success/upload_errors interpolate n`, async () => {
      const { tAdmin } = await import('@/lib/shop-admin-translations')
      const tr = tAdmin(lang)
      expect(tr.upload_success.replace('{n}', '7')).toContain('7')
      expect(tr.upload_errors.replace('{n}', '3')).toContain('3')
    })

    it(`${lang}: days array has 7 entries`, async () => {
      const { tAdmin } = await import('@/lib/shop-admin-translations')
      expect(tAdmin(lang).days).toHaveLength(7)
    })

    it(`${lang}: login_btn is non-empty string`, async () => {
      const { tAdmin } = await import('@/lib/shop-admin-translations')
      expect(tAdmin(lang).login_btn.length).toBeGreaterThan(0)
    })
  }

  it('AR: login_btn is in Arabic script', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('ar').login_btn).toBe('تسجيل الدخول')
  })

  it('HE: login_btn is in Hebrew script', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('he').login_btn).toBe('כניסה')
  })

  it('EL: days[0] is Monday in Greek', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('el').days[0]).toBe('Δευτέρα')
  })

  it('RU: days[0] is Monday in Russian', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('ru').days[0]).toBe('Понедельник')
  })
})
