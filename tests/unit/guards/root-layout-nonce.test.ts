// B7600-001 / B8950-016: every root layout (the one that renders <html>) must opt into dynamic rendering.
//
// The strict CSP (src/proxy.ts) allows only scripts with the per-request nonce. A statically prerendered page has no
// nonce on its scripts, the browser blocks all of them, the page never hydrates: buttons are dead. This happened to
// the public opt-out page (/crm/opt-out) of every outreach mail. Reading headers()/cookies() (or force-dynamic) in the
// root layout makes the whole segment dynamic.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const APP = join(__dirname, '..', '..', '..', 'src', 'app')

function layouts(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return layouts(path)
    return name === 'layout.tsx' ? [path] : []
  })
}

describe('root layouts render dynamically (CSP nonce)', () => {
  const roots = layouts(APP).filter((f) => readFileSync(f, 'utf8').includes('<html'))

  it('finds the known root layouts', () => {
    expect(roots.length).toBeGreaterThanOrEqual(4)
  })

  it.each(roots)('%s reads headers()/cookies() or is force-dynamic', (file) => {
    const src = readFileSync(file, 'utf8')
    const dynamic = /await\s+(headers|cookies)\(\)|getLangServer\(|getBrandFromHeaders\(|dynamic\s*=\s*['"]force-dynamic['"]/.test(src)
    expect(dynamic, `${file} is statically prerendered: its pages get no CSP nonce and never hydrate`).toBe(true)
  })
})
