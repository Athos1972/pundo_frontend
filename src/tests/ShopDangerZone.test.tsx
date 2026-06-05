/**
 * Unit-Tests für ShopDangerZone (Shop-Owner Soft-Deactivate)
 *
 * Getestete Logik:
 * - Dialog öffnen/schließen
 * - POST /api/shop-admin/shop/deactivate + Logout werden aufgerufen
 * - Fehler-Toast bei API-Fehler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShopDangerZone } from '@/components/shop-admin/ShopDangerZone'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

const mockTr = {
  danger_zone_title: 'Danger Zone',
  danger_zone_description: 'Closing your shop will deactivate it.',
  deactivate_shop_button: 'Close shop…',
  deactivate_confirm_title: 'Close shop?',
  deactivate_confirm_description: 'Your shop will be deactivated.',
  deactivate_confirm_button: 'Yes, close shop',
  deactivate_cancel: 'Cancel',
  deactivate_error: 'An error occurred.',
} as Parameters<typeof ShopDangerZone>[0]['tr']

describe('ShopDangerZone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the danger zone title and description', () => {
    render(<ShopDangerZone tr={mockTr} />)
    expect(screen.getByText('Danger Zone')).toBeTruthy()
    expect(screen.getByText('Closing your shop will deactivate it.')).toBeTruthy()
  })

  it('opens the confirm dialog when button is clicked', () => {
    render(<ShopDangerZone tr={mockTr} />)
    fireEvent.click(screen.getByText('Close shop…'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Close shop?')).toBeTruthy()
    expect(screen.getByText('Your shop will be deactivated.')).toBeTruthy()
  })

  it('closes the dialog when cancel is clicked', () => {
    render(<ShopDangerZone tr={mockTr} />)
    fireEvent.click(screen.getByText('Close shop…'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('calls deactivate + logout API and redirects on success', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'inactive' }) }) // deactivate
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // logout

    render(<ShopDangerZone tr={mockTr} />)
    fireEvent.click(screen.getByText('Close shop…'))
    fireEvent.click(screen.getByText('Yes, close shop'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/shop-admin/shop/deactivate',
        expect.objectContaining({ method: 'POST' })
      )
      expect(mockPush).toHaveBeenCalledWith('/shop-admin/login?deactivated=1')
    })
  })

  it('shows error message when deactivate API fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Server error' }),
    })

    render(<ShopDangerZone tr={mockTr} />)
    fireEvent.click(screen.getByText('Close shop…'))
    fireEvent.click(screen.getByText('Yes, close shop'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText('An error occurred.')).toBeTruthy()
    })
    // Should NOT redirect
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows error when fetch throws (network error)', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network'))

    render(<ShopDangerZone tr={mockTr} />)
    fireEvent.click(screen.getByText('Close shop…'))
    fireEvent.click(screen.getByText('Yes, close shop'))

    await waitFor(() => {
      expect(screen.getByText('An error occurred.')).toBeTruthy()
    })
  })
})
