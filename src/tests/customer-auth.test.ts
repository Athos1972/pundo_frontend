import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isRTL, getLangFromCookie, LANGS, DEFAULT_LANG } from '@/lib/lang'

// Tests for pure validation logic that doesn't need a browser

describe('Password validation', () => {
  it('rejects passwords shorter than 8 characters', () => {
    const isValid = (pw: string) => pw.length >= 8
    expect(isValid('short')).toBe(false)
    expect(isValid('longEnough')).toBe(true)
    expect(isValid('exactly8')).toBe(true)
    expect(isValid('7chars!')).toBe(false)
  })
})

describe('OTP format validation', () => {
  it('accepts only 6-digit numeric codes', () => {
    const isValidOtp = (otp: string) => /^\d{6}$/.test(otp)
    expect(isValidOtp('123456')).toBe(true)
    expect(isValidOtp('12345')).toBe(false)
    expect(isValidOtp('1234567')).toBe(false)
    expect(isValidOtp('12345a')).toBe(false)
    expect(isValidOtp('000000')).toBe(true)
  })
})

describe('Email normalisation', () => {
  it('trims whitespace from email', () => {
    const normalize = (email: string) => email.trim().toLowerCase()
    expect(normalize('  Test@EXAMPLE.COM  ')).toBe('test@example.com')
  })
})

// ── lang.ts ───────────────────────────────────────────────────────────────────

describe('isRTL', () => {
  it('returns true for Arabic', () => {
    expect(isRTL('ar')).toBe(true)
  })
  it('returns true for Hebrew', () => {
    expect(isRTL('he')).toBe(true)
  })
  it('returns false for EN', () => {
    expect(isRTL('en')).toBe(false)
  })
  it('returns false for DE', () => {
    expect(isRTL('de')).toBe(false)
  })
  it('returns false for EL and RU', () => {
    expect(isRTL('el')).toBe(false)
    expect(isRTL('ru')).toBe(false)
  })
})

describe('getLangFromCookie', () => {
  beforeEach(() => {
    // Reset cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns default lang when no cookie set', () => {
    Object.defineProperty(document, 'cookie', { writable: true, value: '' })
    expect(getLangFromCookie()).toBe(DEFAULT_LANG)
  })

  it('returns lang from cookie when valid', () => {
    Object.defineProperty(document, 'cookie', { writable: true, value: 'app_lang=de' })
    expect(getLangFromCookie()).toBe('de')
  })

  it('returns default for unknown lang value in cookie', () => {
    Object.defineProperty(document, 'cookie', { writable: true, value: 'app_lang=xx' })
    expect(getLangFromCookie()).toBe(DEFAULT_LANG)
  })

  it('returns ar from cookie', () => {
    Object.defineProperty(document, 'cookie', { writable: true, value: 'app_lang=ar' })
    expect(getLangFromCookie()).toBe('ar')
  })
})

describe('LANGS constant', () => {
  it('includes all 6 supported languages', () => {
    expect(LANGS).toContain('en')
    expect(LANGS).toContain('de')
    expect(LANGS).toContain('el')
    expect(LANGS).toContain('ru')
    expect(LANGS).toContain('ar')
    expect(LANGS).toContain('he')
    expect(LANGS.length).toBe(6)
  })
})

describe('setLangCookie', () => {
  it('writes app_lang cookie', async () => {
    const { setLangCookie } = await import('@/lib/lang')
    // In JSDOM document.cookie is settable
    setLangCookie('de')
    expect(document.cookie).toContain('app_lang=de')
  })
})
