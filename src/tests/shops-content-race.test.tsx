/**
 * B2250-003: /shops sends a first request without coordinates and a second one once geolocation resolved.
 * A late answer of the FIRST request must not overwrite the answer of the second one.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import type { ShopListItem, ShopListResponse } from '@/types/api'
import { ShopsContent } from '@/app/(customer)/[lang]/shops/ShopsContent'

const mockGetShops = vi.fn()
vi.mock('@/lib/api', () => ({
  getShops: (...a: unknown[]) => mockGetShops(...a),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

function shop(id: number, name: string, dist_km: number | null): ShopListItem {
  return {
    id, slug: `shop-${id}`, name, address_raw: 'Main St 1', location: { lat: 34.9, lng: 33.6 }, dist_km,
    phone: null, whatsapp_number: null, whatsapp_url: null, website: null, opening_hours: null,
    status: 'active', product_count: 0, last_scraped: null,
  } as ShopListItem
}

interface Deferred { resolve: (v: ShopListResponse) => void; reject: (e: unknown) => void; signal?: AbortSignal; params: Record<string, unknown> }

describe('ShopsContent — only the latest request wins (B2250-003)', () => {
  let calls: Deferred[]
  let grantGeo: () => void

  beforeEach(() => {
    calls = []
    mockGetShops.mockReset()
    mockGetShops.mockImplementation((params: Record<string, unknown>, _lang: string, opts?: { signal?: AbortSignal }) =>
      new Promise<ShopListResponse>((resolve, reject) => {
        calls.push({ resolve, reject, signal: opts?.signal, params })
      }))
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: (p: { coords: { latitude: number; longitude: number } }) => void) => {
          grantGeo = () => success({ coords: { latitude: 34.9, longitude: 33.6 } })
        },
      },
    })
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('a delayed first answer (no coords) does not replace the second one (with coords)', async () => {
    await act(async () => { render(<ShopsContent lang="en" />) })
    expect(calls).toHaveLength(1)
    expect(calls[0].params.lat).toBeUndefined()

    await act(async () => { grantGeo() })
    expect(calls).toHaveLength(2)
    expect(calls[1].params.lat).toBe(34.9)

    // the second request answers first ...
    await act(async () => { calls[1].resolve({ items: [shop(2, 'Near Shop', 0.7)], total: 1 } as ShopListResponse) })
    expect(screen.getByText('Near Shop')).toBeInTheDocument()

    // ... then the stale first one arrives late
    await act(async () => { calls[0].resolve({ items: [shop(1, 'Far Unsorted Shop', null)], total: 1 } as ShopListResponse) })
    expect(screen.getByText('Near Shop')).toBeInTheDocument()
    expect(screen.queryByText('Far Unsorted Shop')).not.toBeInTheDocument()
  })

  it('the superseded request is aborted, the current one is not', async () => {
    await act(async () => { render(<ShopsContent lang="en" />) })
    await act(async () => { grantGeo() })
    expect(calls[0].signal?.aborted).toBe(true)
    expect(calls[1].signal?.aborted).toBe(false)
  })

  it('a late ERROR of the superseded request neither shows an error nor ends the loading state early', async () => {
    await act(async () => { render(<ShopsContent lang="en" />) })
    await act(async () => { grantGeo() })
    await act(async () => { calls[0].reject(new DOMException('aborted', 'AbortError')) })
    expect(screen.queryByText(/AbortError|aborted/i)).not.toBeInTheDocument()
    await act(async () => { calls[1].resolve({ items: [shop(2, 'Near Shop', 0.7)], total: 1 } as ShopListResponse) })
    expect(screen.getByText('Near Shop')).toBeInTheDocument()
  })
})
