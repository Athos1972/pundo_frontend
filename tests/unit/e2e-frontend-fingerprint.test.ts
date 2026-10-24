/**
 * B8950-012 TF1: Fingerabdruck + Prozess-Klassifikation des E2E-Frontend-Starts.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  assertFrontendFresh,
  assertModeAllowed,
  prepareGateFrontend,
  classifyChain,
  classifyCommand,
  computeFingerprint,
  fingerprintsEqual,
  newestMtimeMs,
  STAMP_REL,
  stampRel,
  buildLockPath,
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
      repoRoot: root, chain: [{ pid: 1, command: 'next-server (v16)', startedMs: 0 }, { pid: 2, command: 'node next dev -p 3500', startedMs: 0 }], env: {}, log: quiet,
    })
    expect(r.mode).toBe('dev')
  })

  it('standalone with matching stamp is fresh', () => {
    writeStamp(fp(), Date.now() - 10_000)
    const r = assertFrontendFresh({ repoRoot: root, backendUrl: "http://localhost:8500", head: "abc", chain: standaloneChain(), log: quiet })
    expect(r.mode).toBe('standalone')
  })

  it('worktree slot: build stamp and freshness check use its own dist path and the E2E backend URL', () => {
    const previousSlot = process.env.PUNDO_SLOT
    const previousTestBackend = process.env.TEST_BACKEND_URL
    const previousBackend = process.env.BACKEND_URL
    process.env.PUNDO_SLOT = '2'
    process.env.TEST_BACKEND_URL = 'http://127.0.0.1:8512'
    process.env.BACKEND_URL = 'http://127.0.0.1:8500'
    try {
      const built = computeFingerprint({ repoRoot: root, head: 'abc' })
      expect(built.backendUrl).toBe('http://127.0.0.1:8512')
      expect(stampRel()).toBe('.next-worktree-s2/standalone/.e2e-build-stamp.json')
      fs.mkdirSync(path.dirname(path.join(root, stampRel())), { recursive: true })
      fs.writeFileSync(path.join(root, stampRel()), JSON.stringify({ fingerprint: built, builtAtMs: Date.now() - 10_000 }))
      const check = assertFrontendFresh({
        repoRoot: root, backendUrl: 'http://127.0.0.1:8512', head: 'abc',
        chain: [{ pid: 42, command: 'node /repo/.next-worktree-s2/standalone/server.js', startedMs: Date.now() + 5_000 }], log: quiet,
      })
      expect(check.mode).toBe('standalone')
    } finally {
      if (previousSlot === undefined) delete process.env.PUNDO_SLOT
      else process.env.PUNDO_SLOT = previousSlot
      if (previousTestBackend === undefined) delete process.env.TEST_BACKEND_URL
      else process.env.TEST_BACKEND_URL = previousTestBackend
      if (previousBackend === undefined) delete process.env.BACKEND_URL
      else process.env.BACKEND_URL = previousBackend
    }
  })

  it('slots use separate dist paths but one checkout-wide build lock', () => {
    const previousSlot = process.env.PUNDO_SLOT
    try {
      process.env.PUNDO_SLOT = '1'
      expect(stampRel()).toContain('.next-worktree-s1/')
      const lock = buildLockPath(root)
      process.env.PUNDO_SLOT = '2'
      expect(stampRel()).toContain('.next-worktree-s2/')
      expect(buildLockPath(root)).toBe(lock)
    } finally {
      if (previousSlot === undefined) delete process.env.PUNDO_SLOT
      else process.env.PUNDO_SLOT = previousSlot
    }
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

  it('gate mode: next dev aborts with Gate-Modus message; without the variable it only warns', () => {
    const dev = [{ pid: 1, command: 'next-server (v16)', startedMs: 0 }, { pid: 2, command: 'node next dev -p 3500', startedMs: 0 }]
    expect(() => assertFrontendFresh({ repoRoot: root, chain: dev, env: { E2E_REQUIRE_STANDALONE: '1' }, log: quiet })).toThrow(/Gate-Modus/)
    const log = vi.fn()
    expect(assertFrontendFresh({ repoRoot: root, chain: dev, env: {}, log }).mode).toBe('dev')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('WARNUNG'))
  })

  describe('prepareGateFrontend', () => {
    const devChain = [
      { pid: 10, command: 'next-server (v16.3.8) ', startedMs: 0 },
      { pid: 11, command: 'node /repo/node_modules/.bin/next dev -p 3500', startedMs: 0 },
      { pid: 12, command: 'npm run dev:test', startedMs: 0 },
      { pid: 13, command: '-zsh', startedMs: 0 },
    ]
    const base = () => ({ repoRoot: root, backendUrl: 'http://localhost:8500', head: 'abc', log: quiet, waitPortFree: () => true })

    it('free port: nothing to do', () => {
      const killPids = vi.fn()
      expect(prepareGateFrontend({ ...base(), chain: [], killPids })).toEqual({ action: 'none', pids: [] })
      expect(killPids).not.toHaveBeenCalled()
    })

    it('dev chain: kills listener + dev ancestors, not the shell', () => {
      const killPids = vi.fn()
      const r = prepareGateFrontend({ ...base(), chain: devChain, killPids })
      expect(r).toEqual({ action: 'killed-dev', pids: [10, 11, 12] })
      expect(killPids).toHaveBeenCalledWith([10, 11, 12])
    })

    it('killed-dev removes the dev-written .next/types (tsc poison), killed-stale does not need to', () => {
      fs.mkdirSync(path.join(root, '.next/types'), { recursive: true })
      fs.writeFileSync(path.join(root, '.next/types/validator.ts'), 'x')
      prepareGateFrontend({ ...base(), chain: devChain, killPids: vi.fn() })
      expect(fs.existsSync(path.join(root, '.next/types'))).toBe(false)
    })

    it('fresh standalone is kept, stale one is killed', () => {
      writeStamp(fp(), Date.now() - 10_000)
      const killPids = vi.fn()
      expect(prepareGateFrontend({ ...base(), chain: standaloneChain(), killPids }).action).toBe('keep-standalone')
      expect(killPids).not.toHaveBeenCalled()
      const later = new Date(Date.now() + 60_000)
      fs.utimesSync(path.join(root, 'src/a.ts'), later, later)
      expect(prepareGateFrontend({ ...base(), chain: standaloneChain(), killPids })).toEqual({ action: 'killed-stale', pids: [42] })
      expect(killPids).toHaveBeenCalledWith([42])
    })

    it('unknown process: throws without kill, unless explicitly allowed', () => {
      const killPids = vi.fn()
      const unknown = [{ pid: 9, command: 'python -m http.server', startedMs: 0 }]
      expect(() => prepareGateFrontend({ ...base(), chain: unknown, killPids, env: {} })).toThrow(/Unbekannter Prozess/)
      expect(prepareGateFrontend({ ...base(), chain: unknown, killPids, env: { E2E_ALLOW_UNKNOWN_FRONTEND: '1' } }).action).toBe('none')
      expect(killPids).not.toHaveBeenCalled()
    })

    it('production ports are refused before anything is classified', () => {
      const chain = vi.fn(() => devChain)
      expect(() => prepareGateFrontend({ ...base(), port: '3000', chain: chain() })).toThrow(/Produktion/)
      expect(() => prepareGateFrontend({ ...base(), port: '8000', chain: [] })).toThrow(/Produktion/)
    })

    it('port still busy after kill: throws', () => {
      expect(() => prepareGateFrontend({ ...base(), chain: devChain, killPids: vi.fn(), waitPortFree: () => false })).toThrow(/nicht frei/)
    })
  })

  it('assertModeAllowed: dev mode only forbidden in gate mode', () => {
    expect(() => assertModeAllowed({ E2E_FRONTEND_MODE: 'dev', E2E_REQUIRE_STANDALONE: '1' })).toThrow(/nicht erlaubt/)
    expect(() => assertModeAllowed({ E2E_FRONTEND_MODE: 'dev' })).not.toThrow()
    expect(() => assertModeAllowed({ E2E_REQUIRE_STANDALONE: '1' })).not.toThrow()
  })
})
