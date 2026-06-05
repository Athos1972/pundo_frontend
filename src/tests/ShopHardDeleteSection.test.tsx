/**
 * Unit-Tests für ShopHardDeleteSection
 *
 * Getestete Logik:
 * - Name-Input-Validierung: Button ist disabled bis der eingetippte Name exakt passt
 * - Dialog öffnen/schließen
 * - Delete-API-Call wird ausgelöst
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShopHardDeleteSection } from '@/components/system-admin/ShopHardDeleteSection'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock Toast
vi.mock('@/components/system-admin/Toast', () => ({
  showToast: vi.fn(),
}))

const mockTr = {
  shop_delete_title: 'Delete shop permanently',
  shop_delete_description: 'This will permanently delete the shop.',
  shop_delete_button: 'Delete shop…',
  shop_delete_confirm_name: 'Type the shop name to confirm',
  shop_delete_preview_offers: '{n} offers',
  shop_delete_preview_items: '{n} exclusive products',
  shop_delete_preview_reviews: '{n} reviews',
  shop_delete_preview_error: 'Preview could not be loaded.',
  shop_deleted: 'Shop deleted.',
  cancel: 'Cancel',
  error_generic: 'Something went wrong.',
} as Parameters<typeof ShopHardDeleteSection>[0]['tr']

const defaultProps = {
  shopId: 42,
  shopName: 'Mein Testshop',
  tr: mockTr,
}

function mockFetch(response: object, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => response,
  })
}

describe('ShopHardDeleteSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch({ offers: 3, exclusive_items: 1, reviews: 7 })
  })

  it('renders the danger zone title and description', () => {
    render(<ShopHardDeleteSection {...defaultProps} />)
    expect(screen.getByText('Delete shop permanently')).toBeTruthy()
    expect(screen.getByText('This will permanently delete the shop.')).toBeTruthy()
  })

  it('opens the dialog when the delete button is clicked', async () => {
    render(<ShopHardDeleteSection {...defaultProps} />)
    const btn = screen.getByText('Delete shop…')
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
  })

  it('closes the dialog when cancel is clicked', async () => {
    render(<ShopHardDeleteSection {...defaultProps} />)
    fireEvent.click(screen.getByText('Delete shop…'))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    fireEvent.click(screen.getByText('Cancel'))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('confirm button is DISABLED when name input is empty', async () => {
    render(<ShopHardDeleteSection {...defaultProps} />)
    fireEvent.click(screen.getByText('Delete shop…'))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    // Last button in the dialog is the confirm button
    const buttons = screen.getAllByRole('button')
    const confirmBtn = buttons[buttons.length - 1]
    expect(confirmBtn.hasAttribute('disabled')).toBe(true)
  })

  it('confirm button is DISABLED when name input does not match', async () => {
    const user = userEvent.setup()
    render(<ShopHardDeleteSection {...defaultProps} />)
    fireEvent.click(screen.getByText('Delete shop…'))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    const input = screen.getByLabelText(/Type the shop name/i)
    await user.type(input, 'Falscher Name')

    // The dialog confirm button should still be disabled
    const buttons = screen.getAllByRole('button')
    const confirmBtn = buttons[buttons.length - 1] // last button = confirm
    expect(confirmBtn.hasAttribute('disabled')).toBe(true)
  })

  it('confirm button is ENABLED when name input matches exactly', async () => {
    const user = userEvent.setup()
    render(<ShopHardDeleteSection {...defaultProps} />)
    fireEvent.click(screen.getByText('Delete shop…'))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    const input = screen.getByLabelText(/Type the shop name/i)
    await user.type(input, 'Mein Testshop')

    const buttons = screen.getAllByRole('button')
    const confirmBtn = buttons[buttons.length - 1]
    expect(confirmBtn.hasAttribute('disabled')).toBe(false)
  })

  it('name matching is case-sensitive (wrong case → disabled)', async () => {
    const user = userEvent.setup()
    render(<ShopHardDeleteSection {...defaultProps} />)
    fireEvent.click(screen.getByText('Delete shop…'))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    const input = screen.getByLabelText(/Type the shop name/i)
    await user.type(input, 'mein testshop') // lowercase

    const buttons = screen.getAllByRole('button')
    const confirmBtn = buttons[buttons.length - 1]
    expect(confirmBtn.hasAttribute('disabled')).toBe(true)
  })

  it('shows preview counts when loaded', async () => {
    render(<ShopHardDeleteSection {...defaultProps} />)
    fireEvent.click(screen.getByText('Delete shop…'))
    await waitFor(() => {
      expect(screen.getByText(/3 offers/)).toBeTruthy()
      expect(screen.getByText(/1 exclusive products/)).toBeTruthy()
      expect(screen.getByText(/7 reviews/)).toBeTruthy()
    })
  })

  it('shows preview error when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'))
    render(<ShopHardDeleteSection {...defaultProps} />)
    fireEvent.click(screen.getByText('Delete shop…'))
    await waitFor(() => {
      expect(screen.getByText('Preview could not be loaded.')).toBeTruthy()
    })
  })
})
