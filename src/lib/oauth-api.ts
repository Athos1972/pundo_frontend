// ─── OAuth / MCP API Client ───────────────────────────────────────────────────
// Customer-facing OAuth endpoints.
// Server-side calls use cookie auth (customer_token).
// Client-side calls go through /api/customer proxy or direct with cookie.

import type {
  OAuthAuthorizationContext,
  OAuthDecisionRequest,
  OAuthDecisionResponse,
  OAuthConnectionsResponse,
} from '@/types/customer'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'

// ── Server-side helpers ────────────────────────────────────────────────────────

/**
 * Fetches the OAuth authorization context for the consent screen.
 * Requires Customer cookie. Returns null on 401 (not logged in) or on error.
 * Called from Server Components only.
 */
export async function getAuthorizationContext(
  params: {
    client_id: string
    redirect_uri: string
    scope: string
    state: string
    code_challenge: string
    code_challenge_method: string
  },
  lang: string,
): Promise<OAuthAuthorizationContext | null | 'unauthorized'> {
  const { cookies } = await import('next/headers')
  const store = await cookies()
  const token = store.get('customer_token')?.value

  if (!token) return 'unauthorized'

  const qs = new URLSearchParams({
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    scope: params.scope,
    state: params.state,
    code_challenge: params.code_challenge,
    code_challenge_method: params.code_challenge_method,
  })

  try {
    const res = await fetch(`${BACKEND}/oauth/authorization-context?${qs.toString()}`, {
      headers: {
        'Accept-Language': lang,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    if (res.status === 401) return 'unauthorized'
    if (!res.ok) return null
    return res.json() as Promise<OAuthAuthorizationContext>
  } catch {
    return null
  }
}

/**
 * Fetches the list of active OAuth connections for the current user.
 * Requires Customer cookie.
 * Called from Server Components only.
 */
export async function getOAuthConnections(
  lang: string,
): Promise<OAuthConnectionsResponse | null> {
  const { cookies } = await import('next/headers')
  const store = await cookies()
  const token = store.get('customer_token')?.value

  if (!token) return null

  try {
    const res = await fetch(`${BACKEND}/oauth/clients/me`, {
      headers: {
        'Accept-Language': lang,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) return null
    return res.json() as Promise<OAuthConnectionsResponse>
  } catch {
    return null
  }
}

// ── Client-side helpers ────────────────────────────────────────────────────────

/**
 * Posts the user's allow/deny decision for an OAuth consent request.
 * Called from Client Components only.
 */
export async function postAuthorizationDecision(
  body: OAuthDecisionRequest,
  lang: string,
): Promise<OAuthDecisionResponse> {
  const API_BASE =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? '')
      : BACKEND

  const res = await fetch(`${API_BASE}/oauth/authorization-decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': lang,
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`oauth_decision_failed:${res.status}:${text}`)
  }

  return res.json() as Promise<OAuthDecisionResponse>
}

/**
 * Disconnects (revokes all tokens for) a specific OAuth client for the current user.
 * Called from Client Components only.
 */
export async function disconnectOAuthClient(clientId: string): Promise<void> {
  const API_BASE =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? '')
      : BACKEND

  const res = await fetch(`${API_BASE}/oauth/clients/me/${encodeURIComponent(clientId)}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error(`disconnect_failed:${res.status}`)
  }
}
