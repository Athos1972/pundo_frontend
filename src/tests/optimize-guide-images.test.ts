/**
 * Unit tests for scripts/optimize-guide-images.ts
 * Tests the pure/functional parts: deriveManifestKey, deriveOutputPrefix,
 * and the MDX migration regex.
 *
 * Note: Sharp I/O and file-system side effects are NOT tested here (integration territory).
 */
import { describe, it, expect } from 'vitest'
import path from 'path'
import { deriveManifestKey, deriveOutputPrefix } from '../../scripts/optimize-guide-images'

// ─── deriveManifestKey ────────────────────────────────────────────────────────

describe('deriveManifestKey', () => {
  it('top-level PNG → <slug>/hero', () => {
    expect(deriveManifestKey('mukhtar.png')).toBe('mukhtar/hero')
  })

  it('top-level JPG → <slug>/hero', () => {
    expect(deriveManifestKey('yellow-slip.jpg')).toBe('yellow-slip/hero')
  })

  it('top-level kebab-slug → correct hero key', () => {
    expect(deriveManifestKey('bankkonto-zypern.png')).toBe('bankkonto-zypern/hero')
  })

  it('subdirectory PNG → <slug>/<asset>', () => {
    const relPath = path.join('mukhtar', 'schritt-2.png')
    expect(deriveManifestKey(relPath)).toBe('mukhtar/schritt-2')
  })

  it('subdirectory with kebab asset name', () => {
    const relPath = path.join('yellow-slip', 'ablauf-schema.png')
    expect(deriveManifestKey(relPath)).toBe('yellow-slip/ablauf-schema')
  })
})

// ─── deriveOutputPrefix ───────────────────────────────────────────────────────

describe('deriveOutputPrefix', () => {
  it('hero key → slug-hero prefix', () => {
    expect(deriveOutputPrefix('mukhtar/hero')).toBe('mukhtar-hero')
  })

  it('asset key → slug-asset prefix', () => {
    expect(deriveOutputPrefix('mukhtar/schritt-2')).toBe('mukhtar-schritt-2')
  })

  it('kebab slug + asset', () => {
    expect(deriveOutputPrefix('bankkonto-zypern/hero')).toBe('bankkonto-zypern-hero')
  })
})

// ─── MDX migration regex ──────────────────────────────────────────────────────

describe('MDX migration image regex', () => {
  // This is the same regex used in patchMdxFiles
  const IMG_REGEX = /^!\[([^\]]*)\]\(\/images\/guides\/([^)]+)\.(png|jpg)\)\s*$/im

  it('matches a standard markdown hero image line', () => {
    const line = '![Ein Mukhtar im Gespräch](/images/guides/mukhtar.png)'
    const m = IMG_REGEX.exec(line)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('Ein Mukhtar im Gespräch')
    expect(m![2]).toBe('mukhtar')
    expect(m![3]).toBe('png')
  })

  it('matches an English alt text', () => {
    const line = '![A Mukhtar speaking with residents](/images/guides/mukhtar.png)'
    const m = IMG_REGEX.exec(line)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('A Mukhtar speaking with residents')
  })

  it('matches jpg extension', () => {
    const line = '![Some alt](/images/guides/some-guide.jpg)'
    const m = IMG_REGEX.exec(line)
    expect(m).not.toBeNull()
    expect(m![3]).toBe('jpg')
  })

  it('matches empty alt text', () => {
    const line = '![](/images/guides/yellow-slip.png)'
    const m = IMG_REGEX.exec(line)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('')
  })

  it('does NOT match images outside /images/guides/', () => {
    const line = '![alt](/images/other/mukhtar.png)'
    expect(IMG_REGEX.exec(line)).toBeNull()
  })

  it('does NOT match inline images (not on own line) with surrounding text', () => {
    const line = 'See this image: ![alt](/images/guides/mukhtar.png) for details'
    expect(IMG_REGEX.exec(line)).toBeNull()
  })

  it('matches kebab-case guide names', () => {
    const line = '![Bank in Limassol](/images/guides/bankkonto-zypern.png)'
    const m = IMG_REGEX.exec(line)
    expect(m).not.toBeNull()
    expect(m![2]).toBe('bankkonto-zypern')
  })

  it('matches RTL alt text (Hebrew)', () => {
    const line = '![מוכתאר משוחח עם תושבים](/images/guides/mukhtar.png)'
    const m = IMG_REGEX.exec(line)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('מוכתאר משוחח עם תושבים')
  })

  it('matches when image line is in a multiline string', () => {
    const content = `# Title\n\n![Alt text](/images/guides/gesy-gesundheitssystem.png)\n\nSome body`
    const m = IMG_REGEX.exec(content)
    expect(m).not.toBeNull()
    expect(m![2]).toBe('gesy-gesundheitssystem')
  })
})
