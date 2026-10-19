/**
 * F8960 guard: SOP texts and video IDs must never reach a client bundle.
 * No file with 'use client' may import system-admin-help or system-admin-help-content.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : []
  })
}

describe('system-admin help data stays server-side', () => {
  const files = walk(join(process.cwd(), 'src')).filter((f) => !f.includes('/src/tests/'))
  const clientFiles = files.filter((f) => /^\s*['"]use client['"]/m.test(readFileSync(f, 'utf8').slice(0, 400)))

  it('scans a plausible number of client files', () => {
    expect(clientFiles.length).toBeGreaterThan(20)
  })

  it('no client component imports the help data or content', () => {
    const offenders = clientFiles.filter((f) => /from\s+['"]@\/lib\/system-admin-help(-content)?['"]/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
