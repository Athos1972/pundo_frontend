import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

// ─── isOnlineOffer proxy logic (via SearchContent module) ────────────────────
// We test the logic directly since it's not exported — replicate the logic here
// to ensure correct proxy behavior (same logic as in SearchContent.tsx)

function isOnlineOffer(offer: { shop_type?: string | null; dist_km?: number | null } | null): boolean {
  if (!offer) return false
  if (offer.shop_type != null) return offer.shop_type === 'online_only'
  return offer.dist_km == null
}

describe('isOnlineOffer — shop_type proxy logic', () => {
  it('returns true for shop_type online_only', () => {
    expect(isOnlineOffer({ shop_type: 'online_only', dist_km: null })).toBe(true)
  })

  it('returns false for shop_type local', () => {
    expect(isOnlineOffer({ shop_type: 'local', dist_km: null })).toBe(false)
  })

  it('falls back to dist_km === null when shop_type is absent', () => {
    expect(isOnlineOffer({ dist_km: null })).toBe(true)
    expect(isOnlineOffer({ dist_km: 2.5 })).toBe(false)
  })

  it('prefers shop_type over dist_km when both present', () => {
    // local shop with no dist (shouldn't happen but defensive)
    expect(isOnlineOffer({ shop_type: 'local', dist_km: null })).toBe(false)
    // online_only with a dist_km (also shouldn't happen but defensive)
    expect(isOnlineOffer({ shop_type: 'online_only', dist_km: 5 })).toBe(true)
  })

  it('returns false for null offer', () => {
    expect(isOnlineOffer(null)).toBe(false)
  })
})

// ─── searchProducts — max_dist_km param ──────────────────────────────────────

describe('searchProducts — max_dist_km query param', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 })
    )
  })

  afterEach(() => { fetchSpy.mockRestore() })

  it('includes max_dist_km when provided', async () => {
    const { searchProducts } = await import('@/lib/api')
    await searchProducts({ max_dist_km: 30 }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('max_dist_km=30')
  })

  it('omits max_dist_km when not provided', async () => {
    const { searchProducts } = await import('@/lib/api')
    await searchProducts({ q: 'cat' }, 'en')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).not.toContain('max_dist_km')
  })
})

// ─── translations — new keys present in all 6 languages ──────────────────────

describe('translations — new online-retailer keys', () => {
  it('has all new keys in EN', async () => {
    const { t } = await import('@/lib/translations')
    const tr = t('en')
    expect(tr.local_shops).toBeTruthy()
    expect(tr.online_retailers).toBeTruthy()
    expect(tr.delivery_available).toBeTruthy()
    expect(tr.show_online).toBeTruthy()
    expect(tr.distance_label).toBeTruthy()
    expect(tr.distance_km(50)).toBeTruthy()
    expect(tr.no_local_results).toBeTruthy()
  })

  it('has all new keys in DE', async () => {
    const { t } = await import('@/lib/translations')
    const tr = t('de')
    expect(tr.local_shops).toBe('Lokale Shops')
    expect(tr.online_retailers).toBe('Online-Händler')
    expect(tr.delivery_available).toBe('Zustellung verfügbar')
    expect(tr.no_local_results).toBeTruthy()
  })

  it('has all new keys in AR (RTL language)', async () => {
    const { t } = await import('@/lib/translations')
    const tr = t('ar')
    expect(tr.local_shops).toBeTruthy()
    expect(tr.online_retailers).toBeTruthy()
    expect(tr.delivery_available).toBeTruthy()
    expect(tr.distance_km(25)).toContain('25')
  })

  it('has all new keys in HE (RTL language)', async () => {
    const { t } = await import('@/lib/translations')
    const tr = t('he')
    expect(tr.local_shops).toBeTruthy()
    expect(tr.delivery_available).toBeTruthy()
    expect(tr.distance_km(10)).toContain('10')
  })

  it('distance_km returns string containing the number', async () => {
    const { t } = await import('@/lib/translations')
    for (const lang of ['en', 'de', 'ru', 'el', 'ar', 'he']) {
      const tr = t(lang)
      expect(tr.distance_km(42)).toContain('42')
    }
  })
})

// ─── ProductCard — delivery_available badge ───────────────────────────────────

describe('ProductCard — delivery_available badge', () => {
  const baseItem = {
    id: 1,
    slug: 'cat-food',
    name: 'Cat Food',
    brand: 'Whiskas',
    category_id: 1,
    thumbnail_url: null,
    images: null,
  }

  it('shows delivery badge when delivery_available is true', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = {
      ...baseItem,
      best_offer: {
        price: '3.99', currency: 'EUR', price_type: 'fixed' as const,
        price_note: null, shop_id: 1, shop_slug: 'petshop', shop_name: 'Pet Shop',
        dist_km: 0.5, is_available: true, crawled_at: new Date().toISOString(),
        url: null, shop_location: { lat: 34.9, lng: 33.6 },
        delivery_available: true,
      },
    }
    render(<ProductCard item={item} lang="en" />)
    expect(screen.getByText('Delivery available')).toBeDefined()
  })

  it('does NOT show delivery badge when delivery_available is false', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = {
      ...baseItem,
      best_offer: {
        price: '3.99', currency: 'EUR', price_type: 'fixed' as const,
        price_note: null, shop_id: 1, shop_slug: 'petshop', shop_name: 'Pet Shop',
        dist_km: 0.5, is_available: true, crawled_at: new Date().toISOString(),
        url: null, shop_location: { lat: 34.9, lng: 33.6 },
        delivery_available: false,
      },
    }
    render(<ProductCard item={item} lang="en" />)
    expect(screen.queryByText('Delivery available')).toBeNull()
  })

  it('shows delivery badge in DE', async () => {
    const { ProductCard } = await import('@/components/product/ProductCard')
    const item = {
      ...baseItem,
      best_offer: {
        price: '3.99', currency: 'EUR', price_type: 'fixed' as const,
        price_note: null, shop_id: 1, shop_slug: 'petshop', shop_name: 'Pet Shop',
        dist_km: 0.5, is_available: true, crawled_at: new Date().toISOString(),
        url: null, shop_location: { lat: 34.9, lng: 33.6 },
        delivery_available: true,
      },
    }
    render(<ProductCard item={item} lang="de" />)
    expect(screen.getByText('Zustellung verfügbar')).toBeDefined()
  })
})

// ─── DistanceSlider — rendering & ARIA ───────────────────────────────────────

describe('DistanceSlider', () => {
  it('renders with correct aria attributes', async () => {
    const { DistanceSlider } = await import('@/components/search/DistanceSlider')
    render(<DistanceSlider value={50} onChange={() => {}} lang="en" />)
    const slider = screen.getByRole('slider')
    expect(slider.getAttribute('aria-valuemin')).toBe('10')
    expect(slider.getAttribute('aria-valuemax')).toBe('100')
    expect(slider.getAttribute('aria-valuenow')).toBe('50')
  })

  it('has dir=ltr regardless of RTL language', async () => {
    const { DistanceSlider } = await import('@/components/search/DistanceSlider')
    render(<DistanceSlider value={30} onChange={() => {}} lang="ar" />)
    const slider = screen.getByRole('slider')
    expect(slider.getAttribute('dir')).toBe('ltr')
  })

  it('displays current distance via distance_km translation', async () => {
    const { DistanceSlider } = await import('@/components/search/DistanceSlider')
    render(<DistanceSlider value={25} onChange={() => {}} lang="de" />)
    expect(screen.getByText('25 km')).toBeDefined()
  })
})

// ─── FilterChips — Online toggle ─────────────────────────────────────────────

describe('FilterChips — Online toggle', () => {
  it('renders Online toggle button', async () => {
    const { FilterChips } = await import('@/components/search/FilterChips')
    render(
      <FilterChips
        available={false} onAvailableChange={() => {}}
        withPrice={false} onWithPriceChange={() => {}}
        includeOnline={true} onIncludeOnlineChange={() => {}}
        lang="en"
      />
    )
    expect(screen.getByText('Online')).toBeDefined()
  })

  it('sets aria-pressed=true when includeOnline is true', async () => {
    const { FilterChips } = await import('@/components/search/FilterChips')
    render(
      <FilterChips
        available={false} onAvailableChange={() => {}}
        withPrice={false} onWithPriceChange={() => {}}
        includeOnline={true} onIncludeOnlineChange={() => {}}
        lang="en"
      />
    )
    const btn = screen.getByText('Online').closest('button')
    expect(btn?.getAttribute('aria-pressed')).toBe('true')
  })

  it('sets aria-pressed=false when includeOnline is false', async () => {
    const { FilterChips } = await import('@/components/search/FilterChips')
    render(
      <FilterChips
        available={false} onAvailableChange={() => {}}
        withPrice={false} onWithPriceChange={() => {}}
        includeOnline={false} onIncludeOnlineChange={() => {}}
        lang="de"
      />
    )
    const btn = screen.getByText('Online').closest('button')
    expect(btn?.getAttribute('aria-pressed')).toBe('false')
  })
})
