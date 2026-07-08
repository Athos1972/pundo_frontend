/**
 * B5900-007 — Pure helpers shared by the city-index pages (/shops/city/[city],
 * /shops/cities) and the shop-detail breadcrumb rücklink (T8).
 *
 * Kept framework-free (no Next.js imports) so they stay trivially unit-testable,
 * matching the pattern already established in src/lib/seo/shop-completeness.ts.
 */
import type { ShopCityItem } from '@/lib/api'

/**
 * Finds the canonical ShopCityItem for a given city slug (used by
 * /shops/city/[city] to resolve the URL slug to a real city name + count).
 */
export function findCityBySlug(cities: ShopCityItem[], slug: string): ShopCityItem | null {
  return cities.find((c) => c.slug === slug) ?? null
}

/**
 * Finds the canonical ShopCityItem for a given city display name (case-insensitive),
 * used by the shop-detail breadcrumb rücklink (T8) to resolve `shop.city` to the
 * matching city-index slug — without re-implementing the backend's slugify()/alias
 * logic. Returns null when the city has no index page yet (e.g. below the backend's
 * min-shop-count threshold), in which case the breadcrumb renders without a link.
 */
export function findCityByName(cities: ShopCityItem[], cityName: string): ShopCityItem | null {
  const needle = cityName.trim().toLowerCase()
  return cities.find((c) => c.city.trim().toLowerCase() === needle) ?? null
}
