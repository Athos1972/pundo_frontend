/**
 * Check: Empty H1 tags per page (AC-39)
 * Extends the existing h1_count check: textContent.trim() === '' is an error.
 */

export interface EmptyH1 {
  url: string
}

export function checkH1Empty(url: string, h1TextContents: string[]): EmptyH1 | null {
  const hasEmpty = h1TextContents.some((text) => text.trim() === '')
  return hasEmpty ? { url } : null
}

export function formatH1EmptySection(empties: EmptyH1[]): string {
  if (empties.length === 0) return ''
  const lines = [
    '## Empty H1 tags',
    '',
    '> Pages where at least one <h1> has empty textContent.',
    '',
  ]
  for (const e of empties) {
    lines.push(`- ${e.url}`)
  }
  lines.push('')
  return lines.join('\n')
}
