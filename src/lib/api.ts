import type {
  ProductListResponse, ProductDetailResponse,
  ShopListResponse, ShopDetailResponse,
  CategoryListResponse,
  ShopReviewPreview,
  ShopOffer,
  SearchResponse,
} from '@/types/api';

// Server Components (SSR/Node.js) brauchen absolute URLs — BACKEND_URL wird
// server-seitig aus der Umgebung gelesen und ist nie im Browser sichtbar.
// Im Browser wird NEXT_PUBLIC_API_URL (relativ, geht durch Caddy/Next-Rewrite) verwendet.
const BASE =
  typeof window === 'undefined'
    ? `${process.env.BACKEND_URL ?? 'http://localhost:8500'}/api/v1`
    : (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1');

async function apiFetch<T>(path: string, lang: string, init?: RequestInit): Promise<T> {
  // Only apply the default revalidate when the caller hasn't explicitly set cache/revalidate.
  // next.revalidate and cache:'no-store' are mutually exclusive in Next.js — the revalidate
  // wins and silently ignores 'no-store', causing stale data to be served.
  const defaults: RequestInit = init?.cache ? {} : { next: { revalidate: 3600 } };
  const res = await fetch(`${BASE}${path}`, {
    ...defaults,
    ...init,
    headers: { 'Accept-Language': lang, ...(init?.headers ?? {}) },
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
  return apiFetch<ProductListResponse>(`/products${q ? `?${q}` : ''}`, lang);
}

/**
 * Unified search — returns products AND service categories in a single response.
 * Service results carry result_type='service' with category_id and provider_count.
 * Product results carry result_type='product' with the same fields as ProductListItem.
 *
 * Backend: GET /api/v1/search (F5910 Service-Discovery-Bridge)
 */
export async function searchAll(
  params: {
    q: string;
    lat?: number;
    lng?: number;
    bbox?: string;  // 'lat_min,lng_min,lat_max,lng_max' — map viewport for provider_count
    limit?: number;
    offset?: number;
  },
  lang: string
): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  qs.set('q', params.q);
  if (params.lat != null) qs.set('lat', String(params.lat));
  if (params.lng != null) qs.set('lng', String(params.lng));
  if (params.bbox) qs.set('bbox', params.bbox);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  return apiFetch<SearchResponse>(`/search?${qs.toString()}`, lang, { cache: 'no-store' });
}

export async function getProduct(slug: string, lang: string): Promise<ProductDetailResponse> {
  // no-store: promo prices are dynamic and must always be fresh (same reasoning as getShopOffers)
  return apiFetch<ProductDetailResponse>(`/products/by-slug/${slug}`, lang, { cache: 'no-store' });
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
    /** F5910: filter shops to those offering the given UNSPSC service category (via onboarding mapping) */
    service_category_id?: number;
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
  if (params.service_category_id != null) qs.set('service_category_id', String(params.service_category_id));
  const q = qs.toString();
  return apiFetch<ShopListResponse>(`/shops${q ? `?${q}` : ''}`, lang);
}

export async function getShop(slug: string, lang: string): Promise<ShopDetailResponse> {
  // cache: 'no-store' — shop profile fields (website_url, description, opening hours,
  // spoken_languages, social_links) are frequently updated by shop owners.
  // The default revalidate: 3600 would serve stale data for up to 1 hour after an
  // owner saves their profile, breaking both E2E tests and the real user experience.
  // (Same reasoning as getShopOffers — see SP4 fix 2026-05-03.)
  return apiFetch<ShopDetailResponse>(`/shops/by-slug/${slug}`, lang, {
    cache: 'no-store',
  });
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
  params: { parent_id?: number; taxonomy_type?: string; q?: string; limit?: number; only_with_products?: boolean; ids?: number[] } = {},
  lang: string
): Promise<CategoryListResponse> {
  const qs = new URLSearchParams();
  if (params.parent_id != null) qs.set('parent_id', String(params.parent_id));
  if (params.taxonomy_type) qs.set('taxonomy_type', params.taxonomy_type);
  if (params.q) qs.set('q', params.q);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.only_with_products) qs.set('only_with_products', 'true');
  if (params.ids && params.ids.length > 0) {
    params.ids.forEach(id => qs.append('ids', String(id)));
  }
  const q = qs.toString();
  return apiFetch<CategoryListResponse>(`/categories${q ? `?${q}` : ''}`, lang);
}

export async function getShopOffers(slug: string, lang: string): Promise<ShopOffer[]> {
  try {
    // cache: 'no-store' — offers are dynamic pricing data, must always be fresh.
    // The default revalidate: 3600 in apiFetch would serve stale offers for 1h,
    // breaking tests that create offers and immediately check visibility.
    return await apiFetch<ShopOffer[]>(`/shops/by-slug/${slug}/offers`, lang, {
      cache: 'no-store',
    });
  } catch {
    return [];
  }
}

export interface RelatedShopItem {
  id: number
  slug: string
  name: string | null
  shop_type: { id: number; canonical: string; name: string } | null
  images: Array<{ url: string }> | null
  city: string | null
  review_stats: { average_stars: number; total_count: number } | null
}

export interface RelatedShopsResponse {
  items: RelatedShopItem[]
}

export async function getRelatedShops(
  slug: string,
  lang: string
): Promise<RelatedShopsResponse> {
  try {
    return await apiFetch<RelatedShopsResponse>(
      `/shops/by-slug/${slug}/related`,
      lang
    )
  } catch {
    return { items: [] }
  }
}

export async function getRelatedCategories(
  id: number,
  lang: string,
  limit = 6
): Promise<CategoryListResponse> {
  return apiFetch<CategoryListResponse>(`/categories/${id}/related-with-products?limit=${limit}`, lang);
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
