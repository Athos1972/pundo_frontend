/**
 * Shared E2E journey helpers.
 *
 * shopOwnerLogin — retries on 429 Rate-Limit with exponential backoff + jitter.
 * All journey specs that call /api/v1/shop-owner/login should use this instead
 * of a bare fetch, to prevent flakiness when multiple beforeAll hooks run in
 * parallel (workers: 3) and hit the backend's rate limit of 10 logins/minute.
 */

const BACKEND_URL =
  process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'

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

/**
 * Log in as an admin and return the raw admin_token cookie value.
 * Retries on HTTP 429 with exponential backoff + jitter.
 */
export function adminLogin(
  email = 'e2e-admin@pundo-e2e.io',
  password = 'E2eAdminPassword!99'
): Promise<string> {
  return loginWithRetry(
    `${BACKEND_URL}/api/v1/admin/auth/login`,
    { email, password },
    'admin_token',
    `adminLogin(${email})`
  )
}
