/**
 * Guard (B5930-001): Customer-Code darf Datumsangaben nicht ohne Locale formatieren (Server-Locale statt Seitensprache,
 * Hydration-Abweichung). Stattdessen `formatDate` aus `@/lib/format-date` oder explizite Locale verwenden.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return n === 'system-admin' ? [] : walk(p)
    return /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : []
  })
}

const files = ['src/app/(customer)', 'src/components', 'src/lib'].flatMap((d) => walk(join(ROOT, d)))

const PATTERNS: RegExp[] = [
  /Intl\.DateTimeFormat\(\s*undefined/,
  /Intl\.DateTimeFormat\(\s*\)/,
  /\.toLocale(Date|Time)?String\(\s*\)/,
]

describe('guard: Datumsformatierung mit Locale', () => {
  it('scannt genug Dateien', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('keine Formatierung ohne Locale', () => {
    const offenders = files.flatMap((f) => {
      const s = readFileSync(f, 'utf8')
      return PATTERNS.filter((re) => re.test(s)).map(() => f.replace(ROOT + '/', ''))
    })
    expect(offenders).toEqual([])
  })
})
