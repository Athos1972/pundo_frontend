import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  decodePreflight,
  decodeProgressionError,
  resetProgressionContractInvalidReportsForTests,
} from '@/lib/progression-api'
import { formatProgressionResetTime, progressionAdmissionErrorText } from '@/lib/progression-error-text'
import { t } from '@/lib/translations'

describe('progression API decoder', () => {
  afterEach(() => {
    resetProgressionContractInvalidReportsForTests()
    vi.restoreAllMocks()
  })

  it('accepts a complete free price preview without inventing a limit or price', () => {
    const result = decodePreflight({
      allowed: true, charge: { kind: 'free', credits: 0 }, wallet_credits: 12,
      allowance: { kind: 'homesick', period: 'utc_month', used: 3, free_limit: 20, unit_price: 3 },
      message_code: 'free_allowance_available',
    }, 200, 'homesick:preflight')
    expect(result).toMatchObject({ ok: true, data: { wallet_credits: 12, charge: { kind: 'free', credits: 0 } } })
  })

  it('decodes wallet insufficient only when its complete 402 contract is present', async () => {
    const result = await decodeProgressionError(new Response(JSON.stringify({
      code: 'wallet_insufficient', required_credits: 3, wallet_credits: 1, earn_credits_hint: 'contribute',
    }), { status: 402 }), 'homesick:submit')
    expect(result).toEqual({ ok: false, error: { kind: 'wallet_insufficient', status: 402, required_credits: 3, wallet_credits: 1, earn_credits_hint: 'contribute' } })
  })

  it('fails closed and reports malformed 429 once per action', async () => {
    const report = vi.spyOn(console, 'error').mockImplementation(() => {})
    const malformed = () => decodeProgressionError(new Response(JSON.stringify({ code: 'progression_admission_limit' }), { status: 429 }), 'product_mail:patch')
    await expect(malformed()).resolves.toEqual({ ok: false, error: { kind: 'contract_invalid', status: 429 } })
    await malformed()
    expect(report).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith('progression_contract_invalid', { action: 'product_mail:patch' })
  })

  it('uses a specific message for every known limit kind and a neutral message for an unknown one', () => {
    const tr = t('en')
    const limit = (limit_kind: string) => progressionAdmissionErrorText(tr, {
      kind: 'admission_limit', status: 429, limit_kind, reset_at: '2026-10-22T00:00:00Z', retry_after: 60, retry_after_header: null,
    }, 'fallback')

    expect(limit('homesick_free_daily')).toContain("Today's free Homesick searches")
    expect(limit('homesick_free_monthly')).toContain("This month's free Homesick searches")
    expect(limit('homesick_daily_total_cap')).toContain("today's total Homesick search limit")
    expect(limit('homesick_daily_attempt_cap')).toContain("today's Homesick attempt limit")
    expect(limit('product_mail_free_monthly')).toContain("This month's free Product-Mail activations")
    expect(limit('future_unrecognised_cap')).toBe('This action is temporarily unavailable. Try again at October 22, 2026 at 00:00 UTC.')
  })

  it('formats the visible reset time in EN, DE and AR without ISO leakage or a duplicated UTC marker', () => {
    const reset = '2026-10-22T00:00:00Z'
    expect(formatProgressionResetTime(reset, 'en')).toBe('October 22, 2026 at 00:00 UTC')
    expect(formatProgressionResetTime(reset, 'de')).toBe('22. Oktober 2026 um 00:00 UTC')
    const arabic = formatProgressionResetTime(reset, 'ar')
    expect(arabic).toBe('⁦22 أكتوبر 2026 في 00:00 UTC⁩')
    expect(arabic).toMatch(/^\u2066.*UTC\u2069$/)
    expect(arabic.match(/UTC/g)).toHaveLength(1)

    for (const lang of ['en', 'de', 'ar']) {
      const message = progressionAdmissionErrorText(t(lang), {
        kind: 'admission_limit', status: 429, limit_kind: 'homesick_daily_attempt_cap', reset_at: reset, retry_after: 60, retry_after_header: null,
      }, 'fallback', lang)
      expect(message).not.toContain('2026-10-22T00:00:00Z')
      expect(message).toContain('UTC')
    }
  })

  it('keeps a well-formed unknown 429 neutral and emits the contract-drift marker', async () => {
    const report = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await decodeProgressionError(new Response(JSON.stringify({
      code: 'progression_admission_limit', limit_kind: 'future_unrecognised_cap',
      reset_at: '2026-10-22T00:00:00Z', retry_after: 60,
    }), { status: 429 }), 'homesick:submit')

    expect(result).toMatchObject({ ok: false, error: { kind: 'admission_limit', limit_kind: 'future_unrecognised_cap' } })
    expect(report).toHaveBeenCalledWith('progression_contract_invalid', { action: 'homesick:submit' })
  })
})
