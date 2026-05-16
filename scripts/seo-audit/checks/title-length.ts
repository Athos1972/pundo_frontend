/**
 * Check: Title length per page (Ahrefs thresholds: 50–60 chars)
 */
// Ahrefs thresholds (mirrors src/lib/seo/metadata-defaults.ts constants)
const TITLE_MIN = 50
const TITLE_MAX = 60
export { TITLE_MIN, TITLE_MAX }

export interface TitleLengthViolation {
  url: string
  title: string
  length: number
  violation: 'too_short' | 'too_long'
}

export interface TitleLengthResult {
  violations: TitleLengthViolation[]
}

export function checkTitleLength(url: string, title: string | null): TitleLengthViolation | null {
  if (!title) return null
  const len = Array.from(title).length
  if (len < TITLE_MIN) {
    return { url, title, length: len, violation: 'too_short' }
  }
  if (len > TITLE_MAX) {
    return { url, title, length: len, violation: 'too_long' }
  }
  return null
}

export function formatTitleLengthSection(violations: TitleLengthViolation[]): string {
  if (violations.length === 0) return ''
  const lines = [
    '## Title length violations',
    '',
    `> Ahrefs thresholds: ${TITLE_MIN}–${TITLE_MAX} characters`,
    '',
    '| URL | Title | Length | Violation |',
    '|---|---|---|---|',
  ]
  for (const v of violations) {
    const titleShort = v.title.slice(0, 50) + (v.title.length > 50 ? '…' : '')
    lines.push(`| ${v.url} | ${titleShort} | ${v.length} | ${v.violation} |`)
  }
  lines.push('')
  return lines.join('\n')
}
