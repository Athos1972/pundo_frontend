/**
 * Unit tests for src/lib/guide-images.ts
 * Tests: getImageMeta, hasImageMeta
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/data/guide-image-manifest.json', () => ({
  default: {
    'mukhtar/hero': {
      width: 1600,
      height: 900,
      blurDataURL: 'data:image/avif;base64,ABC',
      formats: ['avif', 'webp'],
      widths: [480, 960, 1600],
      hash: 'sha256:abc123',
      source: '_raw/mukhtar.png',
    },
  },
}))

// Import after mock is set up
const { getImageMeta, hasImageMeta } = await import('@/lib/guide-images')

describe('hasImageMeta', () => {
  it('returns true for an existing key', () => {
    expect(hasImageMeta('mukhtar/hero')).toBe(true)
  })

  it('returns false for a missing key', () => {
    expect(hasImageMeta('unknown-guide/hero')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(hasImageMeta('')).toBe(false)
  })
})

describe('getImageMeta', () => {
  it('returns the manifest entry for a known key', () => {
    const meta = getImageMeta('mukhtar/hero')
    expect(meta.width).toBe(1600)
    expect(meta.height).toBe(900)
    expect(meta.blurDataURL).toBe('data:image/avif;base64,ABC')
    expect(meta.formats).toEqual(['avif', 'webp'])
    expect(meta.widths).toEqual([480, 960, 1600])
    expect(meta.hash).toBe('sha256:abc123')
    expect(meta.source).toBe('_raw/mukhtar.png')
  })

  it('throws a descriptive error for a missing key', () => {
    expect(() => getImageMeta('missing-guide/hero')).toThrowError(
      '[guides] Missing image manifest entry for "missing-guide/hero"',
    )
  })

  it('error message mentions guides:optimize command', () => {
    expect(() => getImageMeta('no-such/asset')).toThrowError('npm run guides:optimize')
  })

  it('throws when key looks valid but is not in manifest', () => {
    // A plausible-looking key that is simply not registered
    expect(() => getImageMeta('another-guide/hero')).toThrowError('[guides] Missing image manifest entry')
  })
})
