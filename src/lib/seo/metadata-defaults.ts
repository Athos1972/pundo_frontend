/**
 * SEO metadata helpers for pundo_frontend.
 *
 * Each helper returns a complete Next.js Metadata object for a specific
 * page type. Pages should spread these defaults and override specific fields.
 *
 * Usage:
 *   import { productMetadata } from '@/lib/seo/metadata-defaults'
 *   export async function generateMetadata(...) {
 *     return productMetadata({ name, price, slug, imageUrl })
 *   }
 */

import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { buildHreflang, stripLang } from '@/lib/routing'

export function getSiteUrl(): string {
  return process.env.SITE_URL ?? 'https://pundo.cy'
}

// ---------------------------------------------------------------------------
// Ahrefs-calibrated length constraints (single source of truth)
// ---------------------------------------------------------------------------

export const TITLE_MIN = 50
export const TITLE_MAX = 60
export const DESC_MIN = 110
export const DESC_MAX = 160

// ---------------------------------------------------------------------------
// Truncation helpers — operate on Unicode code points (correct for Multibyte)
// ---------------------------------------------------------------------------

/** Strip basic HTML tags from a string before using it as meta content. */
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

/**
 * Word-boundary-preserving title truncation.
 *
 * @param input  Raw title string (HTML stripped internally)
 * @param opts.max       Maximum code-point length (default: TITLE_MAX)
 * @param opts.reserved  Code points to reserve for a suffix (e.g. " | Pundo" = 8)
 *
 * If input fits within (max - reserved), it is returned as-is.
 * Otherwise it is sliced at the last word boundary, an ellipsis "…" is appended,
 * and the reserved space is preserved.
 */
export function truncateTitle(input: string, opts?: { max?: number; reserved?: number }): string {
  const max = opts?.max ?? TITLE_MAX
  const reserved = opts?.reserved ?? 0
  const effectiveMax = max - reserved
  const clean = stripHtml(input.trim())
  const codePoints = Array.from(clean)
  // -1 to leave room for the ellipsis character itself
  if (codePoints.length <= effectiveMax) return clean
  const sliceAt = effectiveMax - 1
  const sliced = codePoints.slice(0, sliceAt)
  const joined = sliced.join('')
  // Try to cut at last whitespace
  const lastSpace = joined.lastIndexOf(' ')
  const cutTo = lastSpace > 0 ? lastSpace : sliceAt
  return codePoints.slice(0, cutTo).join('').trimEnd() + '…'
}

/**
 * Word-boundary-preserving description truncation.
 *
 * @param input  Raw description (HTML stripped internally)
 * @param opts.max  Maximum code-point length (default: DESC_MAX)
 */
export function truncateDescription(input: string, opts?: { max?: number }): string {
  const max = opts?.max ?? DESC_MAX
  const clean = stripHtml(input.trim())
  const codePoints = Array.from(clean)
  if (codePoints.length <= max) return clean
  const sliceAt = max - 1
  const sliced = codePoints.slice(0, sliceAt)
  const joined = sliced.join('')
  const lastSpace = joined.lastIndexOf(' ')
  const cutTo = lastSpace > 0 ? lastSpace : sliceAt
  return codePoints.slice(0, cutTo).join('').trimEnd() + '…'
}

// ---------------------------------------------------------------------------
// Shop-title padding helper
// ---------------------------------------------------------------------------

/** Translation keys used by padShopTitle — minimal subset to avoid circular deps */
const SHOP_TAGLINES: Record<string, string> = {
  en: 'Price comparison on Pundo',
  de: 'Preisvergleich auf Pundo',
  el: 'Σύγκριση τιμών στο Pundo',
  ru: 'Сравнение цен на Pundo',
  ar: 'مقارنة الأسعار على Pundo',
  he: 'השוואת מחירים ב-Pundo',
}

/**
 * Pad a short shop title to reach TITLE_MIN characters.
 *
 * Strategy: `${shopName}${' · ' + city}${' — ' + category}${' | ' + brandName}`
 * Appends hints one by one until >= TITLE_MIN. If still too short after all hints,
 * appends a localised tagline. Result is then truncated to TITLE_MAX if needed.
 */
export function padShopTitle(
  shopName: string,
  hints: { city?: string | null; category?: string | null },
  lang: Lang,
  brandName: string,
): string {
  const brandSuffix = ` | ${brandName}`
  let base = shopName

  // Step 1: append city if available and title still short
  if (hints.city && Array.from(base + brandSuffix).length < TITLE_MIN) {
    base = `${base} · ${hints.city}`
  }

  // Step 2: append category if still short
  if (hints.category && Array.from(base + brandSuffix).length < TITLE_MIN) {
    base = `${base} — ${hints.category}`
  }

  // Step 3: append tagline if still short
  const tagline = SHOP_TAGLINES[lang] ?? SHOP_TAGLINES.en
  if (Array.from(base + brandSuffix).length < TITLE_MIN) {
    base = `${base} — ${tagline}`
  }

  const full = `${base}${brandSuffix}`
  return truncateTitle(full, { max: TITLE_MAX })
}

// ---------------------------------------------------------------------------
// Indexable-route classification
// ---------------------------------------------------------------------------

export interface RouteClassification {
  indexable: boolean
  reason?: string
}

const NON_INDEXABLE_PATTERNS: RegExp[] = [
  /^\/auth(\/|$)/,
  /^\/account(\/|$)/,
  /^\/shop-admin(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/api(\/|$)/,
  /^\/__playwright(\/|$)/,
  /^\/_next(\/|$)/,
  /^\/favicon/,
]

/** Query params that indicate a non-indexable parametrised result page */
const NON_INDEXABLE_QUERY_PARAMS = ['q', 'shop_id', 'category_id', 'filter']

/**
 * Returns whether a given path/URL should be indexed.
 * NON_INDEXABLE_PATTERNS always win (blacklist-first strategy).
 * Query-string pages with search/filter params are treated as non-indexable.
 */
export function isIndexable(path: string): RouteClassification {
  // Normalise: strip origin if present
  let pathname = path
  let search = ''
  try {
    const u = new URL(path, 'http://x')
    pathname = u.pathname
    search = u.search
  } catch {
    // path was already a pathname
  }

  // Strip lang prefix so /en/search and /search are treated identically
  const strippedPathname = stripLang(pathname)

  // Blacklist check
  for (const pattern of NON_INDEXABLE_PATTERNS) {
    if (pattern.test(strippedPathname)) {
      return { indexable: false, reason: `matches non-indexable pattern ${pattern}` }
    }
  }

  // Query-param check
  if (search) {
    const params = new URLSearchParams(search)
    for (const key of NON_INDEXABLE_QUERY_PARAMS) {
      if (params.has(key)) {
        return { indexable: false, reason: `has non-indexable query param "${key}"` }
      }
    }
  }

  return { indexable: true }
}

// ---------------------------------------------------------------------------
// Whitelist: paths where a brand-default description is acceptable
// (pages that intentionally inherit layout description)
// ---------------------------------------------------------------------------

export const genericDescriptionAllowed: Set<string> = new Set([
  '/',
  '/about',
  '/help',
  '/for-shops',
  '/contact',
  '/blog',
  '/search',
  '/nostalgia',
  '/homesick',
])

// ---------------------------------------------------------------------------
// Legacy page-type helpers (kept for backward compat)
// ---------------------------------------------------------------------------

export interface ProductMetadataArgs {
  name: string
  slug: string
  description?: string
  priceDisplay?: string
  imageUrl?: string
}

export function productMetadata(args: ProductMetadataArgs): Metadata {
  const siteUrl = getSiteUrl()
  const title = args.priceDisplay ? `${args.name} — ${args.priceDisplay}` : args.name
  const canonical = `${siteUrl}/products/${args.slug}`
  return {
    title,
    description: args.description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title,
      description: args.description,
      url: canonical,
      images: args.imageUrl ? [{ url: args.imageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: args.description,
      images: args.imageUrl ? [args.imageUrl] : undefined,
    },
    robots: { index: true, follow: true },
  }
}

export interface ShopMetadataArgs {
  name: string
  slug: string
  description?: string
  logoUrl?: string
}

export function shopMetadata(args: ShopMetadataArgs): Metadata {
  const siteUrl = getSiteUrl()
  const canonical = `${siteUrl}/shops/${args.slug}`
  return {
    title: args.name,
    description: args.description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: args.name,
      description: args.description,
      url: canonical,
      images: args.logoUrl ? [{ url: args.logoUrl }] : undefined,
    },
    twitter: {
      card: 'summary',
      title: args.name,
      description: args.description,
      images: args.logoUrl ? [args.logoUrl] : undefined,
    },
    robots: { index: true, follow: true },
  }
}

export interface GuideMetadataArgs {
  title: string
  slug: string
  description?: string
}

export function guideMetadata(args: GuideMetadataArgs): Metadata {
  const siteUrl = getSiteUrl()
  const canonical = `${siteUrl}/guides/${args.slug}`
  return {
    title: `${args.title} — pundo`,
    description: args.description,
    alternates: {
      // No hreflang: Pundo has no URL-based i18n (all languages share same URL).
      // Correct hreflang requires per-language URLs — see F6300.
      canonical,
    },
    openGraph: {
      type: 'article',
      title: args.title,
      description: args.description,
      url: canonical,
    },
    robots: { index: true, follow: true },
  }
}

/** Metadata for any page that should never be indexed (auth, account, etc.) */
export function noIndexMetadata(title?: string): Metadata {
  return {
    ...(title ? { title } : {}),
    robots: { index: false, follow: false },
  }
}

/** Metadata for parametrised/dynamic search URLs (e.g. /search?q=foo) */
export function searchResultsMetadata(): Metadata {
  return {
    robots: { index: false, follow: true },
  }
}

/** Metadata for the plain /search page (no query).
 * Pass `lang` to get a lang-prefixed canonical and hreflang links.
 * Without `lang`, falls back to the old `/search` canonical (backward compat). */
export function searchPageMetadata(lang?: Lang): Metadata {
  const siteUrl = getSiteUrl()
  const canonical = lang ? `${siteUrl}/${lang}/search` : `${siteUrl}/search`
  return {
    title: 'Search',
    description: 'Search for products and shops near you in Cyprus.',
    alternates: {
      canonical,
      ...(lang ? { languages: buildHreflang(siteUrl, '/search') } : {}),
    },
    robots: { index: true, follow: true },
  }
}
