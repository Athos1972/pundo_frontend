import type { Translations } from '@/lib/translations'
import type { ProgressionAdmissionError } from '@/types/api'

const RTL_LANGUAGES = new Set(['ar', 'he'])

/**
 * The API timestamp is an instant, not customer-facing copy. We present it in
 * UTC (which is explicitly named by Intl) so reset semantics remain unambiguous.
 * Bidi isolates keep a date/time plus the Latin UTC marker intact in AR/HE.
 */
export function formatProgressionResetTime(resetAt: string, lang: string): string {
  const locale = ['en', 'de', 'el', 'ru', 'ar', 'he'].includes(lang) ? lang : 'en'
  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short',
  }).format(new Date(resetAt))
  return RTL_LANGUAGES.has(locale) ? `\u2066${formatted}\u2069` : formatted
}

/**
 * Maps the closed admission-limit contract to deliberately specific copy.
 * Unknown identifiers must remain neutral: their semantics are not ours to guess.
 */
export function progressionAdmissionErrorText(tr: Translations, error: ProgressionAdmissionError, fallback: string, lang = 'en'): string {
  if (error.kind === 'wallet_insufficient') return tr.progression_wallet_insufficient(error.required_credits, error.wallet_credits)
  if (error.kind === 'admission_limit') {
    const reset = formatProgressionResetTime(error.reset_at, lang)
    switch (error.limit_kind) {
      case 'homesick_free_daily': return tr.progression_limit_homesick_free_daily(reset)
      case 'homesick_free_monthly': return tr.progression_limit_homesick_free_monthly(reset)
      case 'homesick_daily_total_cap': return tr.progression_limit_homesick_daily_total_cap(reset)
      case 'homesick_daily_attempt_cap': return tr.progression_limit_homesick_daily_attempt_cap(reset)
      case 'product_mail_free_monthly': return tr.progression_limit_product_mail_free_monthly(reset)
      default: return tr.progression_limit_unknown(reset)
    }
  }
  if (error.kind === 'conflict') return tr.progression_conflict
  if (error.kind === 'not_found') return tr.progression_not_found
  if (error.kind === 'validation') return tr.progression_validation
  if (error.kind === 'network' || error.kind === 'server') return tr.progression_network
  if (error.kind === 'contract_invalid') return tr.progression_contract_error
  return fallback
}
