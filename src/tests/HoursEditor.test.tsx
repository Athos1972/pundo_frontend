import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// F8950 T33: aus coverage-gaps.test.tsx. Speichern (PUT, Fehler-Toast), zweites Zeitfenster, Zeit ändern.
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
