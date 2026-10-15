/**
 * B2250-001 guard: under dir="rtl", `text-align: end` is the LEFT edge. `rtl:text-end` (and a bare physical
 * `text-left`) therefore put text on the wrong side. Use the logical `text-start` / `text-end` without an rtl:
 * override, or an explicit `rtl:text-right` where the right edge is meant.
 * Mirrored physical pairs (`text-right rtl:text-left`) are deliberate and stay allowed.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'tests') continue
      walk(full, out)
    } else if (/\.(tsx|ts)$/.test(name)) out.push(full)
  }
  return out
}

describe('RTL text alignment guard (B2250-001)', () => {
  const files = walk(SRC)

  it('scans a plausible number of source files', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('no `rtl:text-end` anywhere (it resolves to the left edge in RTL)', () => {
    const offenders = files.filter(f => /rtl:text-end\b/.test(readFileSync(f, 'utf8')))
    expect(offenders.map(f => f.replace(SRC, 'src'))).toEqual([])
  })

  it('no bare physical `text-left` (does not mirror in RTL; use text-start)', () => {
    const offenders = files.filter(f => /(^|[^:\w-])text-left\b/m.test(readFileSync(f, 'utf8')))
    expect(offenders.map(f => f.replace(SRC, 'src'))).toEqual([])
  })
})
