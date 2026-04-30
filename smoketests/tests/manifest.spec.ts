import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import { ManifestSchema, AssertSchema } from '../manifest.schema.js'
import type { Manifest } from '../manifest.schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MANIFEST_PATH = join(__dirname, '..', 'manifest.yaml')

function loadManifest(): unknown {
  const raw = readFileSync(MANIFEST_PATH, 'utf-8')
  return yaml.load(raw)
}

describe('manifest.yaml — schema validation', () => {
  it('parses and validates without errors', () => {
    const raw = loadManifest()
    const result = ManifestSchema.safeParse(raw)
    if (!result.success) {
      console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
  })

  it('has version 1', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    expect(manifest.version).toBe(1)
  })

  it('has at least 2 brands with valid URLs', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    expect(manifest.brands.length).toBeGreaterThanOrEqual(2)
    for (const brand of manifest.brands) {
      expect(brand.base_url).toMatch(/^https?:\/\//)
    }
  })

  it('has all 6 required languages', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    const langs = manifest.languages
    expect(langs).toContain('en')
    expect(langs).toContain('de')
    expect(langs).toContain('el')
    expect(langs).toContain('ru')
    expect(langs).toContain('ar')
    expect(langs).toContain('he')
  })

  it('has at least one P0 check', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    const p0Checks = manifest.checks.filter((c) => c.priority === 'P0')
    expect(p0Checks.length).toBeGreaterThan(0)
  })

  it('includes guides-list check (regression guard for 2026-04-29)', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    const guidesCheck = manifest.checks.find((c) => c.id === 'guides-list')
    expect(guidesCheck).toBeDefined()
    expect(guidesCheck?.priority).toBe('P0')
    expect(guidesCheck?.per_language).toBe(true)
    const countAssert = guidesCheck?.asserts.find((a) => a.type === 'selector-count-min')
    expect(countAssert).toBeDefined()
  })

  it('includes guide-detail-sample with resolve_first_item', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    const detailCheck = manifest.checks.find((c) => c.id === 'guide-detail-sample')
    expect(detailCheck).toBeDefined()
    expect(detailCheck?.resolve_first_item).toBe(true)
  })

  it('all check ids are unique', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    const ids = manifest.checks.map((c) => c.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('all check ids match pattern [a-z0-9-]', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    for (const check of manifest.checks) {
      expect(check.id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('every check has at least one assert', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    for (const check of manifest.checks) {
      expect(check.asserts.length).toBeGreaterThan(0)
    }
  })

  it('all assert types are valid', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    for (const check of manifest.checks) {
      for (const assert of check.asserts) {
        const result = AssertSchema.safeParse(assert)
        if (!result.success) {
          console.error(`Invalid assert in check "${check.id}":`, assert)
        }
        expect(result.success).toBe(true)
      }
    }
  })

  it('rtl-arabic check targets html[dir=rtl]', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    const rtlCheck = manifest.checks.find((c) => c.id === 'rtl-arabic')
    expect(rtlCheck).toBeDefined()
    const attrAssert = rtlCheck?.asserts.find((a) => a.type === 'html-attribute')
    expect(attrAssert).toBeDefined()
    if (attrAssert?.type === 'html-attribute') {
      expect(attrAssert.selector).toBe('html')
      expect(attrAssert.attribute).toBe('dir')
      expect(attrAssert.expected).toBe('rtl')
    }
  })

  it('login-flow check is in authenticated phase', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    const loginCheck = manifest.checks.find((c) => c.id === 'login-flow')
    expect(loginCheck).toBeDefined()
    expect(loginCheck?.phase).toBe('authenticated')
  })

  it('protected-profile-blocks-anon is negative-auth phase', () => {
    const manifest = ManifestSchema.parse(loadManifest()) as Manifest
    const protectedCheck = manifest.checks.find((c) => c.id === 'protected-profile-blocks-anon')
    expect(protectedCheck).toBeDefined()
    expect(protectedCheck?.phase).toBe('negative-auth')
  })
})
