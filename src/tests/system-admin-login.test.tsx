import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'
import AdminLoginPage from '@/app/(system-admin)/admin/login/page'

const mockFetch = vi.fn()
const original = window.location
const en = tSysAdmin('en')
const el = tSysAdmin('el')

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
  Object.defineProperty(window, 'location', { configurable: true, value: { href: 'http://localhost/admin/login' } })
  document.cookie = 'app_lang=; max-age=0'
})
afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(window, 'location', { configurable: true, value: original })
})

async function login(user: ReturnType<typeof userEvent.setup>, t = en) {
  await user.type(screen.getByLabelText(t.email), 'root@pundo.io')
  await user.type(screen.getByLabelText(t.password), 'pw-123456')
  await user.click(screen.getByRole('button', { name: t.sign_in }))
}

describe('System-admin login page', () => {
  it('posts the credentials and hard-navigates to the dashboard on success', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200 })
    render(<AdminLoginPage />)
    await login(user)
    await waitFor(() => expect(window.location.href).toBe('/admin/dashboard'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/admin/auth/login')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ email: 'root@pundo.io', password: 'pw-123456' })
  })

  it.each([401, 403])('status %i shows the invalid-credentials message and does not navigate', async (status) => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status })
    render(<AdminLoginPage />)
    await login(user)
    expect((await screen.findByRole('alert')).textContent).toBe(en.invalid_credentials)
    expect(window.location.href).toBe('http://localhost/admin/login')
  })

  it('other failures show the generic error, network errors the backend error', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    render(<AdminLoginPage />)
    await login(user)
    expect((await screen.findByRole('alert')).textContent).toBe(en.error_generic)
    mockFetch.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getByRole('button', { name: en.sign_in }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(en.error_backend))
  })

  it('clears a previous error when submitting again', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })
    render(<AdminLoginPage />)
    await login(user)
    await screen.findByRole('alert')
    let release!: (v: unknown) => void
    mockFetch.mockReturnValueOnce(new Promise((r) => { release = r }))
    await user.click(screen.getByRole('button', { name: en.sign_in }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect((screen.getByRole('button', { name: en.signing_in }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => { release({ ok: true, status: 200 }) })
  })

  it('uses the language from the app_lang cookie (Greek)', async () => {
    document.cookie = 'app_lang=el'
    render(<AdminLoginPage />)
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(el.login_title))
    expect(screen.getByRole('button', { name: el.sign_in })).toBeTruthy()
  })

  it('falls back to English for an unsupported cookie language', () => {
    document.cookie = 'app_lang=xx'
    render(<AdminLoginPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en.login_title)
  })
})
