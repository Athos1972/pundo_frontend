/**
 * Unit tests for public/seed-visuals/_manifest.json sanity.
 *
 * Skips gracefully when the manifest is empty (initial state before DrawThings
 * images are generated). Once images are added and `npm run seed-visuals:build`
 * has been run, the tests fully enforce:
 *   - No duplicate slugs
 *   - All referenced files exist on disk
 *   - All files are <= 200 KB
 *   - OG variant filename follows the naming convention
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const MANIFEST_PATH = path.join(REPO_ROOT, 'public', 'seed-visuals', '_manifest.json')
const SEED_VISUALS_DIR = path.join(REPO_ROOT, 'public', 'seed-visuals')
const MAX_BYTES = 200 * 1024 // 200 KB

interface ManifestItem {
  slug: string
  sha256_webp: string
  bytes_webp: number
  bytes_jpg: number
  bytes_og: number
}

interface Manifest {
  generated_at: string
  total: number
  items: ManifestItem[]
}

function loadManifest(): Manifest {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8')
  return JSON.parse(raw) as Manifest
}

describe('seed-visuals manifest', () => {
  it('manifest file exists', () => {
    expect(fs.existsSync(MANIFEST_PATH), `Missing: ${MANIFEST_PATH}`).toBe(true)
  })

  it('manifest is valid JSON with required fields', () => {
    const manifest = loadManifest()
    expect(manifest).toHaveProperty('generated_at')
    expect(manifest).toHaveProperty('total')
    expect(manifest).toHaveProperty('items')
    expect(Array.isArray(manifest.items)).toBe(true)
    expect(manifest.total).toBe(manifest.items.length)
  })

  it('skips file-level checks when manifest is empty (initial state)', () => {
    const manifest = loadManifest()
    if (manifest.items.length === 0) {
      // Initial state — nothing to check yet
      expect(manifest.total).toBe(0)
      return
    }

    // Non-empty manifest — run full checks
    expect(manifest.items.length).toBeGreaterThan(0)
  })

  it('has no duplicate slugs', () => {
    const manifest = loadManifest()
    if (manifest.items.length === 0) return // graceful skip

    const slugs = manifest.items.map((i) => i.slug)
    const unique = new Set(slugs)
    expect(unique.size).toBe(slugs.length)
  })

  it('all card WebP files exist on disk', () => {
    const manifest = loadManifest()
    if (manifest.items.length === 0) return // graceful skip

    for (const item of manifest.items) {
      const webpPath = path.join(SEED_VISUALS_DIR, `${item.slug}.webp`)
      expect(fs.existsSync(webpPath), `Missing card WebP: ${webpPath}`).toBe(true)
    }
  })

  it('all card JPG fallback files exist on disk', () => {
    const manifest = loadManifest()
    if (manifest.items.length === 0) return // graceful skip

    for (const item of manifest.items) {
      const jpgPath = path.join(SEED_VISUALS_DIR, `${item.slug}.jpg`)
      expect(fs.existsSync(jpgPath), `Missing card JPG: ${jpgPath}`).toBe(true)
    }
  })

  it('all OG WebP files exist on disk', () => {
    const manifest = loadManifest()
    if (manifest.items.length === 0) return // graceful skip

    for (const item of manifest.items) {
      const ogPath = path.join(SEED_VISUALS_DIR, `${item.slug}-og.webp`)
      expect(fs.existsSync(ogPath), `Missing OG WebP: ${ogPath}`).toBe(true)
    }
  })

  it('card WebP files are <= 200 KB (manifest bytes)', () => {
    const manifest = loadManifest()
    if (manifest.items.length === 0) return // graceful skip

    for (const item of manifest.items) {
      expect(item.bytes_webp).toBeLessThanOrEqual(
        MAX_BYTES,
        `${item.slug}.webp exceeds 200 KB (${item.bytes_webp} bytes)`,
      )
    }
  })

  it('card JPG files are <= 200 KB (manifest bytes)', () => {
    const manifest = loadManifest()
    if (manifest.items.length === 0) return // graceful skip

    for (const item of manifest.items) {
      expect(item.bytes_jpg).toBeLessThanOrEqual(
        MAX_BYTES,
        `${item.slug}.jpg exceeds 200 KB (${item.bytes_jpg} bytes)`,
      )
    }
  })

  it('OG WebP files are <= 200 KB (manifest bytes)', () => {
    const manifest = loadManifest()
    if (manifest.items.length === 0) return // graceful skip

    for (const item of manifest.items) {
      expect(item.bytes_og).toBeLessThanOrEqual(
        MAX_BYTES,
        `${item.slug}-og.webp exceeds 200 KB (${item.bytes_og} bytes)`,
      )
    }
  })

  it('disk file sizes match manifest bytes for WebP cards', () => {
    const manifest = loadManifest()
    if (manifest.items.length === 0) return // graceful skip

    for (const item of manifest.items) {
      const webpPath = path.join(SEED_VISUALS_DIR, `${item.slug}.webp`)
      if (!fs.existsSync(webpPath)) continue // already caught above
      const stat = fs.statSync(webpPath)
      expect(stat.size).toBe(item.bytes_webp)
    }
  })

  it('all slug values are non-empty strings without path separators', () => {
    const manifest = loadManifest()
    if (manifest.items.length === 0) return // graceful skip

    for (const item of manifest.items) {
      expect(typeof item.slug).toBe('string')
      expect(item.slug.length).toBeGreaterThan(0)
      expect(item.slug).not.toContain('/')
      expect(item.slug).not.toContain('\\')
      // No tmpl- prefix (slugs are the short form, without domain prefix)
      expect(item.slug).not.toMatch(/^tmpl-/)
    }
  })
})
