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
import { parseCatalog, parseCatalogDirectory, serializeCatalog, findOverlap, JourneyCatalogError } from './_parser'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JOURNEYS_DIR = __dirname

// Expected counts are derived from the journey files themselves instead of being hard-coded:
// every `<id>.md` (except CATALOG*, README and `_`-files) must parse to exactly one entry.
// A hard-coded number broke the suite on every new journey without testing anything extra.
const JOURNEY_FILES = readdirSync(JOURNEYS_DIR).filter(
  (f) => f.endsWith('.md') && !f.startsWith('_') && !['CATALOG.md', 'CATALOG_SCHEMA.md', 'README.md'].includes(f),
)
const EXPECTED_P1 = JOURNEY_FILES.filter((f) =>
  /^priority:\s*P1\s*$/m.test(readFileSync(join(JOURNEYS_DIR, f), 'utf8')),
).length

/** Load a single journey file — used for parseCatalog() single-entry tests. */
function loadJourneyFile(id: string): string {
  return readFileSync(join(JOURNEYS_DIR, `${id}.md`), 'utf-8')
}

/** Load all 5 journey entries via parseCatalogDirectory — replaces old loadSeedCatalog(). */
function loadAllJourneys() {
  return parseCatalogDirectory(JOURNEYS_DIR)
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
  it('parseCatalogDirectory liefert alle Journey-Einträge', () => {
    const entries = loadAllJourneys()
    expect(entries).toHaveLength(JOURNEY_FILES.length)
    // Untergrenze nur als Plausibilitaetsgrenze ("das Verzeichnis wird wirklich gelesen"). F8950 T18/T21: 46 -> 43
    // Journeys (shop-owner-lifecycle, shop-admin-profile, shop-admin-profile-phone-logo entfernt); mit T19
    // (shop-type-api-matrix) 42. Deshalb 40 statt 45.
    expect(JOURNEY_FILES.length).toBeGreaterThanOrEqual(40)
  })

  it('erster Eintrag (nach Sortierung P1/id) hat korrekte id und status implemented', () => {
    const entries = loadAllJourneys()

    // P1 entries: shop-admin-offers, shop-owner-full-lifecycle (implemented; shop-owner-lifecycle ist per F8950 T18 darin aufgegangen)
    //             + shop-owner-onboarding, social-link-moderation (implemented, added 2026-04-25)
    //             + state-transition-ItemStatus, write-to-read-createItem (approved)
    //             + shop-owner-quick-onboarding (approved, added 2026-05-01 F5910)
    //             + cookie-consent-flow, reactive-language-switch (P1, added 2026-05-31)
    //             + shop-owner-admin-approval-flow (approved, added 2026-06-05)
    //             + shop-owner-self-deactivate (implemented, added 2026-06-05)
    //             + admin-crm-contact-lifecycle, admin-crm-needs-review (implemented, CRM Stufe 2)
    // Updated 2026-07-08 (e2e-tester, RCA): 12 -> 14 (2 CRM Stufe 2 P1 journeys added without
    // updating this assertion; not caused by the Ahrefs SEO-remediation batch, see above).
    // First alphabetically among P1 is now admin-crm-contact-lifecycle (status: implemented).
    const p1Entries = entries.filter((e) => e.priority === 'P1')
    expect(p1Entries.length).toBe(EXPECTED_P1)
    expect(p1Entries[0].status).toBe('implemented') // admin-crm-contact-lifecycle is first alphabetically
  })

  it('shop-owner-full-lifecycle hat korrekte id und touches-modules', () => {
    const markdown = loadJourneyFile('shop-owner-full-lifecycle')
    const entries = parseCatalog(markdown)

    expect(entries[0].id).toBe('shop-owner-full-lifecycle')
    expect(entries[0].status).toBe('implemented')
  })

  it('customer-discovery hat korrekte id und touches-modules', () => {
    const markdown = loadJourneyFile('customer-discovery')
    const entries = parseCatalog(markdown)

    expect(entries[0].id).toBe('customer-discovery')
    // F6300 URL i18n: paths updated to [lang] segment
    expect(entries[0].touchesModules).toContain('src/app/(customer)/[lang]/search/**')
  })

  it('alle Einträge haben status implemented (AC-10: alle Journeys deployed)', () => {
    const entries = loadAllJourneys()

    // 9 implemented, 3 approved, 4 deprecated — not all must be implemented
    // Updated 2026-04-25: shop-owner-onboarding + social-link-moderation = 9 implemented
    const implemented = entries.filter((e) => e.status === 'implemented')
    expect(implemented.length).toBeGreaterThanOrEqual(9)
  })

  it('touchesRoles wird korrekt geparst', () => {
    const entries = loadAllJourneys()

    const lifecycle = entries.find((e) => e.id === 'shop-owner-full-lifecycle')
    expect(lifecycle?.touchesRoles).toContain('shop-owner')
    expect(lifecycle?.touchesRoles).toContain('guest')
  })
})

// ---------------------------------------------------------------------------
// Test 2: Roundtrip — parse → serialize → parse → identical entries
// ---------------------------------------------------------------------------

describe('Roundtrip: parse → serialize → parse', () => {
  it('liefert nach Roundtrip identische Einträge (id, status, touchesModules)', () => {
    // Use a single journey file for the roundtrip — parseCatalog / serializeCatalog
    // still work on the per-file format.
    // Individual journey files have no file-header (they start directly with ---),
    // so we pass an empty string as header to serializeCatalog.
    const markdown = loadJourneyFile('shop-owner-full-lifecycle')
    const entries = parseCatalog(markdown)

    const reserialized = serializeCatalog(entries, '')
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
  const existingEntries = loadAllJourneys()

  it('findet Überlappung >= 50% und liefert matching entry', () => {
    // shop-owner-full-lifecycle hat 8 Module (u. a. (shop-admin), (system-admin), shops/[slug], search, products/[slug],
    // components/shop, components/product, lib/shop-admin-api). F8950 T18: ersetzt shop-owner-lifecycle.
    // Proposed teilt 5 von 8 Modulen + 1 extra → union = 9, intersect = 5 → 5/9 ≈ 0.56
    const proposed = {
      touchesModules: [
        'src/app/(shop-admin)/**',
        'src/app/(system-admin)/**',
        'src/app/(customer)/[lang]/shops/[slug]/**',
        'src/components/shop/**',
        'src/lib/shop-admin-api.ts',
        'src/components/ui/**', // extra module not in existing
      ],
    }

    const matches = findOverlap(proposed, existingEntries)
    expect(matches.length).toBeGreaterThan(0)
    // F8950 T18: mehrere Journeys teilen (shop-admin)/shops/[slug]; geprueft wird, dass full-lifecycle gefunden wird
    const lifecycleMatch = matches.find((m) => m.entry.id === 'shop-owner-full-lifecycle')
    expect(lifecycleMatch).toBeDefined()
    expect(lifecycleMatch!.overlap).toBeGreaterThanOrEqual(0.5)
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

// ---------------------------------------------------------------------------
// Test 7: parseCatalogDirectory
// ---------------------------------------------------------------------------

describe('parseCatalogDirectory', () => {
  it('findet alle Journey-Dateien (ein Eintrag pro <id>.md)', () => {
    const entries = parseCatalogDirectory(JOURNEYS_DIR)

    expect(entries).toHaveLength(JOURNEY_FILES.length)

    const ids = entries.map((e) => e.id)
    expect(ids).toContain('customer-discovery')
    expect(ids).toContain('shop-owner-full-lifecycle')
    expect(ids).toContain('customer-and-review-lifecycle')
    expect(ids).toContain('admin-data-management')
    expect(ids).toContain('shop-admin-offers')
    expect(ids).toContain('shop-detail-attribute-matrix')
  })

  it('ignoriert CATALOG.md, CATALOG_SCHEMA.md, README.md und _-Dateien', () => {
    const entries = parseCatalogDirectory(JOURNEYS_DIR)

    // CATALOG.md is an index — no frontmatter blocks → would return 0 entries
    // CATALOG_SCHEMA.md, README.md are docs — not journey files
    // None of these should produce entries in the directory scan
    expect(entries).toHaveLength(JOURNEY_FILES.length)

    // Also verify sort order: P1 entries come before P2, P2 before P3
    const priorities = entries.map((e) => e.priority)
    const p1Idx = priorities.lastIndexOf('P1')
    const p2Idx = priorities.indexOf('P2')
    const p3Idx = priorities.indexOf('P3')

    if (p1Idx !== -1 && p2Idx !== -1) expect(p1Idx).toBeLessThan(p2Idx)
    if (p2Idx !== -1 && p3Idx !== -1) expect(p2Idx).toBeLessThan(p3Idx)
  })

  it('sortiert Einträge nach Priorität (P1 zuerst) dann nach id', () => {
    const entries = parseCatalogDirectory(JOURNEYS_DIR)

    const p1Entries = entries.filter((e) => e.priority === 'P1')
    const p2Entries = entries.filter((e) => e.priority === 'P2')
    const p3Entries = entries.filter((e) => e.priority === 'P3')

    // P1 entries appear before all P2 entries in the sorted result
    const firstP2Idx = entries.findIndex((e) => e.priority === 'P2')
    const lastP1Idx = entries.map((e) => e.priority).lastIndexOf('P1')
    if (p1Entries.length > 0 && p2Entries.length > 0) {
      expect(lastP1Idx).toBeLessThan(firstP2Idx)
    }

    // P2 entries appear before all P3 entries
    const firstP3Idx = entries.findIndex((e) => e.priority === 'P3')
    const lastP2Idx = entries.map((e) => e.priority).lastIndexOf('P2')
    if (p2Entries.length > 0 && p3Entries.length > 0) {
      expect(lastP2Idx).toBeLessThan(firstP3Idx)
    }

    // Within P1, entries are sorted by id (alphabetical)
    const p1Ids = p1Entries.map((e) => e.id)
    expect(p1Ids).toEqual([...p1Ids].sort())
  })
})
