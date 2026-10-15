import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'

const push = vi.fn()
let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => React.createElement('a', { href }, children),
}))
vi.mock('@/components/shop-admin/onboarding/ShopOwnerOAuthButton', () => ({
  ShopOwnerOAuthButton: () => React.createElement('button', { type: 'button' }, 'google'),
}))

import LoginPage from '@/app/(shop-admin)/shop-admin/login/page'

const mockFetch = vi.fn()
const en = tAdmin('en')
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body })

beforeEach(() => {
  push.mockReset(); mockFetch.mockReset(); search = ''
  document.cookie = 'app_lang=; max-age=0'
  vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

async function submit(user: ReturnType<typeof userEvent.setup>, t = en, email = 'o@x.io', password = 'secret') {
  if (email) await user.type(screen.getByLabelText(new RegExp(t.email)), email)
  if (password) await user.type(screen.getByLabelText(new RegExp(t.password)), password)
  await user.click(screen.getByRole('button', { name: t.login_btn }))
}

describe('Shop-admin login flow', () => {
  it('requires both fields before calling the API', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    await submit(user, en, '', '')
    expect((await screen.findAllByText(en.required)).length).toBe(2)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('only the missing field is flagged', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    await submit(user, en, 'o@x.io', '')
    expect(await screen.findAllByText(en.required)).toHaveLength(1)
  })

  it('approved owner is sent to the dashboard by default', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(json(200, { status: 'approved' }))
    render(<LoginPage />)
    await submit(user)
    await waitFor(() => expect(push).toHaveBeenCalledWith('/shop-admin/dashboard'))
    expect(mockFetch.mock.calls[0][0]).toBe('/api/shop-admin/login')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ email: 'o@x.io', password: 'secret' })
  })

  it('honours a same-origin ?next= target but ignores foreign ones (open-redirect guard)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(json(200, { status: 'approved' }))
    search = 'next=/shop-admin/offers'
    const { unmount } = render(<LoginPage />)
    await submit(user)
    await waitFor(() => expect(push).toHaveBeenCalledWith('/shop-admin/offers'))
    unmount()
    push.mockReset()
    search = 'next=https://evil.example/x'
    render(<LoginPage />)
    await submit(user)
    await waitFor(() => expect(push).toHaveBeenCalledWith('/shop-admin/dashboard'))
  })

  it('pending owners go to the waiting page regardless of ?next=', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(json(200, { status: 'pending' }))
    search = 'next=/shop-admin/offers'
    render(<LoginPage />)
    await submit(user)
    await waitFor(() => expect(push).toHaveBeenCalledWith('/shop-admin/pending-approval'))
  })

  it('shows the backend message on failure, the generic one when there is none', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(json(401, { detail: 'Wrong password' }))
    render(<LoginPage />)
    await submit(user)
    expect((await screen.findByRole('alert')).textContent).toBe('Wrong password')
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => { throw new Error('no json') } })
    await user.click(screen.getByRole('button', { name: en.login_btn }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(en.error_generic))
    expect(push).not.toHaveBeenCalled()
  })

  it('network errors show the generic message', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('down'))
    render(<LoginPage />)
    await submit(user)
    expect((await screen.findByRole('alert')).textContent).toBe(en.error_generic)
  })

  it('shows the deactivation notice for ?deactivated=1', () => {
    search = 'deactivated=1'
    render(<LoginPage />)
    expect(screen.getByRole('status').textContent).toBe(en.login_deactivated_notice)
  })

  it('switches to the cookie language after mount (Arabic) incl. the OAuth error text', async () => {
    document.cookie = 'app_lang=ar'
    search = 'error=oauth_failed'
    render(<LoginPage />)
    const ar = tAdmin('ar')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(ar.login_title))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(ar.login_oauth_error))
  })
})
