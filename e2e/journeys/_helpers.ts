/**
 * Shared E2E journey helpers.
 *
 * shopOwnerLogin — retries on 429 Rate-Limit with exponential backoff + jitter.
 * All journey specs that call /api/v1/shop-owner/login should use this instead
 * of a bare fetch, to prevent flakiness when multiple beforeAll hooks run in
 * parallel (workers: 3) and hit the backend's rate limit of 10 logins/minute.
 */

import fs from 'fs'
import { BACKEND_URL } from '../env'
import { E2E_STATE_FILE } from '../state'


// Backend rate limit: 10 logins per minute (sliding window, per IP).
// With workers:3 and 10+ specs each doing 1-2 logins in beforeAll, bursts are common.
// Strategy: wait long enough that the oldest logins in the burst age out of the 60s window.
// Base delay 20s + jitter 0-10s spreads concurrent retries, reducing collision probability.
const DEFAULT_BASE_DELAY_MS = 20_000
const DEFAULT_MAX_RETRIES = 4

async function loginWithRetry(
  url: string,
  body: Record<string, string>,
  cookieName: string,
  tag: string,
  maxRetries = DEFAULT_MAX_RETRIES,
  baseDelayMs = DEFAULT_BASE_DELAY_MS
): Promise<string> {
  let lastStatus = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })

    if (res.status === 429 && attempt < maxRetries) {
      const jitter = Math.random() * 10_000
      const delay = Math.round(baseDelayMs * Math.pow(1.5, attempt) + jitter)
      console.log(`[e2e-helpers] 429 Rate limit (${tag}) — retry ${attempt + 1}/${maxRetries} in ${delay}ms`)
      await new Promise(r => setTimeout(r, delay))
      lastStatus = 429
      continue
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${tag}: HTTP ${res.status} — ${text}`)
    }

    const cookieHeader = res.headers.get('set-cookie') ?? ''
    const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`))
    if (!match) throw new Error(`${tag}: ${cookieName} not found in Set-Cookie`)
    return match[1]
  }

  throw new Error(`${tag}: still 429 after ${maxRetries} retries (lastStatus=${lastStatus})`)
}

/**
 * POST /api/v1/shop-owner/onboarding with retry on HTTP 429 (5/min per worker/IP).
 * No auth header: internal-key prefixes do NOT bypass rate limits (B6220-001).
 * Backoff is long enough (up to ~7 retries, 15s base x1.5 + jitter) to span the 60s window.
 * Returns the parsed JSON response; throws on any non-OK status.
 */
export async function shopOwnerOnboardWithRetry(
  body: Record<string, unknown>,
  maxRetries = 7,
  baseDelayMs = 15_000
): Promise<Record<string, unknown>> {
  const tag = `shopOwnerOnboard(${String((body as { email?: unknown }).email ?? '')})`
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })

    if (res.status === 429 && attempt < maxRetries) {
      const jitter = Math.random() * 10_000
      const delay = Math.min(Math.round(baseDelayMs * Math.pow(1.5, attempt) + jitter), 60_000)
      console.log(`[e2e-helpers] 429 Rate limit (${tag}) — retry ${attempt + 1}/${maxRetries} in ${delay}ms`)
      await new Promise(r => setTimeout(r, delay))
      continue
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${tag}: HTTP ${res.status} — ${text}`)
    }
    return (await res.json()) as Record<string, unknown>
  }
  throw new Error(`${tag}: still 429 after ${maxRetries} retries`)
}

/**
 * Log in as a shop-owner and return the raw shop_owner_token cookie value.
 * Retries on HTTP 429 with exponential backoff + jitter.
 */
export function shopOwnerLogin(email: string, password: string): Promise<string> {
  return loginWithRetry(
    `${BACKEND_URL}/api/v1/shop-owner/login`,
    { email, password },
    'shop_owner_token',
    `shopOwnerLogin(${email})`
  )
}

/** Admin-Token aus dem globalen Setup (e2e/.test-state.json, ein Login pro Lauf) — vermeidet Login-Bursts. */
function cachedStateAdminToken(): string | undefined {
  try {
    const raw = JSON.parse(fs.readFileSync(E2E_STATE_FILE, 'utf8')) as { adminToken?: string | null }
    return raw.adminToken ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Log in as an admin and return the raw admin_token cookie value.
 * Mit den Default-Credentials wird (B8950-012) zuerst der Admin-Token aus dem globalen Setup wiederverwendet:
 * ~30 beforeAll-Hooks riefen sonst /admin/auth/login auf und rissen das Limit von 10/min — der UI-Login-Test
 * (shop-owner-admin-approval-flow AC-1) lief dadurch in 429. Ein anderer Account loggt weiterhin echt ein.
 * Retries on HTTP 429 with exponential backoff + jitter.
 */
export function adminLogin(
  email = 'e2e-admin@pundo-e2e.io',
  password = 'E2eAdminPassword!99'
): Promise<string> {
  if (email === 'e2e-admin@pundo-e2e.io' && password === 'E2eAdminPassword!99') {
    const cached = cachedStateAdminToken()
    if (cached) return Promise.resolve(cached)
  }
  return loginWithRetry(
    `${BACKEND_URL}/api/v1/admin/auth/login`,
    { email, password },
    'admin_token',
    `adminLogin(${email})`
  )
}

/**
 * Cookie-Header fuer Admin-API-Aufrufe (`admin_token`). Ohne Argument wird der Admin-Token des globalen
 * Setups benutzt (`e2e/.test-state.json`, ein Login pro Lauf). F8950 T30: einzige Definition (vorher 7 Kopien).
 */
export function adminHeaders(token?: string | null): Record<string, string> {
  const t = token ?? cachedStateAdminToken()
  if (!t) throw new Error('adminHeaders: kein Admin-Token (weder uebergeben noch in e2e/.test-state.json)')
  return { Cookie: `admin_token=${t}` }
}

export interface ApiFetchResult {
  ok: boolean
  status: number
  /** Geparster JSON-Body; `{}` bei 204 oder leerem/ungueltigem Body. */
  data: unknown
}

/**
 * fetch gegen das Test-Backend. `urlPath` ist ein Pfad (`/api/v1/...`) oder eine absolute URL. Body (falls
 * gesetzt) wird als JSON gesendet. F8950 T30: einzige Definition (vorher 9 Kopien).
 */
export async function apiFetch(
  method: string,
  urlPath: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<ApiFetchResult> {
  const url = urlPath.startsWith('http') ? urlPath : `${BACKEND_URL}${urlPath}`
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json', ...headers } : headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  let data: unknown = {}
  try { if (res.status !== 204) data = await res.json() } catch { /* leerer Body */ }
  return { ok: res.ok, status: res.status, data }
}
