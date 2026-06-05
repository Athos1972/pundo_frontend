import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { tConsent, consentTranslations } from '@/lib/i18n/consent'
import {
  parseConsentCookie,
  serializeConsentCookie,
  defaultConsentState,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  type ConsentState,
} from '@/lib/consent'

describe('defaultConsentState', () => {
  it('returns v:1, necessary:true, marketing:false', () => {
    const s = defaultConsentState()
    expect(s.v).toBe(1)
    expect(s.necessary).toBe(true)
    expect(s.marketing).toBe(false)
    expect(s.statistics).toBe(true)
  })
})

describe('serializeConsentCookie + parseConsentCookie roundtrip', () => {
  it('roundtrips a marketing=true state', () => {
    const state: ConsentState = { v: 1, necessary: true, statistics: true, marketing: true }
    const serialized = serializeConsentCookie(state)
    const parsed = parseConsentCookie(serialized)
    expect(parsed).toEqual(state)
  })

  it('roundtrips a marketing=false state', () => {
    const state: ConsentState = { v: 1, necessary: true, statistics: true, marketing: false }
    const parsed = parseConsentCookie(serializeConsentCookie(state))
    expect(parsed).toEqual(state)
  })
})

describe('parseConsentCookie', () => {
  it('returns null for undefined', () => {
    expect(parseConsentCookie(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseConsentCookie('')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(parseConsentCookie('not-json')).toBeNull()
  })

  it('returns null for wrong schema version', () => {
    const bad = encodeURIComponent(JSON.stringify({ v: 2, necessary: true, marketing: false }))
    expect(parseConsentCookie(bad)).toBeNull()
  })

  it('coerces missing marketing to false', () => {
    const raw = encodeURIComponent(JSON.stringify({ v: 1, necessary: true, statistics: true }))
    const result = parseConsentCookie(raw)
    expect(result?.marketing).toBe(false)
  })

  it('forces necessary to true even if cookie says false', () => {
    const raw = encodeURIComponent(JSON.stringify({ v: 1, necessary: false, statistics: true, marketing: false }))
    const result = parseConsentCookie(raw)
    expect(result?.necessary).toBe(true)
  })
})

describe('constants', () => {
  it('CONSENT_COOKIE is app_cookie_consent', () => {
    expect(CONSENT_COOKIE).toBe('app_cookie_consent')
  })

  it('CONSENT_MAX_AGE is 6 months in seconds', () => {
    expect(CONSENT_MAX_AGE).toBe(15_552_000)
  })
})

describe('consentTranslations — consent_banner_text (cookie-banner-text-i18n-20260605)', () => {
  const langs = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

  it('alle 6 Sprachen haben consent_banner_text definiert und nicht leer', () => {
    for (const lang of langs) {
      const text = consentTranslations[lang].consent_banner_text
      expect(text, `${lang}: consent_banner_text fehlt oder leer`).toBeTruthy()
    }
  })

  it('keine der 6 Varianten enthält "Facebook" (Regression gegen alten Text)', () => {
    for (const lang of langs) {
      const text = consentTranslations[lang].consent_banner_text
      expect(text.toLowerCase(), `${lang}: enthält noch "facebook"`).not.toContain('facebook')
    }
  })

  it('unbekannte Sprache fällt auf en zurück (tConsent-Fallback)', () => {
    const result = tConsent('xx')
    expect(result.consent_banner_text).toBe(consentTranslations.en.consent_banner_text)
  })
})

describe('ConsentContext — writeConsentCookie Secure flag (source regression)', () => {
  const src = readFileSync(
    resolve(__dirname, '../../src/components/consent/ConsentContext.tsx'),
    'utf8',
  )

  it('writeConsentCookie includes secure attribute (Observatory regression 2026-06-05)', () => {
    // The document.cookie string in writeConsentCookie must contain "secure"
    expect(src.toLowerCase()).toMatch(/document\.cookie\s*=[\s\S]*?secure/)
  })
})
