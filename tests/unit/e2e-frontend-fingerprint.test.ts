/**
 * B8950-012 TF1: Fingerabdruck + Prozess-Klassifikation des E2E-Frontend-Starts.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  assertFrontendFresh,
  classifyChain,
  classifyCommand,
  computeFingerprint,
  fingerprintsEqual,
  newestMtimeMs,
  STAMP_REL,
} from '../../scripts/e2e-frontend.cjs'

describe('classifyCommand', () => {
  it.each([
    ['node /repo/node_modules/.bin/next dev -H 0.0.0.0 -p 3500', 'dev'],
    ['npm run dev:test', 'dev'],
    ['node /repo/.next/dev/build/chunks/pool_entry.js 59152', 'dev'],
    ['node /Users/x/pundo_frontend/.next/standalone/server.js', 'standalone'],
    ['node .next/standalone/server.js', 'standalone'],
    ['node scripts/e2e-frontend.cjs start', 'standalone'],
    ['next-server (v16.3.8) ', 'unknown'],
    ['python -m http.server 3500', 'unknown'],
    ['', 'unknown'],
  ])('%s -> %s', (cmd, kind) => {
    expect(classifyCommand(cmd)).toBe(kind)
  })

  it('chain: the dev parent classifies the anonymous next-server child as dev', () => {
    expect(classifyChain(['next-server (v16.3.8) ', 'node /repo/node_modules/.bin/next dev -p 3500'])).toBe('dev')
    expect(classifyChain(['next-server (v16.3.8) ', '-zsh'])).toBe('unknown')
    // Standalone: Prozesstitel "next-server", Elternprozess = webServer-Skript
    expect(classifyChain(['next-server (v16.3.8) ', 'node scripts/e2e-frontend.cjs start', 'npm exec playwright test'])).toBe('standalone')
    // E2E_FRONTEND_MODE=dev: das Skript startet npm run dev:test → dev gewinnt
    expect(classifyChain(['next-server (v16.3.8) ', 'node next dev -p 3500', 'npm run dev:test', 'node scripts/e2e-frontend.cjs start'])).toBe('dev')
  })
})

describe('fingerprint + assertFrontendFresh', () => {
  let root: string
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-fp-'))
    fs.mkdirSync(path.join(root, 'src'))
    fs.mkdirSync(path.join(root, 'public'))
    fs.writeFileSync(path.join(root, 'src/a.ts'), 'x')
    fs.writeFileSync(path.join(root, 'package.json'), '{}')
  })
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }))

  const fp = () => computeFingerprint({ repoRoot: root, backendUrl: 'http://localhost:8500', head: 'abc' })
  function writeStamp(f: ReturnType<typeof fp>, builtAtMs = Date.now()) {
    fs.mkdirSync(path.join(root, '.next/standalone'), { recursive: true })
    fs.writeFileSync(path.join(root, STAMP_REL), JSON.stringify({ fingerprint: f, builtAtMs }))
  }
  const standaloneChain = (startedMs = Date.now() + 5000) =>
    [{ pid: 42, command: 'node /repo/.next/standalone/server.js', startedMs }]
  const quiet = () => {}

  it('is stable without changes and changes when a src file is touched', () => {
    const a = fp()
    expect(fingerprintsEqual(a, fp())).toBe(true)
    const later = new Date(Date.now() + 60_000)
    fs.utimesSync(path.join(root, 'src/a.ts'), later, later)
    expect(fingerprintsEqual(a, fp())).toBe(false)
  })

  it('changes with git head and backend url', () => {
    const a = fp()
    expect(fingerprintsEqual(a, computeFingerprint({ repoRoot: root, backendUrl: 'http://localhost:8500', head: 'def' }))).toBe(false)
    expect(fingerprintsEqual(a, computeFingerprint({ repoRoot: root, backendUrl: 'http://localhost:9999', head: 'abc' }))).toBe(false)
  })

  it('ignores node_modules and missing inputs', () => {
    fs.mkdirSync(path.join(root, 'src/node_modules'))
    const a = newestMtimeMs(path.join(root, 'src'))
    fs.writeFileSync(path.join(root, 'src/node_modules/x'), 'y', { mode: 0o644 })
    const later = new Date(Date.now() + 120_000)
    fs.utimesSync(path.join(root, 'src/node_modules/x'), later, later)
    expect(newestMtimeMs(path.join(root, 'src'))).toBe(a)
    expect(newestMtimeMs(path.join(root, 'does-not-exist'))).toBe(0)
  })

  it('dev server: ok without stamp check', () => {
    const r = assertFrontendFresh({
      repoRoot: root, chain: [{ pid: 1, command: 'next-server (v16)', startedMs: 0 }, { pid: 2, command: 'node next dev -p 3500', startedMs: 0 }], log: quiet,
    })
    expect(r.mode).toBe('dev')
  })

  it('standalone with matching stamp is fresh', () => {
    writeStamp(fp(), Date.now() - 10_000)
    const r = assertFrontendFresh({ repoRoot: root, backendUrl: "http://localhost:8500", head: "abc", chain: standaloneChain(), log: quiet })
    expect(r.mode).toBe('standalone')
  })

  it('AK6(2): standalone older than a touched src file aborts', () => {
    writeStamp(fp(), Date.now() - 10_000)
    const later = new Date(Date.now() + 60_000)
    fs.utimesSync(path.join(root, 'src/a.ts'), later, later)
    expect(() => assertFrontendFresh({ repoRoot: root, head: 'abc', chain: standaloneChain(), log: quiet })).toThrow(/VERALTET/)
  })

  it('standalone started BEFORE the stamp was written (old process, rebuilt dir) aborts', () => {
    writeStamp(fp(), Date.now())
    expect(() => assertFrontendFresh({ repoRoot: root, head: 'abc', chain: standaloneChain(Date.now() - 600_000), log: quiet })).toThrow(/VERALTET/)
  })

  it('standalone without stamp aborts', () => {
    expect(() => assertFrontendFresh({ repoRoot: root, chain: standaloneChain(), log: quiet })).toThrow(/VERALTET/)
  })

  it('unknown process aborts unless explicitly allowed; nothing listening aborts', () => {
    const unknown = [{ pid: 9, command: 'python -m http.server', startedMs: 0 }]
    expect(() => assertFrontendFresh({ repoRoot: root, chain: unknown, env: {}, log: quiet })).toThrow(/Unbekannter Prozess/)
    expect(assertFrontendFresh({ repoRoot: root, chain: unknown, env: { E2E_ALLOW_UNKNOWN_FRONTEND: '1' }, log: quiet }).mode).toBe('unknown')
    expect(() => assertFrontendFresh({ repoRoot: root, chain: [], log: quiet })).toThrow(/kein Frontend/)
  })
})
