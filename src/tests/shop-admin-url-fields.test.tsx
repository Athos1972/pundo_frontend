import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { LANGS } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/shop-admin/profile',
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => React.createElement('a', { href }, children),
}))
vi.mock('@/components/shop-admin/LogoUpload', () => ({ LogoUpload: () => null }))
vi.mock('@/components/ui/LanguageSelector', () => ({ LanguageSelector: () => null }))
vi.mock('@/components/shop-admin/Toast', () => ({ showToast: vi.fn() }))

const mockFetch = vi.fn()
global.fetch = mockFetch

async function renderForm(lang: string) {
  const { ProfileForm } = await import('@/app/(shop-admin)/shop-admin/(portal)/profile/ProfileForm')
  return render(React.createElement(ProfileForm, { shop: null, lang }))
}

describe('shop-admin invalid URL message', () => {
  it('exists in every language and differs from the generic error (except none)', () => {
    for (const lang of LANGS) {
      const tr = tAdmin(lang)
      expect(tr.error_invalid_url, lang).toBeTruthy()
      expect(tr.error_invalid_url).not.toBe(tr.error_generic)
    }
  })
})

describe('ProfileForm website/webshop URL fields', () => {
  beforeEach(() => mockFetch.mockReset())

  it('accepts scheme-less input in the browser (type=text + url keyboard) so the backend can add https://', async () => {
    await renderForm('en')
    for (const name of ['website_url', 'webshop_url']) {
      const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement
      expect(input.type).toBe('text')
      expect(input.getAttribute('inputmode')).toBe('url')
      expect(input.placeholder).toMatch(/^https:\/\//)
    }
  })

  it.each([
    ['pydantic style', { detail: [{ loc: ['body', 'website_url'], msg: 'invalid url', type: 'value_error' }] }],
    ['flat style', { error: 'invalid_url', field: 'website_url' }],
  ])('422 for website_url (%s) shows the localized message at the field', async (_n, body) => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422, json: async () => body })
    await renderForm('de')
    fireEvent.submit(screen.getByRole('button', { name: /speichern|save/i }).closest('form')!)
    const alert = await screen.findByText(tAdmin('de').error_invalid_url)
    expect(alert.closest('p')?.id).toBe('website_url-error')
    expect(document.querySelector('#webshop_url-error')).toBeNull()
  })

  it('422 for webshop_url marks only the webshop field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 422,
      json: async () => ({ detail: [{ loc: ['body', 'webshop_url'], msg: 'x' }] }),
    })
    await renderForm('el')
    fireEvent.submit(screen.getByRole('button', { name: /αποθήκευση|save/i }).closest('form')!)
    await waitFor(() => expect(document.querySelector('#webshop_url-error')?.textContent).toBe(tAdmin('el').error_invalid_url))
    expect(document.querySelector('#website_url-error')).toBeNull()
  })

  it('error clears after a successful save', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ detail: [{ loc: ['body', 'website_url'] }] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    await renderForm('en')
    const form = screen.getByRole('button', { name: /save/i }).closest('form')!
    fireEvent.submit(form)
    await screen.findByText(tAdmin('en').error_invalid_url)
    fireEvent.submit(form)
    await waitFor(() => expect(screen.queryByText(tAdmin('en').error_invalid_url)).toBeNull())
  })

  it('a 422 unrelated to URLs keeps the generic toast', async () => {
    const { showToast } = await import('@/components/shop-admin/Toast')
    vi.mocked(showToast).mockClear()
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ detail: [{ loc: ['body', 'phone'] }] }) })
    await renderForm('en')
    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form')!)
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(tAdmin('en').error_generic, 'error'))
  })
})
