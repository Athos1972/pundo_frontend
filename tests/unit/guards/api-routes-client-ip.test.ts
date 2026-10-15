/**
 * Architektur-Guard (F8950 T33): Jede `route.ts` unter `src/app/api`, die das Backend anspricht (`BACKEND_URL`), muss den
 * Client-IP-Helper `@/lib/proxy/client-ip` einbinden, sonst sieht das Backend die IP des Next-Servers statt der des Kunden
 * und die Rate-Limits greifen falsch. Prueft viele Dateien auf einmal; das Verhalten des Helpers selbst deckt
 * `src/tests/proxy-client-ip-routes.test.ts` ab (vorher stand dieser Guard als "static guard" ebenda).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : n === 'route.ts' ? [p] : []
  })
}

describe('guard: API-Routen reichen die Client-IP weiter', () => {
  const routes = walk(join(process.cwd(), 'src/app/api'))

  it('findet die API-Routen (Guard laeuft nicht ins Leere)', () => {
    expect(routes.length).toBeGreaterThan(5)
  })

  it('jede route.ts mit BACKEND_URL importiert den Client-IP-Helper', () => {
    const offenders = routes.filter((f) => {
      const s = readFileSync(f, 'utf8')
      return s.includes('BACKEND_URL') && !s.includes('@/lib/proxy/client-ip')
    })
    expect(offenders).toEqual([])
  })
})
