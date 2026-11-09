/**
 * Bug "Bestätigungsmail der Shop-Registrierung kommt immer auf Englisch":
 * die Mail-Sprache kommt aus der Wizard-Sprache, nicht aus navigator.language.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveMailLang, submitOnboarding } from '@/lib/onboarding/onboardingApi'
import type { OnboardingSubmitPayload } from '@/types/shop-admin'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveMailLang', () => {
  it('nimmt die Wizard-Sprache, auch wenn der Browser englisch ist', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    expect(resolveMailLang('de')).toBe('de')
    expect(resolveMailLang('ar')).toBe('ar')
    expect(resolveMailLang('he')).toBe('he')
  })

  it('fällt ohne Wizard-Sprache auf die Browser-Sprache zurück', () => {
    vi.stubGlobal('navigator', { language: 'el-GR' })
    expect(resolveMailLang(undefined)).toBe('el')
  })

  it('fällt bei nicht unterstützten Sprachen auf en zurück', () => {
    vi.stubGlobal('navigator', { language: 'fr-FR' })
    expect(resolveMailLang('fr')).toBe('en')
    expect(resolveMailLang(undefined)).toBe('en')
  })
})

describe('submitOnboarding sendet die Wizard-Sprache', () => {
  it('lang im Request-Body ist die Wizard-Sprache', async () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ shop_id: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const payload = {
      providerType: 'craftsman',
      domainSlugs: [],
      specialtySlugs: [],
      location: { lat: 1, lng: 2, address: 'x', isB2cStorefront: false },
      contact: {},
      shopName: 'Test Shop',
      credentials: { email: 'a@b.cy', password: 'passwort123' },
      lang: 'de',
    } as unknown as OnboardingSubmitPayload

    await submitOnboarding(payload).catch(() => undefined)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { lang: string }
    expect(body.lang).toBe('de')
  })
})
