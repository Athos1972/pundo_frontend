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
