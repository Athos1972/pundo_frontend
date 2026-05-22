/**
 * T7 — FavoritesTab: defensive guard for missing product_slug
 * T8 — AccountTabs: initialTab="favorites" activates favorites panel immediately
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// ── Next.js mocks ─────────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/account',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

// ── T7: FavoritesTab defensive guard ─────────────────────────────────────────
import { FavoritesTab } from '@/components/account/FavoritesTab'
import type { FavoriteListItem } from '@/types/api'

const makeFav = (overrides: Partial<FavoriteListItem> = {}): FavoriteListItem => ({
  id: 1, product_id: 10, product_slug: 'test-product', product_name: 'Test Produkt',
  brand: 'TestBrand', image_url: null, best_offer_price: '2.99', best_offer_currency: 'EUR',
  best_offer_shop: 'Testshop', best_offer_dist_km: null, alert_interval: 'täglich',
  ...overrides,
})

describe('T7 — FavoritesTab: defensive guard for missing product_slug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders <a> link when product_slug is present', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [makeFav({ id: 1, product_slug: 'valid-slug', product_name: 'Valid Product' })],
          total: 1, page: 1, limit: 20,
        }),
      })

    render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(screen.getByText('Valid Product')).toBeInTheDocument())

    // Should render as a link (anchor element) — not /products/undefined
    const link = screen.getByRole('link', { name: 'Valid Product' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href')
    expect(link.getAttribute('href')).not.toContain('undefined')
    expect(link.getAttribute('href')).toContain('valid-slug')
  })

  it('renders <span> (no <a> link) when product_slug is missing/empty', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [makeFav({ id: 2, product_slug: '', product_name: 'No Slug Product' })],
          total: 1, page: 1, limit: 20,
        }),
      })

    render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(screen.getByText('No Slug Product')).toBeInTheDocument())

    // Product name must not be wrapped in an <a href="...undefined..."> link
    const links = screen.queryAllByRole('link')
    const badLink = links.find(l => l.getAttribute('href')?.includes('undefined'))
    expect(badLink).toBeUndefined()

    // Product name should still be visible (as span)
    expect(screen.getByText('No Slug Product')).toBeInTheDocument()
  })

  it('does not produce /products/undefined href when product_slug is absent', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [makeFav({ id: 3, product_slug: '', product_name: 'Ghost Product' })],
          total: 1, page: 1, limit: 20,
        }),
      })

    const { container } = render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(screen.getByText('Ghost Product')).toBeInTheDocument())

    // No anchor should point to /products/undefined
    const allAnchors = container.querySelectorAll('a[href]')
    for (const anchor of allAnchors) {
      expect(anchor.getAttribute('href')).not.toContain('/products/undefined')
    }
  })
})

// ── T8: AccountTabs initialTab ────────────────────────────────────────────────
import { AccountTabs } from '@/components/account/AccountTabs'
import { SessionProvider } from '@/components/auth/SessionProvider'
import type { AuthUser, LinkedAccountsResponse } from '@/types/customer'

const mockUser: AuthUser = {
  id: 1,
  email: 'test@example.com',
  display_name: 'Test User',
  is_verified: true,
  provider: 'email',
  has_password: true,
  created_at: '2024-01-01T00:00:00Z',
}

const mockLinkedAccounts: LinkedAccountsResponse = {
  providers: [{ provider: 'google', linked: false, can_unlink: false }],
  has_password: true,
}

function renderAccountTabs(initialTab?: 'profile' | 'security' | 'reviews' | 'favorites' | 'trust' | 'danger') {
  // FavoritesTab makes fetch calls — mock them
  mockFetch
    .mockResolvedValue({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })

  return render(
    <SessionProvider initialSession={{ user: mockUser, is_authenticated: true }}>
      <AccountTabs
        initialUser={mockUser}
        linkedAccounts={mockLinkedAccounts}
        reviews={[]}
        trustProfile={null}
        lang="en"
        showMcpTab={false}
        initialTab={initialTab}
      />
    </SessionProvider>
  )
}

describe('T8 — AccountTabs: initialTab prop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [], total: 0, page: 1, limit: 20 }) })
  })

  it('defaults to profile tab when no initialTab given', () => {
    renderAccountTabs()
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /favorites/i })).toHaveAttribute('aria-selected', 'false')
  })

  it('activates favorites tab immediately when initialTab="favorites"', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [], total: 0, page: 1, limit: 20 }) })

    renderAccountTabs('favorites')

    // Favorites tab button should be aria-selected="true"
    const favTab = screen.getByRole('tab', { name: /favorites/i })
    expect(favTab).toHaveAttribute('aria-selected', 'true')

    // Profile tab should NOT be active
    const profileTab = screen.getByRole('tab', { name: /profile/i })
    expect(profileTab).toHaveAttribute('aria-selected', 'false')
  })

  it('favorites panel is visible (not hidden) when initialTab="favorites"', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [], total: 0, page: 1, limit: 20 }) })

    renderAccountTabs('favorites')

    // The tabpanel for favorites should not have hidden attribute
    const favPanel = document.getElementById('tabpanel-favorites')
    expect(favPanel).not.toBeNull()
    expect(favPanel).not.toHaveAttribute('hidden')

    // Profile panel should be hidden
    const profilePanel = document.getElementById('tabpanel-profile')
    expect(profilePanel).toHaveAttribute('hidden')
  })
})
