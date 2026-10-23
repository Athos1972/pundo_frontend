import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProgressionUnsubscribeClient } from '@/app/(customer)/account/progression/unsubscribe/ProgressionUnsubscribeClient'

afterEach(() => vi.unstubAllGlobals())

describe('progression unsubscribe page', () => {
  it('uses the public token endpoint and confirms neutrally for Pundo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })))
    vi.stubGlobal('fetch', fetchMock)
    render(<ProgressionUnsubscribeClient token="opaque.token" brand="pundo" lang="en" />)

    fireEvent.click(screen.getByRole('button', { name: 'Unsubscribe' }))
    await waitFor(() => expect(screen.getByTestId('progression-unsubscribe-done')).toBeVisible())
    expect(fetchMock).toHaveBeenCalledWith('/api/customer/customer/progression/unsubscribe?token=opaque.token', { method: 'GET' })
    expect(screen.getByText(/Pundo will no longer send/)).toBeVisible()
  })

  it('keeps the same neutral confirmation for an already-used or invalid token and uses RTL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }))))
    const { container } = render(<ProgressionUnsubscribeClient token="bad-token" brand="naidivse" lang="ar" />)

    expect(container.querySelector('main')).toHaveAttribute('dir', 'rtl')
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء الاشتراك' }))
    await waitFor(() => expect(screen.getByTestId('progression-unsubscribe-done')).toBeVisible())
    expect(screen.getByTestId('progression-unsubscribe-done')).toHaveTextContent('Naidivse')
  })
})
