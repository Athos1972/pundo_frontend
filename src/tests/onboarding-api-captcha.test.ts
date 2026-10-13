// B6220-003 — onboardingApi: Turnstile token only for the email path, error mapping.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitOnboarding } from '@/lib/onboarding/onboardingApi'
import type { OnboardingSubmitPayload } from '@/types/shop-admin'

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

function reply(status: number, body: unknown) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))
}

const base = {
  providerType: 'handwerker',
  domainSlugs: ['elektro'],
  specialtySlugs: [],
  location: { lat: 1, lng: 2, address: 'x', isB2cStorefront: true },
  contact: { phone: '123' },
  shopName: 'Shop',
} as unknown as Omit<OnboardingSubmitPayload, 'credentials'>

const sentBody = () => JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)

describe('submitOnboarding captcha', () => {
  it('sends turnstile_token on the email path', async () => {
    reply(201, { user_id: 1, shop_id: 2, status: 'pending' })
    await submitOnboarding({ ...base, credentials: { email: 'a@b.c', password: 'pw' }, turnstileToken: 'tok' })
    expect(sentBody().turnstile_token).toBe('tok')
  })

  it('sends no token on the Google path', async () => {
    reply(201, { user_id: 1, shop_id: 2, status: 'pending' })
    await submitOnboarding({ ...base, credentials: { type: 'google' }, turnstileToken: 'tok' })
    expect(sentBody()).not.toHaveProperty('turnstile_token')
  })

  it('maps 400 detail captcha_failed to CAPTCHA_FAILED', async () => {
    reply(400, { detail: 'captcha_failed' })
    await expect(
      submitOnboarding({ ...base, credentials: { email: 'a@b.c', password: 'pw' }, turnstileToken: 't' }),
    ).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' })
  })

  it('maps 429 to RATE_LIMITED', async () => {
    reply(429, { error: 'Rate limit exceeded' })
    await expect(
      submitOnboarding({ ...base, credentials: { email: 'a@b.c', password: 'pw' }, turnstileToken: 't' }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })
})
