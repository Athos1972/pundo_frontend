import type {
  ProgressionAction,
  ProgressionAdmissionError,
  ProgressionAllowance,
  ProgressionCharge,
  ProgressionPreflightResponse,
} from '@/types/api'

const CONTRACT_WINDOW_MS = 15 * 60 * 1000
const reportedInvalidActions = new Map<string, number>()

/** The backend's closed set of admission-limit identifiers. */
export const PROGRESSION_LIMIT_KINDS = [
  'homesick_free_daily',
  'homesick_free_monthly',
  'homesick_daily_total_cap',
  'homesick_daily_attempt_cap',
  'product_mail_free_monthly',
] as const

export type ProgressionLimitKind = (typeof PROGRESSION_LIMIT_KINDS)[number]

export function isProgressionLimitKind(value: string): value is ProgressionLimitKind {
  return (PROGRESSION_LIMIT_KINDS as readonly string[]).includes(value)
}

type JsonRecord = Record<string, unknown>

export type ProgressionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProgressionAdmissionError }

export interface ProgressionPreflightInput {
  action: ProgressionAction
  brand: string
  reference: string
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseRetryAfter(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null
  const seconds = Number(value)
  return Number.isSafeInteger(seconds) ? seconds : null
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Contract-drift indicator. The browser only emits once per action in 15 minutes
 * so malformed producer data is visible without turning into a console storm.
 */
export function reportProgressionContractInvalid(action: string): void {
  const now = Date.now()
  const last = reportedInvalidActions.get(action)
  if (last !== undefined && now - last < CONTRACT_WINDOW_MS) return
  reportedInvalidActions.set(action, now)
  console.error('progression_contract_invalid', { action })
}

/** Test hook for the once-per-action monitor. */
export function resetProgressionContractInvalidReportsForTests(): void {
  reportedInvalidActions.clear()
}

function contractInvalid(status: number, action: string): ProgressionResult<never> {
  reportProgressionContractInvalid(action)
  return { ok: false, error: { kind: 'contract_invalid', status } }
}

function parseAllowance(value: unknown): ProgressionAllowance | null {
  if (!isRecord(value)
    || !isNonEmptyString(value.kind)
    || !isNonEmptyString(value.period)
    || !isNonNegativeInteger(value.used)
    || !isNonNegativeInteger(value.free_limit)
    || !isNonNegativeInteger(value.unit_price)) return null
  return {
    kind: value.kind,
    period: value.period,
    used: value.used,
    free_limit: value.free_limit,
    unit_price: value.unit_price,
  }
}

function parseCharge(value: unknown): ProgressionCharge | null {
  if (!isRecord(value) || !isNonNegativeInteger(value.credits)) return null
  if (value.kind === 'free' && value.credits === 0) return { kind: 'free', credits: 0 }
  if (value.kind === 'credits' && value.credits > 0) return { kind: 'credits', credits: value.credits }
  return null
}

export function decodePreflight(body: unknown, status: number, action: string): ProgressionResult<ProgressionPreflightResponse> {
  if (!isRecord(body) || body.allowed !== true || !isNonNegativeInteger(body.wallet_credits) || !isNonEmptyString(body.message_code)) {
    return contractInvalid(status, action)
  }
  const charge = parseCharge(body.charge)
  const allowance = parseAllowance(body.allowance)
  if (!charge || !allowance) return contractInvalid(status, action)
  return {
    ok: true,
    data: { allowed: true, charge, wallet_credits: body.wallet_credits, allowance, message_code: body.message_code },
  }
}

/** Decode all user-visible final/preflight failures; 402/429 intentionally fail closed. */
export async function decodeProgressionError(response: Response, action: string): Promise<ProgressionResult<never>> {
  const { status } = response
  if (status === 401 || status === 403) return { ok: false, error: { kind: 'auth', status } }
  if (status === 404) return { ok: false, error: { kind: 'not_found', status } }
  if (status === 409) return { ok: false, error: { kind: 'conflict', status } }
  if (status === 422) {
    const body = await readJson(response)
    return { ok: false, error: { kind: 'validation', status, detail: isRecord(body) && typeof body.detail === 'string' ? body.detail : null } }
  }

  const body = await readJson(response)
  if (status === 402) {
    if (!isRecord(body)
      || body.code !== 'wallet_insufficient'
      || !isNonNegativeInteger(body.required_credits)
      || !isNonNegativeInteger(body.wallet_credits)
      || !isNonEmptyString(body.earn_credits_hint)) return contractInvalid(status, action)
    return {
      ok: false,
      error: {
        kind: 'wallet_insufficient', status, required_credits: body.required_credits,
        wallet_credits: body.wallet_credits, earn_credits_hint: body.earn_credits_hint,
      },
    }
  }
  if (status === 429) {
    if (!isRecord(body)
      || body.code !== 'progression_admission_limit'
      || !isNonEmptyString(body.limit_kind)
      || !isNonEmptyString(body.reset_at)
      || Number.isNaN(Date.parse(body.reset_at))
      || !isNonNegativeInteger(body.retry_after)) return contractInvalid(status, action)
    // A syntactically valid but unknown value is safe to display neutrally, but
    // still means producer and consumer have drifted. Never infer semantics from
    // portions of an identifier (for example, "daily" or "monthly").
    if (!isProgressionLimitKind(body.limit_kind)) reportProgressionContractInvalid(action)
    return {
      ok: false,
      error: {
        kind: 'admission_limit', status, limit_kind: body.limit_kind, reset_at: body.reset_at,
        retry_after: body.retry_after, retry_after_header: parseRetryAfter(response.headers.get('retry-after')),
      },
    }
  }
  if (status >= 500 || status === 502) return { ok: false, error: { kind: 'server', status } }
  return { ok: false, error: { kind: 'generic', status } }
}

export async function requestProgressionPreflight(
  input: ProgressionPreflightInput,
  fetcher: typeof fetch = fetch,
): Promise<ProgressionResult<ProgressionPreflightResponse>> {
  let response: Response
  try {
    response = await fetcher('/api/customer/customer/progression/preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    return { ok: false, error: { kind: 'network', status: 0 } }
  }
  if (!response.ok) return decodeProgressionError(response, `${input.action}:preflight`)
  return decodePreflight(await readJson(response), response.status, `${input.action}:preflight`)
}

export async function submitSimilaritySearch(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<ProgressionResult<{ search_id: number }>> {
  let response: Response
  try {
    response = await fetcher('/api/customer/customer/similarity-search/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
    })
  } catch {
    return { ok: false, error: { kind: 'network', status: 0 } }
  }
  if (response.status !== 202) return decodeProgressionError(response, 'homesick:submit')
  const body = await readJson(response)
  if (!isRecord(body) || !isNonNegativeInteger(body.search_id) || body.search_id < 1) {
    return contractInvalid(response.status, 'homesick:submit')
  }
  return { ok: true, data: { search_id: body.search_id } }
}

export async function patchFavoriteInterval(
  favoriteId: number,
  interval: string,
  fetcher: typeof fetch = fetch,
): Promise<ProgressionResult<{ favorite_id: number; interval: string }>> {
  let response: Response
  try {
    response = await fetcher(`/api/customer/customer/favorites/${favoriteId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interval }),
    })
  } catch {
    return { ok: false, error: { kind: 'network', status: 0 } }
  }
  if (!response.ok) return decodeProgressionError(response, 'product_mail:patch')
  const body = await readJson(response)
  if (!isRecord(body)
    || body.favorite_id !== favoriteId
    || typeof body.interval !== 'string'
    || !['sofort', 'täglich', 'wöchentlich', 'nie'].includes(body.interval)) {
    return contractInvalid(response.status, 'product_mail:patch')
  }
  return { ok: true, data: { favorite_id: body.favorite_id, interval: body.interval } }
}
