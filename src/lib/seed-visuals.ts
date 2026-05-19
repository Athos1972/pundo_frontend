/**
 * seed-visuals.ts
 *
 * Utility for resolving static seed-visual paths for auto-seeded items.
 *
 * Naming convention (verbindlich per Architecture §1):
 *   /seed-visuals/<template-slug>.webp        — 1200×900 card
 *   /seed-visuals/<template-slug>.jpg         — 1200×900 card JPG fallback
 *   /seed-visuals/<template-slug>-og.webp     — 1200×630 OG variant
 *
 * `<template-slug>` is the item slug WITHOUT the `tmpl-<domain>-` prefix.
 * Example: item slug `tmpl-bodenbelag-parkett-schleifen` → `parkett-schleifen`
 *
 * Fallback hierarchy (Design §2 Flow D):
 *   1. Exact slug match:     /seed-visuals/parkett-schleifen.webp
 *   2. Cluster fallback:     /seed-visuals/<domain>.webp   (e.g. /seed-visuals/bodenbelag.webp)
 *   3. Generic placeholder:  /seed-visuals/_generic.webp
 */

/**
 * Extract the short template slug from a full item slug.
 *
 * `tmpl-bodenbelag-parkett-schleifen` → `{ domain: 'bodenbelag', shortSlug: 'parkett-schleifen' }`
 * `parkett-schleifen` (non-tmpl)      → `{ domain: null, shortSlug: 'parkett-schleifen' }`
 *
 * Returns null when the slug is falsy.
 */
export function parseSeedSlug(itemSlug: string | null | undefined): {
  domain: string | null
  shortSlug: string
} | null {
  if (!itemSlug) return null

  const tmplMatch = itemSlug.match(/^tmpl-([^-]+)-(.+)$/)
  if (tmplMatch) {
    return { domain: tmplMatch[1], shortSlug: tmplMatch[2] }
  }

  // Non-tmpl slug — pass through as-is (useful in tests / edge cases)
  return { domain: null, shortSlug: itemSlug }
}

/** Variant selector for getSeedVisualPath */
export type SeedVisualVariant = 'card' | 'og'

/**
 * Returns the static path for a seed visual.
 *
 * - `variant = 'card'` (default) → `.webp` card image (1200×900)
 * - `variant = 'og'`             → `-og.webp` OG image (1200×630)
 *
 * The function does NOT check whether the file actually exists on disk
 * (that would require a server-side fs call). The manifest check is done
 * at build time via the Vitest manifest test and `npm run seed-visuals:build`.
 *
 * When `itemSlug` does not start with `tmpl-` the slug is used verbatim
 * (allows direct lookups in tests and admin tooling).
 *
 * Returns `null` when `itemSlug` is falsy.
 *
 * @example
 *   getSeedVisualPath('tmpl-bodenbelag-parkett-schleifen')
 *   // → '/seed-visuals/parkett-schleifen.webp'
 *
 *   getSeedVisualPath('tmpl-bodenbelag-parkett-schleifen', 'og')
 *   // → '/seed-visuals/parkett-schleifen-og.webp'
 */
export function getSeedVisualPath(
  itemSlug: string | null | undefined,
  variant: SeedVisualVariant = 'card',
): string | null {
  const parsed = parseSeedSlug(itemSlug)
  if (!parsed) return null

  const suffix = variant === 'og' ? '-og.webp' : '.webp'
  return `/seed-visuals/${parsed.shortSlug}${suffix}`
}

/**
 * Returns the cluster-fallback path for a seed visual.
 *
 * When an item slug is `tmpl-bodenbelag-parkett-schleifen` and no exact
 * visual file exists yet, this returns `/seed-visuals/bodenbelag.webp`.
 * Returns `null` when the slug has no domain prefix.
 */
export function getSeedClusterFallbackPath(
  itemSlug: string | null | undefined,
  variant: SeedVisualVariant = 'card',
): string | null {
  const parsed = parseSeedSlug(itemSlug)
  if (!parsed || !parsed.domain) return null

  const suffix = variant === 'og' ? '-og.webp' : '.webp'
  return `/seed-visuals/${parsed.domain}${suffix}`
}

/** Path to the generic placeholder image. */
export const SEED_VISUAL_GENERIC_PATH = '/seed-visuals/_generic.webp'

/**
 * Resolves the best available cover image URL for an item.
 *
 * Priority:
 *   1. `photoUrl` — if a real item photo is already set (from ItemPhoto resolver)
 *   2. Seed-visual exact match: `/seed-visuals/<short-slug>.webp`
 *   3. Cluster fallback:        `/seed-visuals/<domain>.webp`
 *   4. Generic placeholder:     `/seed-visuals/_generic.webp`
 *
 * The caller is responsible for rendering the returned URL with a graceful
 * onError handler in case even the generic placeholder is missing.
 *
 * @param photoUrl   - URL from `item.photos[0]?.url` (or similar)
 * @param itemSlug   - Full item slug (may start with `tmpl-`)
 * @param variant    - 'card' (default) or 'og'
 */
export function resolveItemCoverUrl(
  photoUrl: string | null | undefined,
  itemSlug: string | null | undefined,
  variant: SeedVisualVariant = 'card',
): string {
  if (photoUrl) return photoUrl

  const exact = getSeedVisualPath(itemSlug, variant)
  if (exact) return exact

  const cluster = getSeedClusterFallbackPath(itemSlug, variant)
  if (cluster) return cluster

  return SEED_VISUAL_GENERIC_PATH
}

/**
 * Returns true when the item is an auto-seeded template item.
 * Seed items have slugs starting with `tmpl-`.
 */
export function isSeedItem(itemSlug: string | null | undefined): boolean {
  return typeof itemSlug === 'string' && itemSlug.startsWith('tmpl-')
}
