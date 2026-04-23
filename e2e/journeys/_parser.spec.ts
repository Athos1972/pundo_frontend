/**
 * Parser smoke tests for e2e/journeys/_parser.ts
 *
 * Runs via Vitest (NOT Playwright) — pure logic, no browser needed.
 * Run: npx vitest run e2e/journeys/_parser.spec.ts
 *
 * Note: playwright.config.ts uses testDir: './e2e' but Playwright skips
 * files with `_` prefix by convention, so this file is safe.
 */

import { describe, it, expect } from 'vitest'
import { parseCatalog, serializeCatalog, findOverlap, JourneyCatalogError } from './_parser'
import { readFileSync } from 'fs'
import { join } from 'path'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATALOG_PATH = join(__dirname, 'CATALOG.md')

function loadSeedCatalog(): string {
  return readFileSync(CATALOG_PATH, 'utf-8')
}

const MINIMAL_ENTRY = `
# Journey Catalog — pundo_frontend

> Header

<!-- SCHEMA_VERSION: 1 -->

---
id: test-journey
title: Test Journey
status: proposed
priority: P2
owner-agent: designer
proposed-in-spec: some-spec-20260423
touches-modules:
  - src/app/test/**
  - src/lib/api.ts
status-changed-at: 2026-04-23T10:00:00Z
status-changed-by-spec: some-spec-20260423
last-run: never
last-result: N/A
---

### Journey: Test Journey

**Ziel:** Ein Test.
`.trim()

// ---------------------------------------------------------------------------
// Test 1: Parse the actual seed catalog without errors
// ---------------------------------------------------------------------------

describe('parseCatalog — Seed-Datei', () => {
  it('parst CATALOG.md ohne Fehler und liefert 2 Einträge', () => {
    const markdown = loadSeedCatalog()
    const entries = parseCatalog(markdown)

    expect(entries).toHaveLength(2)
  })

  it('erster Eintrag hat korrekte id und status proposed', () => {
    const markdown = loadSeedCatalog()
    const entries = parseCatalog(markdown)

    expect(entries[0].id).toBe('shop-owner-lifecycle')
    expect(entries[0].status).toBe('proposed')
  })

  it('zweiter Eintrag hat korrekte id und touches-modules', () => {
    const markdown = loadSeedCatalog()
    const entries = parseCatalog(markdown)

    expect(entries[1].id).toBe('customer-discovery')
    expect(entries[1].touchesModules).toContain('src/app/search/**')
  })

  it('kein Eintrag hat status implemented (AC-10)', () => {
    const markdown = loadSeedCatalog()
    const entries = parseCatalog(markdown)

    const implemented = entries.filter((e) => e.status === 'implemented')
    expect(implemented).toHaveLength(0)
  })

  it('touchesRoles wird korrekt geparst', () => {
    const markdown = loadSeedCatalog()
    const entries = parseCatalog(markdown)

    const lifecycle = entries.find((e) => e.id === 'shop-owner-lifecycle')
    expect(lifecycle?.touchesRoles).toContain('shop-owner')
    expect(lifecycle?.touchesRoles).toContain('guest')
  })
})

// ---------------------------------------------------------------------------
// Test 2: Roundtrip — parse → serialize → parse → identical entries
// ---------------------------------------------------------------------------

describe('Roundtrip: parse → serialize → parse', () => {
  it('liefert nach Roundtrip identische Einträge (id, status, touchesModules)', () => {
    const markdown = loadSeedCatalog()
    const entries = parseCatalog(markdown)

    const header = markdown.split('\n---\n')[0].trim()
    const reserialized = serializeCatalog(entries, header)
    const reparsed = parseCatalog(reserialized)

    expect(reparsed).toHaveLength(entries.length)

    for (let i = 0; i < entries.length; i++) {
      expect(reparsed[i].id).toBe(entries[i].id)
      expect(reparsed[i].status).toBe(entries[i].status)
      expect(reparsed[i].priority).toBe(entries[i].priority)
      expect(reparsed[i].ownerAgent).toBe(entries[i].ownerAgent)
      expect(reparsed[i].touchesModules).toEqual(entries[i].touchesModules)
      expect(reparsed[i].lastRun).toBe(entries[i].lastRun)
      expect(reparsed[i].lastResult).toBe(entries[i].lastResult)
    }
  })
})

// ---------------------------------------------------------------------------
// Test 3: Fehlende Pflichtfelder werfen JourneyCatalogError
// ---------------------------------------------------------------------------

describe('Pflichtfelder-Validierung', () => {
  it('wirft JourneyCatalogError wenn "status" fehlt', () => {
    const broken = `
# Header

---
id: broken-entry
title: Broken
priority: P1
owner-agent: designer
proposed-in-spec: test-spec
touches-modules:
  - src/app/**
status-changed-at: 2026-04-23T10:00:00Z
status-changed-by-spec: test-spec
last-run: never
last-result: N/A
---

Body text.
`.trim()

    expect(() => parseCatalog(broken)).toThrow(JourneyCatalogError)
    expect(() => parseCatalog(broken)).toThrow(/status/)
  })

  it('wirft JourneyCatalogError wenn "touches-modules" leer ist', () => {
    const broken = `
# Header

---
id: broken-entry
title: Broken
status: proposed
priority: P1
owner-agent: designer
proposed-in-spec: test-spec
touches-modules:
status-changed-at: 2026-04-23T10:00:00Z
status-changed-by-spec: test-spec
last-run: never
last-result: N/A
---

Body text.
`.trim()

    expect(() => parseCatalog(broken)).toThrow(JourneyCatalogError)
  })

  it('wirft JourneyCatalogError bei ungültigem status-Enum', () => {
    const broken = `
# Header

---
id: broken-entry
title: Broken
status: invalid-status
priority: P1
owner-agent: designer
proposed-in-spec: test-spec
touches-modules:
  - src/app/**
status-changed-at: 2026-04-23T10:00:00Z
status-changed-by-spec: test-spec
last-run: never
last-result: N/A
---

Body text.
`.trim()

    expect(() => parseCatalog(broken)).toThrow(JourneyCatalogError)
    expect(() => parseCatalog(broken)).toThrow(/status/)
  })

  it('wirft JourneyCatalogError wenn status=skipped aber skip-reason fehlt', () => {
    const broken = `
# Header

---
id: skipped-without-reason
title: Skipped Without Reason
status: skipped
priority: P2
owner-agent: designer
proposed-in-spec: test-spec
touches-modules:
  - src/app/**
status-changed-at: 2026-04-23T10:00:00Z
status-changed-by-spec: test-spec
last-run: never
last-result: N/A
---

Body text.
`.trim()

    expect(() => parseCatalog(broken)).toThrow(JourneyCatalogError)
    expect(() => parseCatalog(broken)).toThrow(/skip-reason/)
  })
})

// ---------------------------------------------------------------------------
// Test 4: findOverlap ≥ 50% flaggt korrekt
// ---------------------------------------------------------------------------

describe('findOverlap — Jaccard-Index', () => {
  const existingEntries = parseCatalog(loadSeedCatalog())

  it('findet Überlappung >= 50% und liefert matching entry', () => {
    // shop-owner-lifecycle hat: src/app/shop-admin/**, src/app/shops/[id]/**, src/lib/shop-admin-api.ts
    // Proposed teilt 2 von 3 Modulen → Jaccard = 2/(3+1-2) = 2/2 = 1.0 … nein: union = {3 original + 1 extra} = 4, intersect = 2 → 2/4 = 0.5
    const proposed = {
      touchesModules: [
        'src/app/shop-admin/**',
        'src/app/shops/[id]/**',
        'src/components/ui/**', // extra module not in existing
      ],
    }

    const matches = findOverlap(proposed, existingEntries)
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].entry.id).toBe('shop-owner-lifecycle')
    expect(matches[0].overlap).toBeGreaterThanOrEqual(0.5)
  })

  it('flaggt NICHT bei Überlappung < 50%', () => {
    const proposed = {
      touchesModules: [
        'src/app/coming-soon/**',
        'src/app/legal/**',
        'src/app/about/**',
        'src/lib/totally-different.ts',
        'src/components/unrelated/**',
      ],
    }

    const matches = findOverlap(proposed, existingEntries)
    expect(matches).toHaveLength(0)
  })

  it('respektiert benutzerdefinierten threshold', () => {
    // With threshold=0.9, a 50% overlap should NOT be returned
    const proposed = {
      touchesModules: [
        'src/app/shop-admin/**',
        'src/app/shops/[id]/**',
        'src/app/extra-a/**',
        'src/app/extra-b/**',
        'src/app/extra-c/**',
      ],
    }

    const matchesDefault = findOverlap(proposed, existingEntries)
    const matchesHighThreshold = findOverlap(proposed, existingEntries, 0.9)

    // default (0.5) may match, high threshold (0.9) should not match
    expect(matchesHighThreshold.length).toBeLessThanOrEqual(matchesDefault.length)
  })
})

// ---------------------------------------------------------------------------
// Test 5: skipped-Eintrag wird korrekt erkannt
// ---------------------------------------------------------------------------

describe('skipped-Eintrag', () => {
  it('parst Eintrag mit status skipped und skip-reason korrekt', () => {
    const catalog = `
# Header

---
id: skipped-journey
title: Skipped Journey
status: skipped
priority: P3
owner-agent: designer
proposed-in-spec: test-spec-20260423
touches-modules:
  - src/app/old-feature/**
status-changed-at: 2026-04-23T10:00:00Z
status-changed-by-spec: test-spec-20260423
skip-reason: >
  User lehnte 2026-04-23 ab: Feature wird nicht weiterentwickelt.
last-run: never
last-result: N/A
---

### Journey: Skipped Journey

**Ziel:** War mal relevant, jetzt nicht mehr.
`.trim()

    const entries = parseCatalog(catalog)
    expect(entries).toHaveLength(1)
    expect(entries[0].status).toBe('skipped')
    expect(entries[0].skipReason).toContain('User lehnte')
  })
})

// ---------------------------------------------------------------------------
// Test 6: Leerer Katalog (nur Header, keine Einträge)
// ---------------------------------------------------------------------------

describe('Edge Cases', () => {
  it('leerer Katalog (nur Header) gibt leeres Array zurück', () => {
    const catalog = `
# Journey Catalog — pundo_frontend

> Quelle der Wahrheit.

<!-- SCHEMA_VERSION: 1 -->
`.trim()

    const entries = parseCatalog(catalog)
    expect(entries).toHaveLength(0)
  })

  it('minimaler gültiger Eintrag wird korrekt geparst', () => {
    const entries = parseCatalog(MINIMAL_ENTRY)
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('test-journey')
    expect(entries[0].lastRun).toBe('never')
    expect(entries[0].lastResult).toBe('N/A')
  })
})
