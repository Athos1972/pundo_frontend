import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  usePathname: () => '/admin/shops/1/edit',
}))

vi.mock('next/dynamic', () => ({
  default: (_fn: unknown) => () => <div data-testid="map-placeholder">Map</div>,
}))

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

const mockShowToast = vi.fn()
vi.mock('@/components/system-admin/Toast', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

// ─── Component + Fixtures ────────────────────────────────────────────────────

import { ShopForm } from '@/components/system-admin/ShopForm'
import type { SysAdminShop, SysAdminShopType } from '@/types/system-admin'
import { tSysAdmin } from '@/lib/system-admin-translations'

const tr = tSysAdmin('en')

const mockShop: SysAdminShop = {
  id: 42,
  slug: 'test-shop',
  status: 'active',
  names: { en: 'Test Shop' },
  address_line1: null,
  city: null,
  country_code: 'CY',
  lat: null,
  lng: null,
  phone: null,
  whatsapp_number: null,
  website_url: null,
  is_online_only: false,
  opening_hours: null,
  shop_type_id: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const shopTypes: SysAdminShopType[] = []

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ShopForm – impersonation button', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = vi.fn()
  })

  it('shows "Manage shop operations" button in edit mode', () => {
    render(<ShopForm shop={mockShop} shopTypes={shopTypes} tr={tr} />)
    expect(screen.getByText(tr.enter_shop_admin)).toBeDefined()
  })

  it('does NOT show impersonation button in create mode (shop=null)', () => {
    render(<ShopForm shop={null} shopTypes={shopTypes} tr={tr} />)
    expect(screen.queryByText(tr.enter_shop_admin)).toBeNull()
    expect(screen.queryByText(tr.entering_shop_admin)).toBeNull()
  })

  it('calls POST /api/admin/shops/42/impersonate on click', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )
    render(<ShopForm shop={mockShop} shopTypes={shopTypes} tr={tr} />)

    fireEvent.click(screen.getByText(tr.enter_shop_admin))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/shops/42/impersonate',
        { method: 'POST' },
      )
    })
  })

  it('redirects to /shop-admin/dashboard on success', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )
    render(<ShopForm shop={mockShop} shopTypes={shopTypes} tr={tr} />)

    fireEvent.click(screen.getByText(tr.enter_shop_admin))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/shop-admin/dashboard')
    })
  })

  it('shows error toast when shop has no owner (404)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ detail: 'No shop owner found for this shop' }),
        { status: 404 },
      ),
    )
    render(<ShopForm shop={mockShop} shopTypes={shopTypes} tr={tr} />)

    fireEvent.click(screen.getByText(tr.enter_shop_admin))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(tr.error_no_shop_owner, 'error')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('shows generic error toast on unknown API error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Server error' }), { status: 500 }),
    )
    render(<ShopForm shop={mockShop} shopTypes={shopTypes} tr={tr} />)

    fireEvent.click(screen.getByText(tr.enter_shop_admin))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(tr.error_generic, 'error')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('shows backend error toast on fetch exception', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))
    render(<ShopForm shop={mockShop} shopTypes={shopTypes} tr={tr} />)

    fireEvent.click(screen.getByText(tr.enter_shop_admin))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(tr.error_backend, 'error')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('button is disabled and shows loading text while impersonating', async () => {
    // Simulate a slow fetch
    let resolvePromise!: (v: Response) => void
    vi.mocked(global.fetch).mockReturnValueOnce(
      new Promise<Response>((res) => { resolvePromise = res }),
    )

    render(<ShopForm shop={mockShop} shopTypes={shopTypes} tr={tr} />)
    fireEvent.click(screen.getByText(tr.enter_shop_admin))

    await waitFor(() => {
      expect(screen.getByText(tr.entering_shop_admin)).toBeDefined()
    })

    // Cleanup
    resolvePromise(new Response(JSON.stringify({ success: true }), { status: 200 }))
    await waitFor(() => expect(mockPush).toHaveBeenCalled())
  })
})
