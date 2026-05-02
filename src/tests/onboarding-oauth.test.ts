import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startGoogleOAuth } from '@/lib/onboarding/onboardingApi'

function mockFetch(ok: boolean, body: unknown, status = ok ? 200 : 503) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  } as Response)
}

describe('startGoogleOAuth', () => {
  const originalLocation = window.location
  let locationHref = ''

  beforeEach(() => {
    locationHref = ''
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...originalLocation,
        get href() { return locationHref },
        set href(v: string) { locationHref = v },
      },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { writable: true, value: originalLocation })
    vi.restoreAllMocks()
  })

  it('redirects to auth_url on 200 with auth_url key (Option B)', async () => {
    mockFetch(true, { auth_url: 'https://accounts.google.com/?client_id=test' })
    await startGoogleOAuth('google')
    expect(locationHref).toBe('https://accounts.google.com/?client_id=test')
  })

  it('falls back to google_auth_url if auth_url missing (backwards compat)', async () => {
    mockFetch(true, { google_auth_url: 'https://accounts.google.com/?client_id=legacy' })
    await startGoogleOAuth('google')
    expect(locationHref).toBe('https://accounts.google.com/?client_id=legacy')
  })

  it('throws OAUTH_UNAVAILABLE on non-ok response (e.g. 503)', async () => {
    mockFetch(false, { detail: 'Google OAuth not configured' })
    await expect(startGoogleOAuth('google')).rejects.toMatchObject({ code: 'OAUTH_UNAVAILABLE' })
    expect(locationHref).toBe('')
  })

  it('throws OAUTH_NO_URL when 200 but neither url key present', async () => {
    mockFetch(true, {})
    await expect(startGoogleOAuth('google')).rejects.toMatchObject({ code: 'OAUTH_NO_URL' })
    expect(locationHref).toBe('')
  })

  it('propagates network error when fetch rejects', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))
    await expect(startGoogleOAuth('google')).rejects.toThrow('Network failure')
    expect(locationHref).toBe('')
  })
})
