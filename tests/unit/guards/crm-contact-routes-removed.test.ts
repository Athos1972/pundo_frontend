/**
 * Architektur-Guard (F7600 CRM-Backbone, Org-Schnitt T14 Org-Routen und Navigation): Die Seiten unter
 * `/admin/crm/contacts/**` sind ersatzlos entfallen (keine Weiterleitung, EA13 entfällt). Kein Quelltext unter `src/`
 * (Seiten, Komponenten, Hilfe-Links, Navigation) darf noch auf diese Route zeigen, sonst führt der Link auf die 404-Seite.
 * Tests (`src/tests/`) sind ausgenommen, weil sie das Fehlen ausdrücklich prüfen. Playwright-Specs und Videos stellen
 * T19 und T24/T24b um.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = join(process.cwd(), 'src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return p === join(SRC, 'tests') ? [] : walk(p)
    return /\.(ts|tsx)$/.test(n) ? [p] : []
  })
}

describe('guard: no link to the removed CRM contact pages', () => {
  const files = walk(SRC)

  it('finds the sources (the guard does not run empty)', () => {
    expect(files.length).toBeGreaterThan(100)
    expect(files.some((f) => f.includes('crm/orgs'))).toBe(true)
  })

  it('no source file mentions crm/contacts', () => {
    const offenders = files.filter((f) => readFileSync(f, 'utf8').includes('crm/contacts')).map((f) => relative(process.cwd(), f))
    expect(offenders).toEqual([])
  })

  it('the route folder is gone (no redirect page)', () => {
    expect(existsSync(join(SRC, 'app/(system-admin)/admin/(portal)/crm/contacts'))).toBe(false)
  })
})
