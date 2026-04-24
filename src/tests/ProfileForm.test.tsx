import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/shop-admin/profile',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

vi.mock('@/components/shop-admin/LogoUpload', () => ({
  LogoUpload: () => React.createElement('div', { 'data-testid': 'logo-upload' }),
}))

vi.mock('@/components/ui/LanguageSelector', () => ({
  LanguageSelector: () => React.createElement('div', { 'data-testid': 'lang-selector' }),
}))

vi.mock('@/components/shop-admin/Toast', () => ({
  showToast: vi.fn(),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ProfileForm — 422 social_link_blocked handling', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  async function renderProfileForm() {
    const { ProfileForm } = await import(
      '@/app/(shop-admin)/shop-admin/(portal)/profile/ProfileForm'
    )
    return render(React.createElement(ProfileForm, { shop: null, lang: 'en' }))
  }

  it('renders save button', async () => {
    await renderProfileForm()
    expect(screen.getByRole('button', { name: /save/i })).toBeDefined()
  })

  it('shows server error under the blocked platform when 422 is returned', async () => {
    const { showToast } = await import('@/components/shop-admin/Toast')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        error: 'social_link_blocked',
        key: 'facebook',
        category: 'adult',
        via_shortener: false,
      }),
    })

    await renderProfileForm()
    const form = screen.getByRole('button', { name: /save/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('fix'),
        'error'
      )
    })
  })

  it('clears serverErrors and shows success toast on successful save', async () => {
    const { showToast } = await import('@/components/shop-admin/Toast')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    await renderProfileForm()
    const form = screen.getByRole('button', { name: /save/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Saved', 'success')
    })
  })

  it('shows generic error toast for non-422 server error', async () => {
    const { showToast } = await import('@/components/shop-admin/Toast')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    await renderProfileForm()
    const form = screen.getByRole('button', { name: /save/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('went wrong'),
        'error'
      )
    })
  })

  it('shows generic error toast when fetch throws', async () => {
    const { showToast } = await import('@/components/shop-admin/Toast')

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await renderProfileForm()
    const form = screen.getByRole('button', { name: /save/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('went wrong'),
        'error'
      )
    })
  })
})
