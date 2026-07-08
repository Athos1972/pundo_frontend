/**
 * Check: Open Graph completeness per page (AC-40)
 *
 * Required tags: og:title, og:description, og:image, og:image:width,
 * og:image:height, og:image:alt, og:url, og:type, og:site_name, og:locale,
 * twitter:card, twitter:title, twitter:description, twitter:image
 */

export const OG_REQUIRED_PROPERTIES = [
  'og:title',
  'og:description',
  'og:image',
  'og:image:width',
  'og:image:height',
  'og:image:alt',
  'og:url',
  'og:type',
  'og:site_name',
  'og:locale',
] as const

export const TWITTER_REQUIRED_NAMES = [
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
] as const

export interface OgGap {
  url: string
  missingTags: string[]
}

/**
 * Check OG completeness from a map of { property/name → content }.
 * The caller must extract both og:* (property) and twitter:* (name) tags into ogTags.
 */
export function checkOgCompleteness(
  url: string,
  ogTags: Record<string, string>,
): OgGap | null {
  const missing: string[] = []

  for (const prop of OG_REQUIRED_PROPERTIES) {
    if (!ogTags[prop] || ogTags[prop].trim() === '') {
      missing.push(prop)
    }
  }

  for (const name of TWITTER_REQUIRED_NAMES) {
    if (!ogTags[name] || ogTags[name].trim() === '') {
      missing.push(name)
    }
  }

  return missing.length > 0 ? { url, missingTags: missing } : null
}

export function formatOgCompletenessSection(gaps: OgGap[]): string {
  if (gaps.length === 0) return ''
  const lines = [
    '## Open Graph gaps',
    '',
    '| URL | Missing tags |',
    '|---|---|',
  ]
  for (const g of gaps) {
    lines.push(`| ${g.url} | ${g.missingTags.join(', ')} |`)
  }
  lines.push('')
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// B6400-004: og:url must match rel=canonical
// ---------------------------------------------------------------------------

export interface OgUrlMismatch {
  url: string
  ogUrl: string | null
  canonical: string | null
}

/**
 * Normalize a URL for comparison: lowercase the origin, strip a trailing
 * slash from the pathname (except for the root path), keep everything else
 * as-is. Falls back to the raw trimmed string when the value is not a valid
 * absolute/relative URL that `new URL()` can parse.
 */
function normalizeUrlForComparison(raw: string): string {
  const trimmed = raw.trim()
  try {
    const u = new URL(trimmed)
    const origin = u.origin.toLowerCase()
    let pathname = u.pathname
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }
    return `${origin}${pathname}${u.search}`
  } catch {
    // Relative or otherwise unparseable value — fall back to raw string.
    return trimmed
  }
}

/**
 * AC-2: og:url must equal the page's rel=canonical.
 * Returns null when they match (or when either is absent — absence of og:url
 * is already covered by checkOgCompleteness, absence of canonical by the
 * missing-canonical report). This check fires ONLY on a present-but-divergent value.
 */
export function checkOgUrlMatchesCanonical(
  url: string,
  ogTags: Record<string, string>,
  canonical: string | null,
): OgUrlMismatch | null {
  const ogUrl = ogTags['og:url']?.trim() || null

  if (!ogUrl || !canonical || canonical.trim() === '') {
    return null
  }

  const normalizedOg = normalizeUrlForComparison(ogUrl)
  const normalizedCanonical = normalizeUrlForComparison(canonical)

  if (normalizedOg === normalizedCanonical) {
    return null
  }

  return { url, ogUrl, canonical }
}

export function formatOgUrlMismatchSection(mismatches: OgUrlMismatch[]): string {
  if (mismatches.length === 0) return ''
  const lines = [
    '## og:url / canonical mismatches',
    '',
    '> Pages where og:url is present but does not match rel=canonical.',
    '',
    '| Page | og:url | canonical |',
    '|---|---|---|',
  ]
  for (const m of mismatches) {
    lines.push(`| ${m.url} | ${m.ogUrl ?? '—'} | ${m.canonical ?? '—'} |`)
  }
  lines.push('')
  return lines.join('\n')
}
