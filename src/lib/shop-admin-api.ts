// ─── Shop-Owner Portal — Server-side API Client ───────────────────────────────
// IMPORTANT: This file is server-side only. It reads the auth cookie via next/headers.
// For client-side mutations, use /api/shop-admin/[...path] route handler instead.
// NEVER import this file from client components ('use client').

import { cookies } from 'next/headers'
import type {
  ShopOwner,
  AdminShop,
  OpeningHours,
  AdminProductList,
  AdminOfferList,
  ApiKey,
  ImportStatus,
  PriceUnitOption,
} from '@/types/shop-admin'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'
const BASE = `${BACKEND}/api/v1/shop-owner`

async function apiFetchAdmin<T>(
  path: string,
  lang: string,
  init?: RequestInit,
): Promise<T> {
  const store = await cookies()
  const token = store.get('shop_owner_token')?.value

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

export async function getMe(lang: string): Promise<ShopOwner> {
  return apiFetchAdmin<ShopOwner>('/me', lang)
}

export async function getAdminShop(lang: string): Promise<AdminShop> {
  return apiFetchAdmin<AdminShop>('/shop', lang)
}

export async function getOpeningHours(lang: string): Promise<OpeningHours[]> {
  return apiFetchAdmin<OpeningHours[]>('/shop/hours', lang)
}

export async function getAdminProducts(
  lang: string,
  params: { q?: string; limit?: number; offset?: number } = {},
): Promise<AdminProductList> {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const q = qs.toString()
  return apiFetchAdmin<AdminProductList>(`/products${q ? `?${q}` : ''}`, lang)
}

export async function getAdminOffers(
  lang: string,
  params: { archived?: boolean; limit?: number; offset?: number } = {},
): Promise<AdminOfferList> {
  const qs = new URLSearchParams()
  if (params.archived != null) qs.set('archived', String(params.archived))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const q = qs.toString()
  return apiFetchAdmin<AdminOfferList>(`/offers${q ? `?${q}` : ''}`, lang)
}

export async function getApiKeys(lang: string): Promise<ApiKey[]> {
  return apiFetchAdmin<ApiKey[]>('/api-keys', lang)
}

export async function getImportStatus(lang: string): Promise<ImportStatus> {
  return apiFetchAdmin<ImportStatus>('/import/status', lang)
}

export async function getAdminPriceUnits(lang: string): Promise<PriceUnitOption[]> {
  const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'
  const res = await fetch(`${BACKEND}/api/v1/price-units`, {
    headers: { 'Accept-Language': lang },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<PriceUnitOption[]>
}

// Categories are shared data needed for admin product forms.
// Fetched via the public /categories endpoint (no auth required).
export async function getAdminCategories(lang: string): Promise<{ id: number; name: string }[]> {
  const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'
  const res = await fetch(`${BACKEND}/api/v1/categories?limit=200`, {
    headers: { 'Accept-Language': lang },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json() as { items?: { id: number; name?: string | null }[] }
  return (data.items ?? []).map((c) => ({ id: c.id, name: c.name ?? '' }))
}
