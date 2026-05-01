import type {
  ProductListResponse, ProductDetailResponse,
  ShopListResponse, ShopDetailResponse,
  CategoryListResponse,
  ShopReviewPreview,
  ShopOffer,
} from '@/types/api';

// Server Components (SSR/Node.js) brauchen absolute URLs — BACKEND_URL wird
// server-seitig aus der Umgebung gelesen und ist nie im Browser sichtbar.
// Im Browser wird NEXT_PUBLIC_API_URL (relativ, geht durch Caddy/Next-Rewrite) verwendet.
const BASE =
  typeof window === 'undefined'
    ? `${process.env.BACKEND_URL ?? 'http://localhost:8500'}/api/v1`
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
  params: { q?: string; category_id?: number; shop_id?: number; available?: boolean; lat?: number; lng?: number; max_dist_km?: number; limit?: number; offset?: number },
  lang: string
): Promise<ProductListResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.category_id != null) qs.set('category_id', String(params.category_id));
  if (params.shop_id != null) qs.set('shop_id', String(params.shop_id));
  if (params.available) qs.set('available', 'true');
  if (params.lat != null) qs.set('lat', String(params.lat));
  if (params.lng != null) qs.set('lng', String(params.lng));
  if (params.max_dist_km != null) qs.set('max_dist_km', String(params.max_dist_km));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const q = qs.toString();
  return apiFetch<ProductListResponse>(`/products${q ? `?${q}` : ''}`, lang, { cache: 'no-store' });
}

export async function getProduct(slug: string, lang: string): Promise<ProductDetailResponse> {
  return apiFetch<ProductDetailResponse>(`/products/by-slug/${slug}`, lang);
}

/**
 * Fetches products related to the given product slug.
 * The backend ranks results by: same brand+category first, then same category,
 * sorted by offer count descending. The current product is excluded server-side.
 */
export async function getRelatedProducts(
  slug: string,
  lang: string,
  limit = 8
): Promise<ProductListResponse> {
  return apiFetch<ProductListResponse>(`/products/${slug}/related?limit=${limit}`, lang);
}

export async function getShops(
  params: {
    q?: string; lat?: number; lng?: number; limit?: number; offset?: number; status?: string;
    shop_type_id?: number; open_now?: boolean; max_dist_km?: number;
    spoken_languages?: string; has_parking?: boolean; has_own_delivery?: boolean; is_online_only?: boolean;
  } = {},
  lang: string
): Promise<ShopListResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.lat != null) qs.set('lat', String(params.lat));
  if (params.lng != null) qs.set('lng', String(params.lng));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  if (params.status) qs.set('status', params.status);
  if (params.shop_type_id != null) qs.set('shop_type_id', String(params.shop_type_id));
  if (params.open_now) qs.set('open_now', 'true');
  if (params.max_dist_km != null) qs.set('max_dist_km', String(params.max_dist_km));
  if (params.spoken_languages) qs.set('spoken_languages', params.spoken_languages);
  if (params.has_parking != null) qs.set('has_parking', String(params.has_parking));
  if (params.has_own_delivery != null) qs.set('has_own_delivery', String(params.has_own_delivery));
  if (params.is_online_only != null) qs.set('is_online_only', String(params.is_online_only));
  const q = qs.toString();
  return apiFetch<ShopListResponse>(`/shops${q ? `?${q}` : ''}`, lang, { cache: 'no-store' });
}

export async function getShop(slug: string, lang: string): Promise<ShopDetailResponse> {
  return apiFetch<ShopDetailResponse>(`/shops/by-slug/${slug}`, lang);
}

export interface SitemapSlugsResponse {
  products: { slug: string }[];
  shops: { slug: string; last_scraped: string | null }[];
}

// Wird ausschliesslich von sitemap.ts aufgerufen — liefert alle product/shop
// slugs in einem Request, damit die Sitemap-Regeneration nicht ~320 paginierte
// Calls ins Backend ballert. Siehe auch: ingestor/api/sitemap.py.
export async function getSitemapSlugs(): Promise<SitemapSlugsResponse> {
  return apiFetch<SitemapSlugsResponse>('/sitemap/slugs', 'en');
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

export async function getShopOffers(slug: string, lang: string): Promise<ShopOffer[]> {
  try {
    return await apiFetch<ShopOffer[]>(`/shops/by-slug/${slug}/offers`, lang);
  } catch {
    return [];
  }
}

export async function getShopReviews(
  shopId: number,
  lang: string,
  limit = 3
): Promise<ShopReviewPreview[]> {
  try {
    const data = await apiFetch<{ reviews: ShopReviewPreview[] }>(
      `/shops/${shopId}/reviews?limit=${limit}`,
      lang
    );
    return data.reviews ?? [];
  } catch {
    return [];
  }
}
