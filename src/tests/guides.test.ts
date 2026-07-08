/**
 * Unit tests for src/lib/guides.ts — getGuideSlugs()
 *
 * Regression coverage for B5860-001: `_raw` (and any future underscore-prefixed
 * asset/system directory under content/guides/) must never be treated as a
 * guide slug. Root cause: getGuideSlugs() previously filtered only on
 * isDirectory(), letting `content/guides/_raw/` (unoptimized source images)
 * leak through as a fake guide slug into generateStaticParams(), getGuides(),
 * and the sitemap generator.
 *
 * `fs` is mocked so the test is deterministic and independent of the real
 * content/guides/ directory contents.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const existsSync = vi.fn()
const readdirSync = vi.fn()
const statSync = vi.fn()

vi.mock('fs', () => ({
  default: { existsSync, readdirSync, statSync },
  existsSync,
  readdirSync,
  statSync,
}))

// Helper: configure fs.readdirSync to return the given entry names, and
// fs.statSync(...).isDirectory() to return true only for entries in `dirs`.
function setupDir(entries: string[], dirs: string[]): void {
  existsSync.mockReturnValue(true)
  readdirSync.mockReturnValue(entries)
  statSync.mockImplementation((p: string) => {
    const name = String(p).split('/').pop()
    return { isDirectory: () => dirs.includes(name ?? '') }
  })
}

// Import after mocks are set up so the module picks up the mocked `fs`.
const { getGuideSlugs } = await import('@/lib/guides')

describe('getGuideSlugs', () => {
  beforeEach(() => {
    existsSync.mockReset()
    readdirSync.mockReset()
    statSync.mockReset()
  })

  it('returns real guide directories', () => {
    setupDir(['mukhtar', 'yellow-slip'], ['mukhtar', 'yellow-slip'])
    expect(getGuideSlugs()).toEqual(['mukhtar', 'yellow-slip'])
  })

  it('excludes `_raw` (the core regression)', () => {
    setupDir(['mukhtar', '_raw'], ['mukhtar', '_raw'])
    const slugs = getGuideSlugs()
    expect(slugs).not.toContain('_raw')
    expect(slugs).toEqual(['mukhtar'])
  })

  it('excludes any underscore-prefixed directory (future asset/system dirs)', () => {
    setupDir(['mukhtar', '_draft', '_tmp'], ['mukhtar', '_draft', '_tmp'])
    const slugs = getGuideSlugs()
    expect(slugs).toEqual(['mukhtar'])
    expect(slugs).not.toContain('_draft')
    expect(slugs).not.toContain('_tmp')
  })

  it('excludes non-directory entries (e.g. _image-manifest.json, .DS_Store)', () => {
    setupDir(
      ['mukhtar', '_image-manifest.json', '.DS_Store'],
      ['mukhtar'], // only mukhtar is a real directory
    )
    const slugs = getGuideSlugs()
    expect(slugs).toEqual(['mukhtar'])
  })

  it('returns an empty array when content/guides/ does not exist', () => {
    existsSync.mockReturnValue(false)
    expect(getGuideSlugs()).toEqual([])
    expect(readdirSync).not.toHaveBeenCalled()
  })

  it('mixed case: directories, underscore-dirs, and files together → only real slugs', () => {
    setupDir(
      ['mukhtar', '_raw', 'yellow-slip', '_image-manifest.json', '.DS_Store', '_draft'],
      ['mukhtar', '_raw', 'yellow-slip', '_draft'],
    )
    expect(getGuideSlugs()).toEqual(['mukhtar', 'yellow-slip'])
  })
})
