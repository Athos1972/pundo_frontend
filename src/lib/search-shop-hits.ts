import { getShops } from '@/lib/api'
import type { ShopListItem } from '@/types/api'
import { DISTANCE_MAX_KM, DISTANCE_MIN_KM, DISTANCE_STEP_KM } from '@/components/search/DistanceSlider'

/** Shop cards shown in the search result list. */
export const SHOP_HITS_SHOWN = 3
/** One more than shown, so a fourth hit proves "there are more" even without `total`. */
export const SHOP_HITS_LIMIT = 4

export interface ShopHits {
  /** At most SHOP_HITS_SHOWN shops inside the radius, in backend order (relevance, then distance). */
  items: ShopListItem[]
  /** Hits inside the radius: response `total`, else the number of returned items. */
  total: number
  /** Only set when nothing matches inside the radius but shops match outside of it. */
  outside: { count: number; nearestKm: number | null } | null
}

export const EMPTY_SHOP_HITS: ShopHits = { items: [], total: 0, outside: null }

interface FetchShopHitsParams {
  q: string
  lat: number | undefined
  lng: number | undefined
  maxDistKm: number
  includeOnline: boolean
  lang: string
}

/**
 * Shop name hits for the search page (text mode).
 *
 * R1 asks inside the radius. Only if R1 is empty, R2 asks without radius to learn how many
 * shops match outside of it and how far the nearest of the most relevant ones is.
 * Never throws: any failure yields EMPTY_SHOP_HITS (the shop section simply stays away).
 */
export async function fetchShopHits(p: FetchShopHitsParams): Promise<ShopHits> {
  const hasCoords = p.lat != null && p.lng != null
  const base = {
    q: p.q,
    status: 'active',
    limit: SHOP_HITS_LIMIT,
    ...(hasCoords ? { lat: p.lat, lng: p.lng } : {}),
    ...(p.includeOnline ? {} : { is_online_only: false }),
  }
  try {
    const inside = await getShops({ ...base, ...(hasCoords ? { max_dist_km: p.maxDistKm } : {}) }, p.lang)
    if (inside.items.length > 0) {
      return {
        items: inside.items.slice(0, SHOP_HITS_SHOWN),
        total: inside.total ?? inside.items.length,
        outside: null,
      }
    }
    if (!hasCoords) return EMPTY_SHOP_HITS
    const all = await getShops(base, p.lang)
    if (all.items.length === 0) return EMPTY_SHOP_HITS
    const dists = all.items.map(s => s.dist_km).filter((d): d is number => d != null)
    return {
      items: [],
      total: 0,
      outside: {
        count: all.total ?? all.items.length,
        nearestKm: dists.length > 0 ? Math.min(...dists) : null,
      },
    }
  } catch {
    return EMPTY_SHOP_HITS
  }
}

/**
 * Radius (km) that makes the nearest outside hit visible: rounded up to the slider step and
 * clamped to the slider range. null when there is nothing to expand (no distance known, or the
 * slider is already at its maximum).
 */
export function expandRadiusTarget(nearestKm: number | null, currentKm: number): number | null {
  if (nearestKm == null || currentKm >= DISTANCE_MAX_KM) return null
  const stepped = Math.ceil(nearestKm / DISTANCE_STEP_KM) * DISTANCE_STEP_KM
  return Math.min(DISTANCE_MAX_KM, Math.max(DISTANCE_MIN_KM, stepped))
}
