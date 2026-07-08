/**
 * B5900-006 — Explicit "shop complete enough to index" criterion.
 *
 * Replaces the previous implicit behaviour where a thrown/failed
 * generateMetadata() call (or a downstream helper crashing on `name: null`)
 * accidentally fell back to a generic `{ title: 'Shop' }` with no `robots`
 * field, letting Next.js/layout defaults decide indexability at random.
 *
 * Pure, framework-free functions — no React/Next imports — so they stay
 * trivially unit-testable.
 */

import type { ShopDetailResponse } from '@/types/api'

/**
 * A shop is considered "complete enough to index" when ALL of the following
 * hold (see 02-architecture.md §4 for the full rationale):
 *
 * C1 — `name` is a non-empty, trimmed string. Without a real name the page
 *      is a placeholder (this is the core trigger for the 4 bug shops).
 * C2 — at least one contact/location signal: a non-empty `address_raw` OR a
 *      `location` with numeric `lat` + `lng`. OR (not AND), because
 *      legitimate online-only shops have no address. Shops explicitly
 *      flagged `is_online_only` are exempt from C2 entirely — they
 *      legitimately have neither an address nor coordinates.
 * C3 — at least one content signal: `images.length >= 1` OR a non-empty
 *      `description` OR `product_count > 0`. OR (not AND), to avoid
 *      deindexing legitimate thin-but-real shops.
 */
export function isShopComplete(shop: ShopDetailResponse): boolean {
  const hasName = Boolean(shop.name?.trim())
  if (!hasName) return false

  const hasAddress = Boolean(shop.address_raw?.trim())
  const hasLocation =
    shop.location != null &&
    typeof shop.location.lat === 'number' &&
    typeof shop.location.lng === 'number' &&
    Number.isFinite(shop.location.lat) &&
    Number.isFinite(shop.location.lng)
  const hasLocationSignal = hasAddress || hasLocation || shop.is_online_only === true
  if (!hasLocationSignal) return false

  const hasImage = Array.isArray(shop.images) && shop.images.length >= 1
  const hasDescription = Boolean(shop.description?.trim())
  const hasProducts = typeof shop.product_count === 'number' && shop.product_count > 0
  const hasContentSignal = hasImage || hasDescription || hasProducts
  if (!hasContentSignal) return false

  return true
}

/** Matches a trailing hash-like suffix, e.g. "-03bb83dc" or "-514aff92". */
const TRAILING_HASH_SUFFIX = /-[0-9a-f]{6,}$/i

/**
 * Derive a human-readable display name from a shop slug.
 *
 * Examples:
 *   toi-moi-nicosia-mall-03bb83dc → "Toi Moi Nicosia Mall"
 *   wrap-grill-e4b4b9ad           → "Wrap Grill"
 *   rebellion-gym-514aff92        → "Rebellion Gym"
 *   barkies-50fc4aff              → "Barkies"
 *
 * Falls back to the literal string "Shop" for empty/degenerate slugs so the
 * result is never an empty string.
 */
export function slugToDisplayName(slug: string): string {
  if (!slug || !slug.trim()) return 'Shop'

  let base = slug.trim()

  // Strip trailing hash-suffix, but only if something remains afterwards.
  const withoutHash = base.replace(TRAILING_HASH_SUFFIX, '')
  if (withoutHash.trim().replace(/[-_]/g, '').length > 0) {
    base = withoutHash
  }

  const words = base
    .split(/[-_]+/)
    .map(w => w.trim())
    .filter(Boolean)

  if (words.length === 0) return 'Shop'

  const displayName = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return displayName || 'Shop'
}
