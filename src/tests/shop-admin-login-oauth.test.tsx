/**
 * Tests für den OAuth-Login-Fix (oauth-redirect-uri-mismatch-20260604):
 * - Login-Seite zeigt Google-Button
 * - Login-Seite zeigt Fehler-Banner bei ?error= Query-Param
 * - Callback-Seite leitet Fehlerfall auf /shop-admin/login, nicht /shop-admin/onboarding
 * - Neue Translation-Keys vorhanden
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ─── Mutable search-params state (changed per test before render) ─────────────
// vi.mock is hoisted — use a shared mutable ref so all tests use one mock.
let mockSearchParamsString = ''

const mockReplace = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
  // Factory reads mockSearchParamsString lazily on every call
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
  usePathname: () => '/shop-admin/login',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

vi.mock('@/lib/lang', () => ({
  getLangFromCookie: () => 'en',
  isRTL: () => false,
}))

vi.mock('@/lib/safe-redirect', () => ({
  sanitizeNextPath: (p: string | null) => p ?? '/shop-admin/',
}))

vi.mock('@/lib/onboarding/onboardingApi', () => ({
  startGoogleOAuth: vi.fn(),
}))

// ─── Reset state between tests ────────────────────────────────────────────────
beforeEach(() => {
  mockSearchParamsString = ''
  mockReplace.mockReset()
  mockPush.mockReset()
  vi.resetModules()
})

// ─── Translation keys ─────────────────────────────────────────────────────────

describe('Translation keys — oauth login (T1)', () => {
  it('login_or_divider is defined for all 6 languages', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const langs = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const
    for (const lang of langs) {
      const tr = tAdmin(lang)
      expect(tr.login_or_divider, `login_or_divider missing for ${lang}`).toBeTruthy()
      expect(typeof tr.login_or_divider).toBe('string')
    }
  })

  it('login_oauth_error is defined for all 6 languages', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    const langs = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const
    for (const lang of langs) {
      const tr = tAdmin(lang)
      expect(tr.login_oauth_error, `login_oauth_error missing for ${lang}`).toBeTruthy()
      expect(typeof tr.login_oauth_error).toBe('string')
    }
  })

  it('login_or_divider has correct values per language', async () => {
    const { tAdmin } = await import('@/lib/shop-admin-translations')
    expect(tAdmin('en').login_or_divider).toBe('or')
    expect(tAdmin('de').login_or_divider).toBe('oder')
    expect(tAdmin('el').login_or_divider).toBe('ή')
    expect(tAdmin('ru').login_or_divider).toBe('или')
    expect(tAdmin('ar').login_or_divider).toBe('أو')
    expect(tAdmin('he').login_or_divider).toBe('או')
  })
})

// ─── Login-Seite: Google-Button sichtbar (T3) ─────────────────────────────────

describe('LoginPage — Google-Button (T3)', () => {
  it('renders the Google OAuth button', async () => {
    mockSearchParamsString = ''
    const { default: LoginPage } = await import(
      '@/app/(shop-admin)/shop-admin/login/page'
    )
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('renders the "or" divider between form and OAuth button', async () => {
    mockSearchParamsString = ''
    const { default: LoginPage } = await import(
      '@/app/(shop-admin)/shop-admin/login/page'
    )
    render(<LoginPage />)
    expect(screen.getByText('or')).toBeInTheDocument()
  })

  it('renders both email/password submit and Google button', async () => {
    mockSearchParamsString = ''
    const { default: LoginPage } = await import(
      '@/app/(shop-admin)/shop-admin/login/page'
    )
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })
})

// ─── Login-Seite: OAuth-Error aus Query-Param (T2) ───────────────────────────

describe('LoginPage — OAuth error from ?error= param (T2)', () => {
  it('shows error banner when ?error=oauth_failed is in URL', async () => {
    mockSearchParamsString = 'error=oauth_failed'
    const { default: LoginPage } = await import(
      '@/app/(shop-admin)/shop-admin/login/page'
    )
    render(<LoginPage />)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert.textContent).toMatch(/google sign-in failed/i)
  })

  it('shows no error banner when no ?error= param', async () => {
    mockSearchParamsString = ''
    const { default: LoginPage } = await import(
      '@/app/(shop-admin)/shop-admin/login/page'
    )
    render(<LoginPage />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

// ─── Callback-Seite: Routing (T4 — regression guard) ─────────────────────────

describe('Callback page — redirect routing (T4)', () => {
  it('redirects to /shop-admin/login on error — NOT onboarding (regression guard)', async () => {
    mockSearchParamsString = 'error=oauth_failed'
    const { default: CallbackPage } = await import(
      '@/app/(shop-admin)/shop-admin/auth/callback/page'
    )
    render(<CallbackPage />)

    await vi.waitFor(() => {
      expect(mockReplace).toHaveBeenCalled()
    })

    const target = mockReplace.mock.calls[0][0] as string
    expect(target).toMatch(/^\/shop-admin\/login/)
    expect(target).not.toMatch(/onboarding/)
  })

  it('redirects new user to onboarding?resume=oauth on success+new_user', async () => {
    mockSearchParamsString = 'success=1&new_user=1'
    const { default: CallbackPage } = await import(
      '@/app/(shop-admin)/shop-admin/auth/callback/page'
    )
    render(<CallbackPage />)

    await vi.waitFor(() => {
      expect(mockReplace).toHaveBeenCalled()
    })

    expect(mockReplace.mock.calls[0][0]).toBe('/shop-admin/onboarding?resume=oauth')
  })

  it('redirects existing user to /shop-admin/dashboard on success without new_user', async () => {
    mockSearchParamsString = 'success=1'
    const { default: CallbackPage } = await import(
      '@/app/(shop-admin)/shop-admin/auth/callback/page'
    )
    render(<CallbackPage />)

    await vi.waitFor(() => {
      expect(mockReplace).toHaveBeenCalled()
    })

    expect(mockReplace.mock.calls[0][0]).toBe('/shop-admin/dashboard')
  })
})
