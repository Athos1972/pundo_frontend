import type {
  ProductListResponse, ProductDetailResponse,
  ShopListResponse, ShopDetailResponse,
  CategoryListResponse,
} from '@/types/api';

// Server Components (SSR/Node.js) brauchen absolute URLs — BACKEND_URL wird
// server-seitig aus der Umgebung gelesen und ist nie im Browser sichtbar.
// Im Browser wird NEXT_PUBLIC_API_URL (relativ, geht durch Caddy/Next-Rewrite) verwendet.
const BASE =
  typeof window === 'undefined'
    ? `${process.env.BACKEND_URL ?? 'http://localhost:8000'}/api/v1`
    : (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1');

async function apiFetch<T>(path: string, lang: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Accept-Language': lang, ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function searchProducts(
  params: { q?: string; category_id?: number; shop_id?: number; available?: boolean; lat?: number; lng?: number; limit?: number; offset?: number },
  lang: string
): Promise<ProductListResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.category_id != null) qs.set('category_id', String(params.category_id));
  if (params.shop_id != null) qs.set('shop_id', String(params.shop_id));
  if (params.available) qs.set('available', 'true');
  if (params.lat != null) qs.set('lat', String(params.lat));
  if (params.lng != null) qs.set('lng', String(params.lng));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const q = qs.toString();
  return apiFetch<ProductListResponse>(`/products${q ? `?${q}` : ''}`, lang, { cache: 'no-store' });
}

export async function getProduct(slug: string, lang: string): Promise<ProductDetailResponse> {
  return apiFetch<ProductDetailResponse>(`/products/by-slug/${slug}`, lang);
}

export async function getShops(
  params: { q?: string; lat?: number; lng?: number; limit?: number; offset?: number } = {},
  lang: string
): Promise<ShopListResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.lat != null) qs.set('lat', String(params.lat));
  if (params.lng != null) qs.set('lng', String(params.lng));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const q = qs.toString();
  return apiFetch<ShopListResponse>(`/shops${q ? `?${q}` : ''}`, lang, { cache: 'no-store' });
}

export async function getShop(id: number, lang: string): Promise<ShopDetailResponse> {
  return apiFetch<ShopDetailResponse>(`/shops/${id}`, lang);
}

export async function getCategories(
  params: { parent_id?: number; taxonomy_type?: string; q?: string; limit?: number; only_with_products?: boolean } = {},
  lang: string
): Promise<CategoryListResponse> {
  const qs = new URLSearchParams();
  if (params.parent_id != null) qs.set('parent_id', String(params.parent_id));
  if (params.taxonomy_type) qs.set('taxonomy_type', params.taxonomy_type);
  if (params.q) qs.set('q', params.q);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.only_with_products) qs.set('only_with_products', 'true');
  const q = qs.toString();
  return apiFetch<CategoryListResponse>(`/categories${q ? `?${q}` : ''}`, lang);
}
