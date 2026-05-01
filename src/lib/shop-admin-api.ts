// ─── Shop-Owner Portal — Server-side API Client ───────────────────────────────
// IMPORTANT: This file is server-side only. It reads the auth cookie via next/headers.
// For client-side mutations, use /api/shop-admin/[...path] route handler instead.
// NEVER import this file from client components ('use client').

import { cookies } from 'next/headers'
import type {
  ShopOwner,
  AdminShop,
  OpeningHours,
  AdminOfferList,
  AdminShopListingList,
  AdminShopListing,
  AdminItem,
  ItemSearchResult,
  ItemType,
  ApiKey,
  ImportStatus,
  PriceUnitOption,
} from '@/types/shop-admin'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'
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

// ─── Items ───────────────────────────────────────────────────────────────────

/** Search items (for ItemPickerModal) — GET /api/v1/shop-owner/items */
export async function searchItems(
  params: { q?: string; ean?: string; limit?: number },
  lang: string,
): Promise<ItemSearchResult[]> {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.ean) qs.set('ean', params.ean)
  if (params.limit != null) qs.set('limit', String(params.limit))
  const q = qs.toString()
  return apiFetchAdmin<ItemSearchResult[]>(`/items${q ? `?${q}` : ''}`, lang)
}

/** Create a new item — POST /api/v1/shop-owner/items */
export async function createItem(
  data: { name_de: string; item_type: ItemType; category_id: number; ean?: string; brand_id?: number },
  lang: string,
): Promise<AdminItem> {
  return apiFetchAdmin<AdminItem>('/items', lang, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── ShopListings ─────────────────────────────────────────────────────────────

/** List shop listings for the authenticated shop — GET /api/v1/shop-owner/shop-listings */
export async function getAdminShopListings(
  params: { q?: string; limit?: number; offset?: number },
  lang: string,
): Promise<AdminShopListingList> {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const q = qs.toString()
  return apiFetchAdmin<AdminShopListingList>(`/shop-listings${q ? `?${q}` : ''}`, lang)
}

/** Create a ShopListing after item selection — POST /api/v1/shop-owner/shop-listings */
export async function createShopListing(
  data: { item_id: number; sku?: string; shop_url?: string },
  lang: string,
): Promise<AdminShopListing> {
  return apiFetchAdmin<AdminShopListing>('/shop-listings', lang, {
    method: 'POST',
    body: JSON.stringify(data),
  })
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
  const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'
  const res = await fetch(`${BACKEND}/api/v1/price-units`, {
    headers: { 'Accept-Language': lang },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<PriceUnitOption[]>
}

// Note: uploadShopLogo is intentionally NOT in this server-side file.
// Client-side logo uploads go directly through fetch('/api/shop-admin/shop/logo')
// in LogoUpload.tsx — same pattern as ImportPanel.tsx.
// The catch-all proxy at /api/shop-admin/[...path]/route.ts handles auth attachment.

// Categories are shared data needed for admin product forms.
// Fetched via the public /categories endpoint (no auth required).
export async function getAdminCategories(lang: string): Promise<{ id: number; name: string }[]> {
  const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8500'
  const res = await fetch(`${BACKEND}/api/v1/categories?limit=200`, {
    headers: { 'Accept-Language': lang },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json() as { items?: { id: number; name?: string | null }[] }
  return (data.items ?? []).map((c) => ({ id: c.id, name: c.name ?? '' }))
}
