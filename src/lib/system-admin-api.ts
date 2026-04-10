// ─── System-Admin — Server-side API Client ────────────────────────────────────
// IMPORTANT: Server-side only. Reads the admin_token cookie via next/headers.
// For client-side mutations, use /api/admin/[...path] route handler instead.
// NEVER import this file from client components ('use client').

import { cookies } from 'next/headers'
import type {
  SysAdminUser,
  PaginatedResponse,
  SysAdminShop,
  SysAdminShopType,
  SysAdminShopOwner,
  SysAdminProduct,
  SysAdminProductAttribute,
  SysAdminCategory,
  SysAdminCategoryAttributeDef,
  SysAdminCategoryTranslation,
  SysAdminBrand,
  SysAdminOffer,
  SysAdminShopOwnerOffer,
  SysAdminApiKey,
} from '@/types/system-admin'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'
const BASE = `${BACKEND}/api/v1/admin`

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const store = await cookies()
  const token = store.get('admin_token')?.value

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
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

function buildQs(params: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export async function getAdminMe(): Promise<SysAdminUser> {
  return apiFetch<SysAdminUser>('/auth/me')
}

// ─── Shops ─────────────────────────────────────────────────────────────────────
export async function getShops(
  params: { q?: string; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<SysAdminShop>> {
  return apiFetch<PaginatedResponse<SysAdminShop>>(`/shops${buildQs(params)}`)
}

export async function getShop(id: number): Promise<SysAdminShop> {
  return apiFetch<SysAdminShop>(`/shops/${id}`)
}

// ─── Shop Types ────────────────────────────────────────────────────────────────
export async function getShopTypes(
  params: { q?: string; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<SysAdminShopType>> {
  return apiFetch<PaginatedResponse<SysAdminShopType>>(`/shop-types${buildQs(params)}`)
}

export async function getShopType(id: number): Promise<SysAdminShopType> {
  return apiFetch<SysAdminShopType>(`/shop-types/${id}`)
}

// ─── Shop Owners ───────────────────────────────────────────────────────────────
export async function getShopOwners(
  params: { q?: string; status?: string; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<SysAdminShopOwner>> {
  return apiFetch<PaginatedResponse<SysAdminShopOwner>>(`/shop-owners${buildQs(params)}`)
}

export async function getShopOwner(id: number): Promise<SysAdminShopOwner> {
  return apiFetch<SysAdminShopOwner>(`/shop-owners/${id}`)
}

// ─── Products ──────────────────────────────────────────────────────────────────
export async function getProducts(
  params: { q?: string; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<SysAdminProduct>> {
  return apiFetch<PaginatedResponse<SysAdminProduct>>(`/products${buildQs(params)}`)
}

export async function getProduct(id: number): Promise<SysAdminProduct> {
  return apiFetch<SysAdminProduct>(`/products/${id}`)
}

export async function getProductAttributes(productId: number): Promise<SysAdminProductAttribute[]> {
  return apiFetch<SysAdminProductAttribute[]>(`/products/${productId}/attributes`)
}

// ─── Categories ────────────────────────────────────────────────────────────────
export async function getCategories(
  params: { q?: string; parent_id?: number | null; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<SysAdminCategory>> {
  return apiFetch<PaginatedResponse<SysAdminCategory>>(`/categories${buildQs(params)}`)
}

export async function getCategory(id: number): Promise<SysAdminCategory> {
  return apiFetch<SysAdminCategory>(`/categories/${id}`)
}

export async function getCategoryAttributeDefs(
  categoryId: number,
): Promise<SysAdminCategoryAttributeDef[]> {
  return apiFetch<SysAdminCategoryAttributeDef[]>(`/categories/${categoryId}/attribute-definitions`)
}

export async function getCategoryTranslations(
  categoryId: number,
): Promise<SysAdminCategoryTranslation[]> {
  return apiFetch<SysAdminCategoryTranslation[]>(`/categories/${categoryId}/translations`)
}

// ─── Brands ────────────────────────────────────────────────────────────────────
export async function getBrands(
  params: { q?: string; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<SysAdminBrand>> {
  return apiFetch<PaginatedResponse<SysAdminBrand>>(`/brands${buildQs(params)}`)
}

export async function getBrand(id: number): Promise<SysAdminBrand> {
  return apiFetch<SysAdminBrand>(`/brands/${id}`)
}

// ─── Offers ────────────────────────────────────────────────────────────────────
export async function getOffers(
  params: { q?: string; shop_id?: number; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<SysAdminOffer>> {
  return apiFetch<PaginatedResponse<SysAdminOffer>>(`/offers${buildQs(params)}`)
}

export async function getOffer(id: number): Promise<SysAdminOffer> {
  return apiFetch<SysAdminOffer>(`/offers/${id}`)
}

// ─── Shop Owner Offers ─────────────────────────────────────────────────────────
export async function getShopOwnerOffers(
  params: { q?: string; shop_id?: number; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<SysAdminShopOwnerOffer>> {
  return apiFetch<PaginatedResponse<SysAdminShopOwnerOffer>>(`/shop-owner-offers${buildQs(params)}`)
}

export async function getShopOwnerOffer(id: number): Promise<SysAdminShopOwnerOffer> {
  return apiFetch<SysAdminShopOwnerOffer>(`/shop-owner-offers/${id}`)
}

// ─── API Keys ──────────────────────────────────────────────────────────────────
export async function getApiKeys(
  params: { q?: string; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<SysAdminApiKey>> {
  return apiFetch<PaginatedResponse<SysAdminApiKey>>(`/api-keys${buildQs(params)}`)
}

// ─── Helper lists for form selects ────────────────────────────────────────────
export async function getAllShopTypes(): Promise<SysAdminShopType[]> {
  const res = await getShopTypes({ limit: 200 })
  return res.items
}

export async function getAllCategories(): Promise<SysAdminCategory[]> {
  const res = await getCategories({ limit: 500 })
  return res.items
}

export async function getAllBrands(): Promise<SysAdminBrand[]> {
  const res = await getBrands({ limit: 500 })
  return res.items
}

export async function getAllShops(): Promise<SysAdminShop[]> {
  const res = await getShops({ limit: 500 })
  return res.items
}

export async function getAllProducts(): Promise<SysAdminProduct[]> {
  const res = await getProducts({ limit: 500 })
  return res.items
}
