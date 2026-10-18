// F5970 AC 43: the claim namespace is complete in all 6 languages, error codes are covered, placeholders agree
import { describe, it, expect } from 'vitest'
import { shopAdminClaimTranslationsMap } from '@/lib/i18n/shop-admin-claim'
import { tAdmin } from '@/lib/shop-admin-translations'
import { CLAIM_ERROR_KEYS, claimErrorMessage } from '@/lib/shop-admin-claim-errors'
import { ClaimApiError } from '@/lib/shop-admin-claim-client'

const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const
const map = shopAdminClaimTranslationsMap as unknown as Record<string, Record<string, string>>
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')

describe('shop-admin-claim translations', () => {
  it('has a substantial key set', () => {
    expect(Object.keys(map.en).length).toBeGreaterThan(100)
  })

  it.each(LANGS)('%s has exactly the keys of en', (lang) => {
    expect(Object.keys(map[lang]).sort()).toEqual(Object.keys(map.en).sort())
  })

  it.each(LANGS)('%s has no empty value and no leftover English placeholder text for non-latin languages', (lang) => {
    for (const [key, value] of Object.entries(map[lang])) expect(value.trim().length, `${lang}.${key}`).toBeGreaterThan(0)
  })

  it.each(['de', 'el', 'ru', 'ar', 'he'] as const)('%s uses the same {placeholders} as en for every key', (lang) => {
    for (const key of Object.keys(map.en)) {
      expect(placeholders(map[lang][key]), `${lang}.${key}`).toBe(placeholders(map.en[key]))
    }
  })

  it('ar and he contain Arabic / Hebrew script (not English copies)', () => {
    const sample = (lang: string) => ['claim_submit', 'claim_continue', 'claim_code_title'].map((k) => map[lang][k]).join('')
    expect(sample('ar')).toMatch(/[؀-ۿ]/)
    expect(sample('he')).toMatch(/[֐-׿]/)
  })

  it('is merged into tAdmin()', () => {
    for (const lang of LANGS) expect((tAdmin(lang) as unknown as Record<string, string>).claim_continue).toBe(map[lang].claim_continue)
  })
})

describe('error code mapping', () => {
  it('maps every code of the backend contract (02-architecture §3) to an existing key in all languages', () => {
    const contractCodes = [
      'captcha_failed', 'claim_shop_not_found', 'claim_owner_confirmation_required', 'claim_invalid_request',
      'claim_message_too_long', 'claim_password_invalid', 'claim_account_required', 'claim_name_required',
      'invalid_credentials', 'claim_account_has_shop', 'claim_account_not_eligible', 'claim_proof_method_unavailable',
      'claim_callback_ack_required', 'claim_documents_required', 'claim_too_many_documents',
      'claim_document_invalid_type', 'claim_document_too_large', 'claim_upload_unavailable', 'claim_open_limit',
      'claim_cooldown', 'claim_not_found', 'claim_not_open', 'claim_code_missing', 'claim_code_locked',
      'claim_code_expired', 'claim_code_invalid', 'claim_code_rate_limited', 'claim_shop_code_rate_limited',
      'rate_limited', 'network',
    ]
    for (const code of contractCodes) {
      const key = CLAIM_ERROR_KEYS[code]
      expect(key, code).toBeTruthy()
      for (const lang of LANGS) expect(map[lang][key], `${lang}.${key}`).toBeTruthy()
    }
  })

  it('fills the placeholders from the error details', () => {
    const tr = tAdmin('de') as unknown as Parameters<typeof claimErrorMessage>[1]
    expect(claimErrorMessage(new ClaimApiError(409, 'claim_account_has_shop', { shop_name: 'Cafe Omega' }), tr, 'de')).toContain('Cafe Omega')
    expect(claimErrorMessage(new ClaimApiError(422, 'claim_code_invalid', { attempts_left: 3 }), tr, 'de')).toContain('3')
    expect(claimErrorMessage(new ClaimApiError(422, 'claim_document_invalid_type', { filename: 'evil.pdf' }), tr, 'de')).toContain('evil.pdf')
    expect(claimErrorMessage(new ClaimApiError(422, 'claim_too_many_documents', { max_files: 3 }), tr, 'de')).toContain('3')
    const cooldown = claimErrorMessage(new ClaimApiError(429, 'claim_cooldown', { until: '2026-11-20T10:00:00+00:00' }), tr, 'en')
    expect(cooldown).not.toContain('{date}')
    expect(cooldown).toMatch(/2026/)
  })

  it('falls back to the generic message for unknown codes and foreign errors, rate-limit text for a bare 429', () => {
    const tr = tAdmin('en') as unknown as Parameters<typeof claimErrorMessage>[1]
    expect(claimErrorMessage(new ClaimApiError(500, 'something_new'), tr, 'en')).toBe(map.en.claim_err_generic)
    expect(claimErrorMessage(new Error('x'), tr, 'en')).toBe(map.en.claim_err_generic)
    expect(claimErrorMessage(new ClaimApiError(429, 'unknown_429'), tr, 'en')).toBe(map.en.claim_err_rate_limited)
  })
})
