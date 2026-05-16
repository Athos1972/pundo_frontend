/**
 * Check: Meta description length per page (Ahrefs thresholds: 110–160 chars)
 */
// Ahrefs thresholds (mirrors src/lib/seo/metadata-defaults.ts constants)
const DESC_MIN = 110
const DESC_MAX = 160
export { DESC_MIN, DESC_MAX }

export interface DescriptionLengthViolation {
  url: string
  description: string
  length: number
  violation: 'missing' | 'too_short' | 'too_long'
}

export function checkDescriptionLength(url: string, description: string | null): DescriptionLengthViolation | null {
  if (!description || description.trim() === '') {
    return { url, description: '', length: 0, violation: 'missing' }
  }
  const len = Array.from(description).length
  if (len < DESC_MIN) {
    return { url, description, length: len, violation: 'too_short' }
  }
  if (len > DESC_MAX) {
    return { url, description, length: len, violation: 'too_long' }
  }
  return null
}

export function formatDescriptionLengthSection(violations: DescriptionLengthViolation[]): string {
  if (violations.length === 0) return ''
  const lines = [
    '## Description length violations',
    '',
    `> Ahrefs thresholds: ${DESC_MIN}–${DESC_MAX} characters`,
    '',
    '| URL | Length | Violation |',
    '|---|---|---|',
  ]
  for (const v of violations) {
    lines.push(`| ${v.url} | ${v.length} | ${v.violation} |`)
  }
  lines.push('')
  return lines.join('\n')
}
