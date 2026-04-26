/**
 * Unit tests for ShopsContent search field + debounce logic (B2250-001).
 *
 * Tests the search input rendering and debounce behaviour introduced
 * to fix the missing shop-search bar on mobile.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ShopsContent } from '@/app/(customer)/shops/ShopsContent'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  getShops: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ShopsContent — search field', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Suppress geolocation
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success: unknown, error: (e: GeolocationPositionError) => void) => {
          error({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
        },
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders a search input with correct placeholder (DE)', async () => {
    await act(async () => {
      render(<ShopsContent lang="de" />)
    })
    const input = screen.getByRole('searchbox')
    expect(input).toBeDefined()
    expect(input.getAttribute('placeholder')).toBe('Shops suchen...')
  })

  it('renders a search input with correct placeholder (EN)', async () => {
    await act(async () => {
      render(<ShopsContent lang="en" />)
    })
    const input = screen.getByRole('searchbox')
    expect(input.getAttribute('placeholder')).toBe('Search shops...')
  })

  it('search input has correct aria-label', async () => {
    await act(async () => {
      render(<ShopsContent lang="de" />)
    })
    const input = screen.getByRole('searchbox')
    expect(input.getAttribute('aria-label')).toBe('Suchen')
  })

  it('updates input value on change', async () => {
    await act(async () => {
      render(<ShopsContent lang="de" />)
    })
    const input = screen.getByRole('searchbox') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Apotheke' } })
    })
    expect(input.value).toBe('Apotheke')
  })

  it('debounces API call — does not fire before 300ms', async () => {
    const { getShops } = await import('@/lib/api')
    const mockGetShops = vi.mocked(getShops)
    const callCountBefore = mockGetShops.mock.calls.length

    await act(async () => {
      render(<ShopsContent lang="de" />)
    })

    const input = screen.getByRole('searchbox') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Bio' } })
      // Advance only 200ms — debounce has not fired
      vi.advanceTimersByTime(200)
    })

    // No extra call should have been made with q='Bio' yet
    const qCalls = mockGetShops.mock.calls.filter(args => args[0]?.q === 'Bio')
    expect(qCalls).toHaveLength(0)
  })

  it('debounces API call — fires after 300ms', async () => {
    const { getShops } = await import('@/lib/api')
    const mockGetShops = vi.mocked(getShops)

    await act(async () => {
      render(<ShopsContent lang="de" />)
    })

    const input = screen.getByRole('searchbox') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Bio' } })
      vi.advanceTimersByTime(350)
    })

    const qCalls = mockGetShops.mock.calls.filter(args => args[0]?.q === 'Bio')
    expect(qCalls.length).toBeGreaterThan(0)
  })
})
