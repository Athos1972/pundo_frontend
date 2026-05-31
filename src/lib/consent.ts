export interface ConsentState {
  v: 1
  necessary: true
  statistics: boolean
  marketing: boolean
}

export const CONSENT_COOKIE = 'app_cookie_consent'
export const CONSENT_MAX_AGE = 15_552_000 // 6 months

export function defaultConsentState(): ConsentState {
  return { v: 1, necessary: true, statistics: true, marketing: false }
}

export function parseConsentCookie(raw: string | undefined): ConsentState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(raw))
    if (parsed?.v !== 1) return null
    return {
      v: 1,
      necessary: true,
      statistics: typeof parsed.statistics === 'boolean' ? parsed.statistics : true,
      marketing: typeof parsed.marketing === 'boolean' ? parsed.marketing : false,
    }
  } catch {
    return null
  }
}

export function serializeConsentCookie(state: ConsentState): string {
  return encodeURIComponent(JSON.stringify({ v: state.v, necessary: state.necessary, statistics: state.statistics, marketing: state.marketing }))
}
