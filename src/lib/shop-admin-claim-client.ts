// ─── Shop-Admin — Claim (F5970): client-side API ──────────────────────────────
// Browser-side fetches through the same-origin proxy /api/shop-admin/claim/... (no next/headers here).
// The access token of an application is kept in sessionStorage and sent as `X-Claim-Token`; it is never put in a
// URL by this module, never logged, and never stored in localStorage.
// Part of the Shop-Admin Clean Boundary: no imports from customer-facing code.

import type {
  ClaimCandidate,
  ClaimCreateResponse,
  ClaimMatchRequest,
  ClaimStatusResponse,
} from '@/types/shop-admin'

const BASE = '/api/shop-admin/claim'

/** A refused claim API call. `code` is the backend error code (or `captcha_failed`, `network`, `unknown`). */
export class ClaimApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly extra: Record<string, unknown> = {},
  ) {
    super(code)
    this.name = 'ClaimApiError'
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T
  const body = (await res.json().catch(() => ({}))) as { detail?: unknown }
  const detail = body.detail
  // slowapi answers a rate-limited request with {"error": "..."} (no `detail`)
  if (detail === undefined && res.status === 429) throw new ClaimApiError(429, 'rate_limited')
  if (typeof detail === 'string') throw new ClaimApiError(res.status, detail)
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const { code, ...extra } = detail as { code?: string } & Record<string, unknown>
    throw new ClaimApiError(res.status, typeof code === 'string' ? code : 'unknown', extra)
  }
  throw new ClaimApiError(res.status, 'unknown')
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, init)
  } catch {
    throw new ClaimApiError(0, 'network')
  }
  return parse<T>(res)
}

const tokenHeader = (token: string): Record<string, string> => ({ 'X-Claim-Token': token })

const MATCH_TIMEOUT_MS = 4000

/**
 * Wizard: existing shops the user may mean (AR5). Never throws and never hangs -- a failed or slow lookup must not
 * block the wizard (4 s timeout, then "no candidates").
 */
export async function matchClaimCandidates(body: ClaimMatchRequest, lang: string): Promise<ClaimCandidate[]> {
  try {
    const res = await call<{ candidates: ClaimCandidate[] }>('/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
      body: JSON.stringify(body),
      ...(typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? { signal: AbortSignal.timeout(MATCH_TIMEOUT_MS) } : {}),
    })
    return res.candidates
  } catch {
    return []
  }
}

/** Create an application (multipart). Resolves for 200 (existing) and 201 (new). */
export function createClaimRequest(form: FormData): Promise<ClaimCreateResponse> {
  return call<ClaimCreateResponse>('/requests', { method: 'POST', body: form })
}

export function getClaimStatus(id: number, token: string): Promise<ClaimStatusResponse> {
  return call<ClaimStatusResponse>(`/requests/${id}`, { method: 'GET', headers: tokenHeader(token), cache: 'no-store' })
}

export function sendClaimCode(id: number, token: string): Promise<ClaimStatusResponse> {
  return call<ClaimStatusResponse>(`/requests/${id}/send-code`, { method: 'POST', headers: tokenHeader(token) })
}

export function verifyClaimCode(id: number, token: string, code: string): Promise<ClaimStatusResponse> {
  return call<ClaimStatusResponse>(`/requests/${id}/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tokenHeader(token) },
    body: JSON.stringify({ code }),
  })
}

export function withdrawClaim(id: number, token: string): Promise<ClaimStatusResponse> {
  return call<ClaimStatusResponse>(`/requests/${id}/withdraw`, { method: 'POST', headers: tokenHeader(token) })
}

// ─── Access token storage (sessionStorage, per application) ──────────────────

const tokenKey = (id: number) => `claim:${id}`

export function saveClaimToken(id: number, token: string): void {
  try {
    window.sessionStorage.setItem(tokenKey(id), token)
  } catch {
    /* storage blocked: the status page then asks for the mail link again */
  }
}

export function loadClaimToken(id: number): string | null {
  try {
    return window.sessionStorage.getItem(tokenKey(id))
  } catch {
    return null
  }
}

export function clearClaimToken(id: number): void {
  try {
    window.sessionStorage.removeItem(tokenKey(id))
  } catch {
    /* ignore */
  }
}
