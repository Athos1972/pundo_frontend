/**
 * Unit tests for F5910 — Shop-/Dienstleistername im Onboarding
 *
 * Covers:
 *  - validateShopName (F-T3)
 *  - draftStorage v2 + v1 cleanup (F-T1)
 *  - onboardingApi shop_name payload + 400 error handling (F-T6)
 *  - shop-admin-translations new keys present for all 6 languages (F-T2)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateShopName } from '@/lib/onboarding/validation'
import { tAdmin } from '@/lib/shop-admin-translations'

// ── F-T3: validateShopName ────────────────────────────────────────────────────

describe('validateShopName', () => {
  it('returns required for empty string', () => {
    expect(validateShopName('')).toEqual({ ok: false, code: 'required' })
  })

  it('returns required for whitespace-only string', () => {
    expect(validateShopName('   ')).toEqual({ ok: false, code: 'required' })
    expect(validateShopName('\t\n')).toEqual({ ok: false, code: 'required' })
  })

  it('returns too_short for 1 visible character after trim', () => {
    expect(validateShopName('  A  ')).toEqual({ ok: false, code: 'too_short' })
    expect(validateShopName('X')).toEqual({ ok: false, code: 'too_short' })
  })

  it('returns too_long for 121 characters', () => {
    const longName = 'A'.repeat(121)
    expect(validateShopName(longName)).toEqual({ ok: false, code: 'too_long' })
  })

  it('accepts exactly 120 characters', () => {
    const name = 'A'.repeat(120)
    const result = validateShopName(name)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(name)
  })

  it('accepts 2-character minimum', () => {
    const result = validateShopName('AB')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('AB')
  })

  it('accepts typical ASCII name', () => {
    const result = validateShopName('Salon Maria')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('Salon Maria')
  })

  it('trims whitespace and returns trimmed value', () => {
    const result = validateShopName('  Salon Maria  ')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('Salon Maria')
  })

  it('accepts Arabic name (Unicode)', () => {
    const result = validateShopName('محل البقالة')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('محل البقالة')
  })

  it('accepts Russian name', () => {
    const result = validateShopName('Магазин Мария')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('Магазин Мария')
  })

  it('accepts Greek name', () => {
    const result = validateShopName('Σαλόνι Μαρία')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('Σαλόνι Μαρία')
  })

  it('accepts emoji name (2 emoji = 2 code points)', () => {
    // Two emoji = 2 code points, satisfies minimum
    const result = validateShopName('🍕🍔')
    expect(result.ok).toBe(true)
  })

  it('counts code points not UTF-16 units for length check', () => {
    // 120 emoji: each emoji is 1 code point (but 2 UTF-16 units)
    // should be valid (exactly 120 code points)
    const name = '🍕'.repeat(120)
    expect([...(name)].length).toBe(120) // sanity check
    const result = validateShopName(name)
    expect(result.ok).toBe(true)
  })

  it('rejects 121 emoji (121 code points)', () => {
    const name = '🍕'.repeat(121)
    expect(validateShopName(name)).toEqual({ ok: false, code: 'too_long' })
  })
})

// ── F-T1: draftStorage v2 + v1 cleanup ───────────────────────────────────────

describe('draftStorage v2', () => {
  const LEGACY_KEY = 'pundo.onboarding.draft.v1'
  const V2_KEY = 'pundo.onboarding.draft.v2'

  // We need a real localStorage mock for tests
  let store: Record<string, string> = {}

  beforeEach(() => {
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v },
      removeItem: (k: string) => { delete store[k] },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('loadDraft() deletes v1 key even when v2 does not exist', async () => {
    store[LEGACY_KEY] = JSON.stringify({ version: 1 })
    // Import after stub to get fresh module
    const { loadDraft } = await import('@/lib/onboarding/draftStorage')
    const result = loadDraft()
    expect(result).toBeNull()
    expect(store[LEGACY_KEY]).toBeUndefined()
  })

  it('loadDraft() deletes v1 key even when a valid v2 draft exists', async () => {
    store[LEGACY_KEY] = JSON.stringify({ version: 1 })
    const validDraft = {
      version: 2,
      expiresAt: Date.now() + 1_000_000,
      providerType: 'haendler',
      domainSlugs: [],
      specialtySlugs: [],
      location: null,
      contact: {},
      shopName: 'Salon Maria',
    }
    store[V2_KEY] = JSON.stringify(validDraft)

    const { loadDraft } = await import('@/lib/onboarding/draftStorage')
    const result = loadDraft()
    expect(result).not.toBeNull()
    expect(result?.shopName).toBe('Salon Maria')
    expect(store[LEGACY_KEY]).toBeUndefined()
  })

  it('saveDraft() persists shopName in v2 format', async () => {
    const { saveDraft, loadDraft } = await import('@/lib/onboarding/draftStorage')
    saveDraft({
      providerType: 'dienstleister',
      domainSlugs: ['friseur'],
      specialtySlugs: [],
      location: null,
      contact: {},
      shopName: 'Barbershop Zeus',
    })
    const loaded = loadDraft()
    expect(loaded?.shopName).toBe('Barbershop Zeus')
    expect(loaded?.version).toBe(2)
  })

  it('returns null for expired v2 draft', async () => {
    const expired = {
      version: 2,
      expiresAt: Date.now() - 1000,
      providerType: 'haendler',
      domainSlugs: [],
      specialtySlugs: [],
      location: null,
      contact: {},
      shopName: 'Old Shop',
    }
    store[V2_KEY] = JSON.stringify(expired)
    const { loadDraft } = await import('@/lib/onboarding/draftStorage')
    expect(loadDraft()).toBeNull()
  })
})

// ── F-T6: onboardingApi — payload + 400 error handling ───────────────────────

describe('submitOnboarding', () => {
  const basePayload = {
    providerType: 'haendler' as const,
    domainSlugs: ['supermarkt'],
    specialtySlugs: [],
    location: { lat: 34.9, lng: 33.6, address: 'Test St', isB2cStorefront: true },
    contact: { phone: '+357123456' },
    shopName: 'Salon Maria',
    credentials: { email: 'owner@test.cy', password: 'Pass123!' },
  }

  beforeEach(() => {
    // Stub navigator.language
    vi.stubGlobal('navigator', { language: 'de' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('sends shop_name from payload, not email-local-part', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ user_id: 1, shop_id: 1, status: 'pending' }),
    } as Response)

    const { submitOnboarding } = await import('@/lib/onboarding/onboardingApi')
    await submitOnboarding(basePayload)

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    expect(body.shop_name).toBe('Salon Maria')
    // Must NOT be the email local-part
    expect(body.shop_name).not.toBe('owner')
  })

  it('sets credentials.name to shopName for email path', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ user_id: 1, shop_id: 1, status: 'pending' }),
    } as Response)

    const { submitOnboarding } = await import('@/lib/onboarding/onboardingApi')
    await submitOnboarding(basePayload)

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    expect(body.credentials.name).toBe('Salon Maria')
  })

  it('throws SHOP_NAME_INVALID with subCode on 400 field error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        detail: [{ field: 'shop_name', code: 'shop_name_required' }],
      }),
    } as Response)

    const { submitOnboarding } = await import('@/lib/onboarding/onboardingApi')
    await expect(submitOnboarding(basePayload)).rejects.toMatchObject({
      code: 'SHOP_NAME_INVALID',
      subCode: 'shop_name_required',
    })
  })

  it('throws SHOP_NAME_INVALID for shop_name_too_long subCode', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        detail: [{ field: 'shop_name', code: 'shop_name_too_long' }],
      }),
    } as Response)

    const { submitOnboarding } = await import('@/lib/onboarding/onboardingApi')
    await expect(submitOnboarding(basePayload)).rejects.toMatchObject({
      code: 'SHOP_NAME_INVALID',
      subCode: 'shop_name_too_long',
    })
  })

  it('throws ONBOARDING_FAILED for 400 without shop_name field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: [{ field: 'other_field', code: 'invalid' }] }),
    } as Response)

    const { submitOnboarding } = await import('@/lib/onboarding/onboardingApi')
    await expect(submitOnboarding(basePayload)).rejects.toThrow('ONBOARDING_FAILED')
  })

  it('throws EMAIL_TAKEN on 409', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ detail: 'EMAIL_TAKEN' }),
    } as Response)

    const { submitOnboarding } = await import('@/lib/onboarding/onboardingApi')
    await expect(submitOnboarding(basePayload)).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
    })
  })
})

// ── F-T2: translations — new keys present for all 6 languages ────────────────

describe('shop-admin-translations — onboarding step5 name keys', () => {
  const langs = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const
  const requiredKeys = [
    'onboarding_step5_title',
    'onboarding_step5_name_label',
    'onboarding_step5_name_placeholder',
    'onboarding_step5_name_helper',
    'onboarding_step5_name_required_error',
    'onboarding_step5_name_too_short_error',
    'onboarding_step5_name_too_long_error',
  ] as const

  for (const lang of langs) {
    it(`lang=${lang} has all required step5 name keys non-empty`, () => {
      const tr = tAdmin(lang)
      for (const key of requiredKeys) {
        const value = tr[key]
        expect(value, `${lang}.${key} must be non-empty`).toBeTruthy()
        expect(typeof value, `${lang}.${key} must be a string`).toBe('string')
        expect((value as string).length, `${lang}.${key} must have content`).toBeGreaterThan(0)
      }
    })
  }

  it('step5 title no longer says "photo" / "optional" in en', () => {
    const tr = tAdmin('en')
    expect(tr.onboarding_step5_title.toLowerCase()).not.toContain('optional')
    expect(tr.onboarding_step5_title).toContain('business name')
  })

  it('step5 title no longer says "Foto" in de', () => {
    const tr = tAdmin('de')
    expect(tr.onboarding_step5_title.toLowerCase()).not.toContain('optional')
    expect(tr.onboarding_step5_title.toLowerCase()).toContain('geschäftsname')
  })
})
