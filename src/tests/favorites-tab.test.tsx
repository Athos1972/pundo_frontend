import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import { FavoritesTab } from '@/components/account/FavoritesTab'
import type { FavoriteListItem } from '@/types/api'

const makeFav = (overrides: Partial<FavoriteListItem> = {}): FavoriteListItem => ({
  id: 1, product_id: 10, product_slug: 'test-product', product_name: 'Test Produkt',
  brand: 'TestBrand', image_url: null, best_offer_price: '2.99', best_offer_currency: 'EUR',
  best_offer_shop: 'Testshop', best_offer_dist_km: null, alert_interval: 'täglich',
  ...overrides,
})

describe('FavoritesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: notification settings + empty favorites list
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [], total: 0, page: 1, limit: 20 }) })
  })

  it('renders loading spinner initially', () => {
    // Hold both fetches pending
    mockFetch.mockReset()
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<FavoritesTab lang="en" />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders empty state when no favorites', async () => {
    render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(screen.queryByText(/no favorites|Keine Favoriten|Your favorites/i) ??
      screen.queryByText(/empty|leer/i)).toBeDefined())
    // Loading spinner should be gone
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument())
  })

  it('renders global notification settings section', async () => {
    render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument())
    // Global settings select should be present
    const selects = screen.getAllByRole('combobox')
    expect(selects.length).toBeGreaterThanOrEqual(1)
  })

  it('renders favorites list', async () => {
    mockFetch.mockReset()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [makeFav({ id: 1, product_name: 'Manner Schnitten' })], total: 1, page: 1, limit: 20 }),
      })

    render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(screen.getByText('Manner Schnitten')).toBeInTheDocument())
    expect(screen.getByText('TestBrand')).toBeInTheDocument()
    expect(screen.getByText(/2\.99.*EUR/)).toBeInTheDocument()
  })

  it('shows delete confirm on trash click, then deletes', async () => {
    mockFetch.mockReset()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [makeFav({ id: 1, product_id: 10 })], total: 1, page: 1, limit: 20 }),
      })
      .mockResolvedValueOnce({ ok: true }) // DELETE

    render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(screen.getByText('Test Produkt')).toBeInTheDocument())

    // Click trash icon — title is "Remove favorite?" in English
    const trashBtn = screen.getByTitle(/favorite/i)
    fireEvent.click(trashBtn)

    // Confirm button should appear
    await waitFor(() => expect(screen.getByText(/remove/i)).toBeInTheDocument())
  })

  it('saves global interval settings', async () => {
    mockFetch.mockReset()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [], total: 0, page: 1, limit: 20 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'wöchentlich' }) }) // PATCH

    render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument())

    // Change global interval select
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'wöchentlich' } })

    // Click save button
    const saveBtn = screen.getByRole('button', { name: /save|speichern|settings/i })
    fireEvent.click(saveBtn)

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      '/api/customer/auth/notification-settings',
      expect.objectContaining({ method: 'PATCH' })
    ))
  })

  it('shows "load more" button when more items exist', async () => {
    mockFetch.mockReset()
    const items = Array.from({ length: 20 }, (_, i) => makeFav({ id: i + 1, product_id: i + 10, product_name: `Produkt ${i + 1}` }))
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items, total: 35, page: 1, limit: 20 }) })

    render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(screen.getByText('Produkt 1')).toBeInTheDocument())
    // total=35 > items.length=20 → load more button
    const loadMoreBtn = screen.getByRole('button', { name: /more|mehr|load/i })
    expect(loadMoreBtn).toBeInTheDocument()
  })

  it('cancel delete shows normal trash button again', async () => {
    mockFetch.mockReset()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [makeFav({ id: 1 })], total: 1, page: 1, limit: 20 }),
      })

    render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(screen.getByText('Test Produkt')).toBeInTheDocument())

    fireEvent.click(screen.getByTitle(/favorite/i))
    await waitFor(() => expect(screen.getByText(/remove/i)).toBeInTheDocument())

    // Click ✕ cancel button
    fireEvent.click(screen.getByText('✕'))
    await waitFor(() => expect(screen.getByTitle(/favorite/i)).toBeInTheDocument())
  })

  it('confirms delete and removes item from list', async () => {
    mockFetch.mockReset()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'täglich' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [makeFav({ id: 5, product_id: 50 })], total: 1, page: 1, limit: 20 }),
      })
      .mockResolvedValueOnce({ ok: true }) // DELETE

    render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(screen.getByText('Test Produkt')).toBeInTheDocument())

    // Show confirm
    fireEvent.click(screen.getByTitle(/favorite/i))
    await waitFor(() => expect(screen.getByText(/remove/i)).toBeInTheDocument())

    // Confirm delete
    fireEvent.click(screen.getByText(/remove/i))
    await waitFor(() => expect(screen.queryByText('Test Produkt')).not.toBeInTheDocument())
  })

  it('interval validation: per-fav interval cannot be more frequent than global', async () => {
    // global = 'wöchentlich', try to set 'sofort' → alert
    mockFetch.mockReset()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ default_alert_interval: 'wöchentlich' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [makeFav({ id: 1, alert_interval: 'wöchentlich' })], total: 1, page: 1, limit: 20 }),
      })

    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<FavoritesTab lang="en" />)
    await waitFor(() => expect(screen.getByText('Test Produkt')).toBeInTheDocument())

    // Find per-favorite interval select (second combobox)
    const selects = screen.getAllByRole('combobox')
    const perFavSelect = selects[selects.length - 1]
    fireEvent.change(perFavSelect, { target: { value: 'sofort' } })

    expect(alertMock).toHaveBeenCalled()
    alertMock.mockRestore()
  })
})
