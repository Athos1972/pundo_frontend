// ─── Customer App — Server-side API Client ────────────────────────────────────
// IMPORTANT: Server-side only. Reads auth cookie via next/headers.
// For client-side mutations, use /api/customer/[...path] route handler instead.
// NEVER import this file from client components ('use client').

import { cookies } from 'next/headers'
import type { AuthUser, CustomerSession } from '@/types/customer'
import type { Review, ReviewStats } from '@/types/api'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'
const BASE = `${BACKEND}/api/v1`

async function apiFetchCustomer<T>(
  path: string,
  lang: string,
  init?: RequestInit,
): Promise<T> {
  const store = await cookies()
  const token = store.get('customer_token')?.value

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Accept-Language': lang,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (res.status === 403) throw new Error('FORBIDDEN')
  if (!res.ok) throw new Error(`API_ERROR:${res.status}`)

  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function getCustomerMe(lang: string): Promise<AuthUser> {
  return apiFetchCustomer<AuthUser>('/customer/auth/me', lang)
}

/**
 * Returns the current customer session. Never throws — returns unauthenticated
 * session on any auth error so the layout doesn't crash.
 */
export async function getCustomerSession(lang: string): Promise<CustomerSession> {
  try {
    const user = await getCustomerMe(lang)
    return { user, is_authenticated: true }
  } catch {
    return { user: null, is_authenticated: false }
  }
}

// ── Reviews (server-side fetch for SSR) ───────────────────────────────────────

export async function getReviews(
  entityType: 'product' | 'shop',
  entityId: number,
  lang: string,
): Promise<Review[]> {
  const store = await cookies()
  const token = store.get('customer_token')?.value

  const res = await fetch(
    `${BASE}/customer/reviews?entity_type=${entityType}&entity_id=${entityId}`,
    {
      headers: {
        'Accept-Language': lang,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    },
  )
  if (!res.ok) return []
  return res.json() as Promise<Review[]>
}

export async function getReviewStats(
  entityType: 'product' | 'shop',
  entityId: number,
  lang: string,
): Promise<ReviewStats | null> {
  const store = await cookies()
  const token = store.get('customer_token')?.value

  const res = await fetch(
    `${BASE}/customer/reviews/stats?entity_type=${entityType}&entity_id=${entityId}`,
    {
      headers: {
        'Accept-Language': lang,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    },
  )
  if (!res.ok) return null
  return res.json() as Promise<ReviewStats>
}
