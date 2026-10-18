// @vitest-environment node
// B6998-001 — Guard: api.ts liest isPrefetchRequest aus dem internen Next-Work-Store, weil Next den Header
// next-router-prefetch aus headers() und Proxy entfernt. Bricht dieser Test bei einem Next-Update, muss der
// Pfad in isNextPrefetchRender (src/lib/api.ts) neu bestimmt werden (sonst erzeugt Link-Prefetch wieder Activity-Events).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

describe('Next internal prefetch flag (B6998-001)', () => {
  it('exports workAsyncStorage from the path api.ts imports', async () => {
    const mod = await import('next/dist/server/app-render/work-async-storage.external')
    expect(typeof mod.workAsyncStorage.getStore).toBe('function')
  })

  it('still sets isPrefetchRequest on the render work store', () => {
    const req = createRequire(import.meta.url)
    const dir = req.resolve('next/package.json').replace(/package\.json$/, '')
    const src = readFileSync(`${dir}dist/server/async-storage/work-store.js`, 'utf8')
    expect(src).toContain('isPrefetchRequest')
  })
})
