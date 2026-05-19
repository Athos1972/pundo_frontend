/**
 * Unit tests for src/lib/seed-visuals.ts
 */
import { describe, it, expect } from 'vitest'
import {
  parseSeedSlug,
  getSeedVisualPath,
  getSeedClusterFallbackPath,
  resolveItemCoverUrl,
  isSeedItem,
  SEED_VISUAL_GENERIC_PATH,
} from '@/lib/seed-visuals'

// ─── parseSeedSlug ────────────────────────────────────────────────────────────

describe('parseSeedSlug', () => {
  it('parses a canonical tmpl- slug', () => {
    const result = parseSeedSlug('tmpl-bodenbelag-parkett-schleifen')
    expect(result).toEqual({ domain: 'bodenbelag', shortSlug: 'parkett-schleifen' })
  })

  it('parses a single-word domain', () => {
    const result = parseSeedSlug('tmpl-elektriker-stoerung')
    expect(result).toEqual({ domain: 'elektriker', shortSlug: 'stoerung' })
  })

  it('handles multi-hyphen short slug', () => {
    const result = parseSeedSlug('tmpl-bodenbelag-laminat-verlegen-und-zuschneiden')
    expect(result).toEqual({ domain: 'bodenbelag', shortSlug: 'laminat-verlegen-und-zuschneiden' })
  })

  it('passes through a non-tmpl slug with no domain', () => {
    const result = parseSeedSlug('parkett-schleifen')
    expect(result).toEqual({ domain: null, shortSlug: 'parkett-schleifen' })
  })

  it('returns null for empty string', () => {
    expect(parseSeedSlug('')).toBeNull()
  })

  it('returns null for null', () => {
    expect(parseSeedSlug(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(parseSeedSlug(undefined)).toBeNull()
  })
})

// ─── getSeedVisualPath ────────────────────────────────────────────────────────

describe('getSeedVisualPath', () => {
  it('returns card WebP path for a tmpl- slug (default variant)', () => {
    expect(getSeedVisualPath('tmpl-bodenbelag-parkett-schleifen')).toBe(
      '/seed-visuals/parkett-schleifen.webp',
    )
  })

  it('returns card WebP path with explicit card variant', () => {
    expect(getSeedVisualPath('tmpl-elektriker-stoerung', 'card')).toBe(
      '/seed-visuals/stoerung.webp',
    )
  })

  it('returns OG WebP path for og variant', () => {
    expect(getSeedVisualPath('tmpl-bodenbelag-parkett-schleifen', 'og')).toBe(
      '/seed-visuals/parkett-schleifen-og.webp',
    )
  })

  it('returns card path for non-tmpl slug verbatim', () => {
    expect(getSeedVisualPath('parkett-schleifen')).toBe('/seed-visuals/parkett-schleifen.webp')
  })

  it('returns null for null slug', () => {
    expect(getSeedVisualPath(null)).toBeNull()
  })

  it('returns null for undefined slug', () => {
    expect(getSeedVisualPath(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getSeedVisualPath('')).toBeNull()
  })

  it('og path ends with -og.webp', () => {
    const path = getSeedVisualPath('tmpl-abc-foo-bar', 'og')
    expect(path).toMatch(/-og\.webp$/)
  })

  it('card path ends with .webp (no -og suffix)', () => {
    const path = getSeedVisualPath('tmpl-abc-foo-bar', 'card')
    expect(path).toMatch(/\.webp$/)
    expect(path).not.toMatch(/-og\.webp$/)
  })
})

// ─── getSeedClusterFallbackPath ───────────────────────────────────────────────

describe('getSeedClusterFallbackPath', () => {
  it('returns domain-level WebP path for tmpl- slug', () => {
    expect(getSeedClusterFallbackPath('tmpl-bodenbelag-parkett-schleifen')).toBe(
      '/seed-visuals/bodenbelag.webp',
    )
  })

  it('returns OG variant for cluster fallback', () => {
    expect(getSeedClusterFallbackPath('tmpl-elektriker-stoerung', 'og')).toBe(
      '/seed-visuals/elektriker-og.webp',
    )
  })

  it('returns null for non-tmpl slug (no domain)', () => {
    expect(getSeedClusterFallbackPath('parkett-schleifen')).toBeNull()
  })

  it('returns null for null', () => {
    expect(getSeedClusterFallbackPath(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(getSeedClusterFallbackPath(undefined)).toBeNull()
  })
})

// ─── resolveItemCoverUrl ──────────────────────────────────────────────────────

describe('resolveItemCoverUrl', () => {
  it('returns photoUrl when it is set', () => {
    const url = 'https://cdn.example.com/photos/123.jpg'
    expect(resolveItemCoverUrl(url, 'tmpl-bodenbelag-parkett-schleifen')).toBe(url)
  })

  it('returns seed visual path when photoUrl is null', () => {
    expect(resolveItemCoverUrl(null, 'tmpl-bodenbelag-parkett-schleifen')).toBe(
      '/seed-visuals/parkett-schleifen.webp',
    )
  })

  it('returns seed visual path when photoUrl is undefined', () => {
    expect(resolveItemCoverUrl(undefined, 'tmpl-elektriker-stoerung')).toBe(
      '/seed-visuals/stoerung.webp',
    )
  })

  it('returns seed visual path when photoUrl is empty string', () => {
    expect(resolveItemCoverUrl('', 'tmpl-bodenbelag-parkett-schleifen')).toBe(
      '/seed-visuals/parkett-schleifen.webp',
    )
  })

  it('returns OG variant when requested', () => {
    expect(resolveItemCoverUrl(null, 'tmpl-bodenbelag-parkett-schleifen', 'og')).toBe(
      '/seed-visuals/parkett-schleifen-og.webp',
    )
  })

  it('returns generic placeholder when both photoUrl and itemSlug are null', () => {
    expect(resolveItemCoverUrl(null, null)).toBe(SEED_VISUAL_GENERIC_PATH)
  })

  it('returns generic placeholder when itemSlug is empty', () => {
    expect(resolveItemCoverUrl(null, '')).toBe(SEED_VISUAL_GENERIC_PATH)
  })

  it('prefers real photo over seed visual', () => {
    const realPhoto = '/media/photos/item_999_card.webp'
    expect(resolveItemCoverUrl(realPhoto, 'tmpl-elektriker-stoerung')).toBe(realPhoto)
  })
})

// ─── isSeedItem ───────────────────────────────────────────────────────────────

describe('isSeedItem', () => {
  it('returns true for tmpl- prefixed slugs', () => {
    expect(isSeedItem('tmpl-bodenbelag-parkett-schleifen')).toBe(true)
    expect(isSeedItem('tmpl-elektriker-stoerung')).toBe(true)
    expect(isSeedItem('tmpl-x-y')).toBe(true)
  })

  it('returns false for regular slugs', () => {
    expect(isSeedItem('parkett-schleifen')).toBe(false)
    expect(isSeedItem('elektriker')).toBe(false)
    expect(isSeedItem('my-product')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isSeedItem(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isSeedItem(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isSeedItem('')).toBe(false)
  })
})

// ─── SEED_VISUAL_GENERIC_PATH ─────────────────────────────────────────────────

describe('SEED_VISUAL_GENERIC_PATH', () => {
  it('is a root-relative path under /seed-visuals/', () => {
    expect(SEED_VISUAL_GENERIC_PATH).toMatch(/^\/seed-visuals\//)
  })
})
