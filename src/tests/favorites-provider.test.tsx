import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ── Session mock ─────────────────────────────────────────────────────────────
let mockIsAuthenticated = false
vi.mock('@/components/auth/SessionProvider', () => ({
  useSession: () => ({ user: mockIsAuthenticated ? { id: 1 } : null, is_authenticated: mockIsAuthenticated }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ── Fetch mock ───────────────────────────────────────────────────────────────
const mockFetch = vi.fn()
global.fetch = mockFetch

import { FavoritesProvider, useFavorites } from '@/components/favorites/FavoritesProvider'

function Harness({ productId }: { productId: number }) {
  const { isFavorite, toggleFavorite, isLoading } = useFavorites()
  return (
    <div>
      <span data-testid="is-fav">{String(isFavorite(productId))}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <button onClick={() => void toggleFavorite(productId)}>toggle</button>
    </div>
  )
}

describe('FavoritesProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthenticated = false
  })

  it('starts empty when unauthenticated', async () => {
    render(
      <FavoritesProvider>
        <Harness productId={7} />
      </FavoritesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('is-fav')).toHaveTextContent('false'))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('loads favorites from API when authenticated', async () => {
    mockIsAuthenticated = true
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ product_id: 7 }, { product_id: 99 }], total: 2, page: 1, limit: 200 }),
    })

    render(
      <FavoritesProvider>
        <Harness productId={7} />
      </FavoritesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('is-fav')).toHaveTextContent('true'))
  })

  it('optimistic add: marks favorite before API responds', async () => {
    mockIsAuthenticated = true
    // Initial load: empty
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [], total: 0, page: 1, limit: 200 }) })
      // Toggle POST succeeds
      .mockResolvedValueOnce({ ok: true })

    render(
      <FavoritesProvider>
        <Harness productId={7} />
      </FavoritesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('is-fav')).toHaveTextContent('false')

    fireEvent.click(screen.getByRole('button'))
    // Optimistic update happens synchronously
    expect(screen.getByTestId('is-fav')).toHaveTextContent('true')
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })

  it('rollback on failed toggle: reverts optimistic update', async () => {
    mockIsAuthenticated = true
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ product_id: 7 }], total: 1, page: 1, limit: 200 }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 })

    render(
      <FavoritesProvider>
        <Harness productId={7} />
      </FavoritesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('is-fav')).toHaveTextContent('true'))

    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('is-fav')).toHaveTextContent('false') // optimistic
    await waitFor(() => expect(screen.getByTestId('is-fav')).toHaveTextContent('true')) // rollback
  })
})
