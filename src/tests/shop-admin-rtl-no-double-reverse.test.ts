// B5900-019: Shop-Admin setzt dir="rtl" bereits im Layout (src/app/(shop-admin)/layout.tsx).
// Zusätzliche rtl:flex-row-reverse / rtl:space-x-reverse / rtl:text-right drehen in AR/HE zurück
// in LTR-Reihenfolge. Dieser Scan verhindert die Rückkehr der doppelten Umkehrung.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['src/components/shop-admin', 'src/app/(shop-admin)']
const FORBIDDEN = [
  /rtl:flex-row-reverse/,
  /rtl:flex-col-reverse/,
  /rtl:space-x-reverse/,
  /rtl:text-right/,
  /ltr:text-left/,
  /rtl:m[rl]-/,
  /ltr:m[rl]-/,
  /\bspace-x-/,
]

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx|ts)$/.test(e)) out.push(p)
  }
  return out
}

describe('Shop-Admin: keine doppelte RTL-Umkehrung', () => {
  it('Layout setzt dir=rtl', () => {
    const src = readFileSync('src/app/(shop-admin)/layout.tsx', 'utf8')
    expect(src).toMatch(/dir=\{dir\}/)
  })

  it('enthält keine rtl:-Umkehr-Klassen oder space-x', () => {
    const hits: string[] = []
    for (const root of ROOTS) {
      for (const f of walk(root)) {
        const lines = readFileSync(f, 'utf8').split('\n')
        lines.forEach((l, i) => {
          if (FORBIDDEN.some((re) => re.test(l))) hits.push(`${f}:${i + 1}: ${l.trim()}`)
        })
      }
    }
    expect(hits).toEqual([])
  })
})
