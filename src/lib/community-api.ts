// ─── Community API Client ─────────────────────────────────────────────────────
// Public reads: work server-side (via BACKEND_URL) and client-side (via /api/v1).
// Auth'd reads (trust profile): server-side only via customer-api.ts pattern.
// Mutations (vote upsert/delete): client-side via /api/customer/... proxy.

import type { ShopVotesResponse, TrustProfileResponse, VoteUpsertResponse, AttributeType } from '@/types/api'

const SERVER_BASE = `${process.env.BACKEND_URL ?? 'http://localhost:8500'}/api/v1`
const CLIENT_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1')

function apiBase(): string {
  return typeof window === 'undefined' ? SERVER_BASE : CLIENT_BASE
}

// ── Public: shop vote aggregates (server + client) ────────────────────────────

export async function getShopVotes(shopId: number, lang: string): Promise<ShopVotesResponse> {
  const res = await fetch(`${apiBase()}/shops/${shopId}/votes`, {
    headers: { 'Accept-Language': lang },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`community_votes ${res.status}`)
  return res.json() as Promise<ShopVotesResponse>
}

// ── Server-side: trust profile (requires auth cookie via next/headers) ─────────

export async function getTrustProfile(lang: string): Promise<TrustProfileResponse | null> {
  const { cookies } = await import('next/headers')
  const store = await cookies()
  const token = store.get('customer_token')?.value
  if (!token) return null

  try {
    const res = await fetch(`${SERVER_BASE}/customer/me/trust-profile`, {
      headers: {
        'Accept-Language': lang,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json() as Promise<TrustProfileResponse>
  } catch {
    return null
  }
}

// ── Client-side mutations (proxy through /api/customer/...) ───────────────────

export async function submitVote(
  shopId: number,
  attributeType: AttributeType,
  value: number,
  lang: string,
): Promise<VoteUpsertResponse> {
  const res = await fetch(`/api/customer/customer/shops/${shopId}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
    body: JSON.stringify({ attribute_type: attributeType, value }),
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`vote_submit ${res.status}`)
  return res.json() as Promise<VoteUpsertResponse>
}

export async function deleteVote(
  shopId: number,
  attributeType: AttributeType,
  lang: string,
): Promise<void> {
  const res = await fetch(`/api/customer/customer/shops/${shopId}/votes/${attributeType}`, {
    method: 'DELETE',
    headers: { 'Accept-Language': lang },
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (res.status === 204) return
  if (!res.ok) throw new Error(`vote_delete ${res.status}`)
}
