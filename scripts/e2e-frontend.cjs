#!/usr/bin/env node
'use strict'
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS-Skript: Playwright (CJS-Transform) und Node-CLI laden es ohne ESM */
/**
 * E2E-Frontend-Start ohne veralteten Build (B8950-012, AK6).
 *
 *   node scripts/e2e-frontend.cjs start   # Playwright `webServer.command`
 *   node scripts/e2e-frontend.cjs check   # prueft, ob der Server auf :3500 aktuellen Code ausliefert
 *   node scripts/e2e-frontend.cjs gate-prepare   # Gate (test-gate.sh): beendet next dev / veralteten Standalone auf :3500
 *
 * `start`: Standalone-Build mit Fingerabdruck-Cache. Der Fingerabdruck
 * (git HEAD, BACKEND_URL, neueste mtime von src/, public/, content/, next.config.ts,
 * package*.json, tsconfig.json, .env.local) steht in `.next/standalone/.e2e-build-stamp.json`.
 * Weicht er ab (oder fehlt der Build), wird `.next/standalone` geloescht und neu gebaut;
 * danach werden `static/` und `public/` SAUBER kopiert (rm -rf + cp -R, kein static/static).
 * `E2E_FRONTEND_MODE=dev` startet stattdessen `npm run dev:test`.
 *
 * `E2E_COVERAGE=1` (Coverage-Modus, docs/e2e-testing.md "Coverage"): eigener Build in `.next-cov` (Source-Maps,
 * unminifiziert; next.config.ts reagiert auf E2E_COVERAGE_BUILD=1), eigener Stamp, und der Server startet mit
 * NODE_V8_COVERAGE=<E2E_COVERAGE_DIR>/server-raw. Der normale `.next`-Build bleibt unberuehrt.
 *
 * `check` / assertFrontendFresh(): laeuft bereits ein Server auf dem Port (reuseExistingServer),
 * wird er klassifiziert (next dev | standalone | unbekannt) und ein Standalone-Server gegen den
 * Stamp geprueft. Veraltet/unbekannt -> Fehler mit Anleitung. Das globale Setup killt/startet
 * KEIN Frontend mehr.
 *
 * Gate-Modus (B8950-013 §10): `E2E_REQUIRE_STANDALONE=1` (setzt scripts/test-gate.sh). `gate-prepare` laeuft VOR
 * Playwright (die Wiederverwendungs-Entscheidung des webServers faellt vor dem Global Setup) und beendet einen
 * laufenden `next dev` bzw. veralteten Standalone auf dem Testport; unbekannte Prozesse nie. Taucht danach doch wieder
 * ein `next dev` auf, bricht assertFrontendFresh() ab; `E2E_FRONTEND_MODE=dev` ist verboten.
 */
const { execFileSync, spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const slotNumber = () => (/^[1-5]$/.test(process.env.PUNDO_SLOT ?? '') ? process.env.PUNDO_SLOT : null)
const slotDist = () => (slotNumber() ? `.next-worktree-s${slotNumber()}` : '.next')
const STAMP_REL = '.next/standalone/.e2e-build-stamp.json'
const COVERAGE_DIST = '.next-cov'
/** Coverage-Modus (E2E_COVERAGE=1): anderer Build-Ordner, damit der normale Fingerabdruck-Cache erhalten bleibt. */
const coverageMode = () => process.env.E2E_COVERAGE === '1'
const distRel = () => (coverageMode() ? COVERAGE_DIST : slotDist())
const stampRel = () => `${distRel()}/standalone/.e2e-build-stamp.json`
// `distDir` is slot-specific, but Turbopack still uses shared checkout state
// while compiling.  Only serialize that build phase; standalone servers and
// browser runs remain isolated by their slot ports/state directories.
const buildLockPath = (repoRoot = REPO_ROOT) => path.join(repoRoot, '.next-worktree-build.lock')
/** Rohdaten-Ordner des Servers (NODE_V8_COVERAGE); `E2E_COVERAGE_DIR` ist der Ausgabeordner des Laufs. */
const coverageServerRawDir = () => path.resolve(REPO_ROOT, process.env.E2E_COVERAGE_DIR ?? 'coverage-e2e', 'server-raw')
const FINGERPRINT_INPUTS = [
  'src', 'public', 'content', 'next.config.ts', 'package.json', 'package-lock.json',
  'tsconfig.json', '.env.local',
]

// `e2e/env.ts` accepts TEST_BACKEND_URL as the explicit test endpoint.  Use
// the exact same precedence while building the standalone server; otherwise a
// sourced slot environment can build for one backend and have globalSetup
// validate the stamp against another one.
function resolvedBackendUrl(backendUrl) {
  return backendUrl ?? process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'
}

// ── Fingerprint ──────────────────────────────────────────────────────────────

/** Neueste mtime (ms) unter `target` (Datei oder Verzeichnis, rekursiv). 0 wenn nicht vorhanden. */
function newestMtimeMs(target) {
  let st
  try { st = fs.statSync(target) } catch { return 0 }
  if (!st.isDirectory()) return Math.floor(st.mtimeMs)
  let newest = Math.floor(st.mtimeMs)
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.DS_Store') continue
    const child = path.join(target, entry.name)
    // Coverage-Modus: Vitest-Tests gehoeren nicht ins App-Bundle; ihre Aenderungen (parallele Sessions) sollen den
    // Coverage-Build nicht wiederholt verwerfen. Der normale Fingerabdruck bleibt unveraendert.
    if (coverageMode() && child.endsWith(`${path.sep}src${path.sep}tests`)) continue
    newest = Math.max(newest, newestMtimeMs(child))
  }
  return newest
}

function gitHead(repoRoot) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch { return 'unknown' }
}

/**
 * @param {{ repoRoot?: string, backendUrl?: string, head?: string }} [opts]
 * @returns {{ gitHead: string, backendUrl: string, newestMtimeMs: number }}
 */
function computeFingerprint({ repoRoot = REPO_ROOT, backendUrl, head } = {}) {
  const backend = resolvedBackendUrl(backendUrl)
  let newest = 0
  for (const rel of FINGERPRINT_INPUTS) newest = Math.max(newest, newestMtimeMs(path.join(repoRoot, rel)))
  return { gitHead: head ?? gitHead(repoRoot), backendUrl: backend, newestMtimeMs: newest }
}

function fingerprintsEqual(a, b) {
  return !!a && !!b && a.gitHead === b.gitHead && a.backendUrl === b.backendUrl
    && a.newestMtimeMs === b.newestMtimeMs
}

function readStamp(repoRoot = REPO_ROOT) {
  try { return JSON.parse(fs.readFileSync(path.join(repoRoot, stampRel()), 'utf8')) } catch { return null }
}

// ── Prozess-Klassifikation ───────────────────────────────────────────────────

/** Klassifiziert eine Kommandozeile: 'dev' | 'standalone' | 'unknown'. */
function classifyCommand(cmd) {
  const c = String(cmd ?? '')
  if (/\bnext(\.js)?\s+dev\b/.test(c) || /\/next\s+dev\b/.test(c) || /npm run dev:test/.test(c)) return 'dev'
  if (/\.next\/dev\//.test(c)) return 'dev'
  if (/standalone\/server\.js/.test(c)) return 'standalone'
  // Der Standalone-Server setzt seinen Prozesstitel auf "next-server (vX)" → erkennbar nur an seinem Elternprozess,
  // dem webServer-Start-Skript (Modus dev hat "next dev" in der Kette und gewinnt in classifyChain).
  if (/e2e-frontend\.cjs\s+start/.test(c)) return 'standalone'
  return 'unknown'
}

/** Eltern-Kette (Listener zuerst): dev gewinnt, dann standalone, sonst unknown. */
function classifyChain(commands) {
  const kinds = commands.map(classifyCommand)
  if (kinds.includes('dev')) return 'dev'
  if (kinds.includes('standalone')) return 'standalone'
  return 'unknown'
}

function sh(cmd, args) {
  try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' }
}

/** Listener-PID auf dem Port plus bis zu 3 Eltern: [{pid, command, startedMs}] */
function listenerChain(port) {
  const pid = Number(sh('lsof', ['-ti', `TCP:${port}`, '-sTCP:LISTEN']).split('\n')[0])
  if (!pid) return []
  const chain = []
  let cur = pid
  for (let i = 0; i < 4 && cur > 1; i++) {
    const row = sh('ps', ['-o', 'ppid=,command=', '-p', String(cur)])
    if (!row) break
    const m = row.match(/^\s*(\d+)\s+(.*)$/)
    if (!m) break
    const lstart = sh('ps', ['-o', 'lstart=', '-p', String(cur)])
    const startedMs = lstart ? Date.parse(lstart) : NaN
    chain.push({ pid: cur, command: m[2], startedMs })
    cur = Number(m[1])
  }
  return chain
}

/**
 * @typedef {{ pid: number, command: string, startedMs: number }} ProcInfo
 */

/** Standalone-Server veraltet? (Stamp fehlt/weicht ab oder Prozess startete vor dem Stamp) */
function standaloneStale({ repoRoot, backendUrl, head, startedMs }) {
  const stamp = readStamp(repoRoot)
  const fp = computeFingerprint({ repoRoot, backendUrl, head })
  const stale = !stamp || !fingerprintsEqual(stamp.fingerprint, fp)
    || (Number.isFinite(startedMs) && stamp.builtAtMs && startedMs + 2000 < stamp.builtAtMs)
  return { stale, stamp }
}

/**
 * Gate-Modus verbietet E2E_FRONTEND_MODE=dev.
 * @param {Record<string, string | undefined>} [env]
 */
function assertModeAllowed(env = process.env) {
  if (env.E2E_FRONTEND_MODE === 'dev' && env.E2E_REQUIRE_STANDALONE === '1') {
    throw new Error('[E2E Frontend] Gate-Modus (E2E_REQUIRE_STANDALONE=1): E2E_FRONTEND_MODE=dev ist nicht erlaubt. '
      + 'Das Gate testet nur gegen den Standalone-Build.')
  }
}

/**
 * Wirft, wenn auf `port` ein veralteter oder nicht erkennbarer Frontend-Server laeuft.
 * Gibt {mode, detail} zurueck: 'dev' | 'standalone'.
 * @param {{ repoRoot?: string, port?: string, backendUrl?: string, head?: string,
 *   env?: Record<string, string | undefined>, chain?: ProcInfo[], log?: (msg: string) => void }} [opts]
 * @returns {{ mode: 'dev' | 'standalone' | 'unknown', detail: string }}
 */
function assertFrontendFresh({
  repoRoot = REPO_ROOT, port = process.env.E2E_FRONTEND_PORT ?? '3500',
  backendUrl, head, env = process.env, chain, log = console.log,
} = {}) {
  const procs = chain ?? listenerChain(port)
  if (procs.length === 0) {
    throw new Error(`[E2E Frontend] Auf Port ${port} laeuft kein Frontend. Playwright startet es per webServer `
      + '(node scripts/e2e-frontend.cjs start); bei eigener Config das Frontend vorher starten.')
  }
  const kind = classifyChain(procs.map(p => p.command))
  if (kind === 'dev') {
    if (env.E2E_REQUIRE_STANDALONE === '1') {
      throw new Error(
        `[E2E Frontend] Gate-Modus: auf Port ${port} laeuft \`next dev\` (PID ${procs[0].pid}). Das Gate testet nur gegen `
        + 'den Standalone-Build. Ursache meist: ein Agent/eine Session hat `npm run dev:test` nach der Gate-Bereinigung '
        + `neu gestartet.\n  Loesung: Dev-Server beenden (kill ${procs[0].pid}) und Gate erneut starten.`)
    }
    log(`[E2E Frontend] WARNUNG: next dev auf Port ${port}: Ergebnisse nicht gate-gleichwertig (kein Turnstile-Sitekey, `
      + `Doppel-Render). Fuer Gate-gleiche Laeufe Port ${port} beenden; Playwright startet dann den Standalone-Build.`)
    return { mode: 'dev', detail: procs[0].command }
  }
  if (kind === 'standalone') {
    const { stale, stamp } = standaloneStale({ repoRoot, backendUrl, head, startedMs: procs[0].startedMs })
    if (stale) {
      throw new Error(
        `[E2E Frontend] Der Standalone-Server auf Port ${port} (PID ${procs[0].pid}) ist VERALTET `
        + `(Code/Build-Stamp weicht ab).\n  Loesung: Port ${port} beenden (kill ${procs[0].pid}) - Playwright baut dann `
        + 'automatisch neu - oder "npm run dev:test" starten.')
    }
    log(`[E2E Frontend] Standalone-Build aktuell (Stamp ${new Date(stamp.builtAtMs).toISOString()}).`)
    return { mode: 'standalone', detail: procs[0].command }
  }
  if (env.E2E_ALLOW_UNKNOWN_FRONTEND === '1') {
    log(`[E2E Frontend] WARNUNG: unbekannter Prozess auf Port ${port} (E2E_ALLOW_UNKNOWN_FRONTEND=1): ${procs[0].command}`)
    return { mode: 'unknown', detail: procs[0].command }
  }
  throw new Error(
    `[E2E Frontend] Unbekannter Prozess auf Port ${port}: "${procs[0].command}" (Eltern: `
    + `${procs.slice(1).map(p => p.command).join(' | ') || '-'}).\n  Beenden oder E2E_ALLOW_UNKNOWN_FRONTEND=1 setzen.`)
}

// ── Gate-Vorbereitung ────────────────────────────────────────────────────────

const sleepSync = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

function portFree(port, ms) {
  const deadline = Date.now() + ms
  for (;;) {
    if (!sh('lsof', ['-ti', `TCP:${port}`, '-sTCP:LISTEN'])) return true
    if (Date.now() >= deadline) return false
    sleepSync(250)
  }
}

function killPidsDefault(pids, port = process.env.E2E_FRONTEND_PORT ?? '3500') {
  const send = sig => { for (const pid of pids) { try { process.kill(pid, sig) } catch { /* schon beendet */ } } }
  send('SIGTERM')
  if (portFree(port, 15_000)) return
  send('SIGKILL')
}

/**
 * Gate-Vorbereitung: beendet `next dev` (und veralteten Standalone) auf dem Testport, damit der webServer den
 * Standalone-Build startet. Unbekannte Prozesse werden nie beendet.
 * @param {{ port?: string, repoRoot?: string, backendUrl?: string, head?: string, env?: Record<string, string | undefined>,
 *   chain?: ProcInfo[], killPids?: (pids: number[]) => void, waitPortFree?: (port: string, ms: number) => boolean,
 *   log?: (msg: string) => void }} [opts]
 * @returns {{ action: 'none' | 'killed-dev' | 'killed-stale' | 'keep-standalone', pids: number[] }}
 */
function prepareGateFrontend({
  port = process.env.E2E_FRONTEND_PORT ?? '3500', repoRoot = REPO_ROOT, backendUrl, head, env = process.env,
  chain, killPids, waitPortFree = portFree, log = console.log,
} = {}) {
  if (slotNumber()) return { action: 'none', pids: [] }
  if (port === '3000' || port === '8000') throw new Error(`[E2E Frontend] Port ${port} ist Produktion - gate-prepare verweigert.`)
  const doKill = killPids ?? (pids => killPidsDefault(pids, port))
  const procs = chain ?? listenerChain(port)
  if (procs.length === 0) return { action: 'none', pids: [] }
  const kind = classifyChain(procs.map(p => p.command))
  const pick = want => procs.filter((p, i) => i === 0 || classifyCommand(p.command) === want).map(p => p.pid)
  const kill = (action, want) => {
    const pids = pick(want)
    log(`[E2E Frontend] gate-prepare: ${action} auf Port ${port}, beende PIDs ${pids.join(', ')}`)
    doKill(pids)
    if (!waitPortFree(port, 5_000)) {
      throw new Error(`[E2E Frontend] Port ${port} ist nach dem Beenden (PIDs ${pids.join(', ')}) nicht frei.`)
    }
    return { action, pids }
  }
  if (kind === 'dev') {
    const r = kill('killed-dev', 'dev')
    // `next dev` ueberschreibt .next/types (validator.ts) mit Dev-Typen, die `tsc --noEmit` (tsconfig include) rot machen,
    // bis ein `next build` sie neu schreibt. Das Gate laeuft tsc nach dieser Bereinigung -> Dev-Typen entfernen.
    fs.rmSync(path.join(repoRoot, '.next/types'), { recursive: true, force: true })
    return r
  }
  if (kind === 'standalone') {
    const { stale } = standaloneStale({ repoRoot, backendUrl, head, startedMs: procs[0].startedMs })
    if (stale) return kill('killed-stale', 'standalone')
    return { action: 'keep-standalone', pids: [] }
  }
  if (env.E2E_ALLOW_UNKNOWN_FRONTEND === '1') return { action: 'none', pids: [] }
  throw new Error(
    `[E2E Frontend] Unbekannter Prozess auf Port ${port}: "${procs[0].command}" (Eltern: `
    + `${procs.slice(1).map(p => p.command).join(' | ') || '-'}).\n  Beenden oder E2E_ALLOW_UNKNOWN_FRONTEND=1 setzen.`)
}

// ── Start ────────────────────────────────────────────────────────────────────

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', cwd: REPO_ROOT, ...opts })
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return false
  try { process.kill(pid, 0); return true } catch { return false }
}

function acquireBuildLock(repoRoot = REPO_ROOT, { timeoutMs = 600_000, sleep = sleepSync } = {}) {
  const lock = buildLockPath(repoRoot)
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      fs.mkdirSync(lock)
      fs.writeFileSync(path.join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, createdAtMs: Date.now() }))
      return () => fs.rmSync(lock, { recursive: true, force: true })
    } catch (err) {
      if (err?.code !== 'EEXIST') throw err
      let owner = null
      try { owner = JSON.parse(fs.readFileSync(path.join(lock, 'owner.json'), 'utf8')) } catch { /* incomplete owner; wait once */ }
      if (owner && !processIsAlive(owner.pid)) {
        fs.rmSync(lock, { recursive: true, force: true })
        continue
      }
      if (Date.now() >= deadline) throw new Error(`[E2E Frontend] Timed out waiting for shared frontend build lock: ${lock}`)
      sleep(250)
    }
  }
}

/** Coverage-Build: das Standalone-Tracing liefert die `.map`-Dateien der Server-Chunks nicht mit; Node braucht sie neben den Chunks. */
function copyServerSourceMaps(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name)
    const dst = path.join(to, entry.name)
    if (entry.isDirectory()) copyServerSourceMaps(src, dst)
    else if (entry.name.endsWith('.map') && fs.existsSync(path.dirname(dst))) fs.copyFileSync(src, dst)
  }
}

/** @param {{ repoRoot?: string, backendUrl?: string, log?: (msg: string) => void }} [opts] */
function ensureStandaloneBuild({ repoRoot = REPO_ROOT, backendUrl, log = console.log } = {}) {
  const release = acquireBuildLock(repoRoot)
  try {
    // Compute after acquiring the lock: the waiting slot must compare against
    // the completed build, never the state it observed before another build.
    const backend = resolvedBackendUrl(backendUrl)
    const fp = computeFingerprint({ repoRoot, backendUrl: backend })
    const stamp = readStamp(repoRoot)
    const dist = distRel()
    const server = path.join(repoRoot, dist, 'standalone/server.js')
    if (stamp && fingerprintsEqual(stamp.fingerprint, fp) && fs.existsSync(server)
      && fs.existsSync(path.join(repoRoot, dist, 'standalone', dist, 'static'))) {
      log('[E2E Frontend] Standalone-Build aktuell (Fingerabdruck gleich) - kein Rebuild.')
      return false
    }
    log('[E2E Frontend] Standalone-Build fehlt oder veraltet - baue neu (ca. 3 min)...')
    fs.rmSync(path.join(repoRoot, dist, 'standalone'), { recursive: true, force: true })
    // B6220-003 (E7): the backend is the only Turnstile verifier and the widget needs a sitekey
    // in a production build. Default to Cloudflare's always-passes TEST sitekey (inlined at build
    // time; the E2E backend runs without a secret and bypasses verification on pundo_test).
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || '1x00000000000000000000AA'
    run('npx', ['next', 'build'], {
      env: {
        ...process.env, BACKEND_URL: backend, NEXT_PUBLIC_TURNSTILE_SITEKEY: sitekey,
        ...(coverageMode() ? { E2E_COVERAGE_BUILD: '1' } : {}),
      },
    })
    const sa = path.join(repoRoot, dist, 'standalone')
    fs.rmSync(path.join(sa, dist, 'static'), { recursive: true, force: true })
    fs.rmSync(path.join(sa, 'public'), { recursive: true, force: true })
    fs.cpSync(path.join(repoRoot, dist, 'static'), path.join(sa, dist, 'static'), { recursive: true })
    fs.cpSync(path.join(repoRoot, 'public'), path.join(sa, 'public'), { recursive: true })
    if (coverageMode()) copyServerSourceMaps(path.join(repoRoot, dist, 'server'), path.join(sa, dist, 'server'))
    // Next can update tsconfig.json while compiling. Stamp the completed input
    // state, otherwise that harmless build side effect makes the server stale
    // before globalSetup can inspect it. A later source/config edit still
    // changes the fingerprint and forces the next build.
    const completedFingerprint = computeFingerprint({ repoRoot, backendUrl: backend })
    fs.writeFileSync(path.join(sa, '.e2e-build-stamp.json'),
      JSON.stringify({ fingerprint: completedFingerprint, builtAtMs: Date.now() }, null, 2))
    return true
  } finally {
    release()
  }
}

function start() {
  assertModeAllowed()
  const port = process.env.PORT ?? process.env.E2E_FRONTEND_PORT ?? '3500'
  const backend = resolvedBackendUrl()
  if (backend.includes(':8000')) throw new Error('[E2E Frontend] BACKEND_URL zeigt auf Port 8000 (Produktion).')
  let child
  if (process.env.E2E_FRONTEND_MODE === 'dev') {
    console.log('[E2E Frontend] E2E_FRONTEND_MODE=dev - starte npm run dev:test')
    child = spawn('npm', ['run', 'dev:test'], { cwd: REPO_ROOT, stdio: 'inherit' })
  } else {
    ensureStandaloneBuild({ backendUrl: backend })
    const env = { ...process.env, PORT: port, BACKEND_URL: backend }
    if (coverageMode()) {
      // Frische V8-Rohdaten je Lauf; Node schreibt sie beim (SIGTERM-)Exit des Servers.
      const raw = coverageServerRawDir()
      fs.rmSync(raw, { recursive: true, force: true })
      fs.mkdirSync(raw, { recursive: true })
      env.NODE_V8_COVERAGE = raw
    }
    child = spawn('node', [path.join(REPO_ROOT, distRel(), 'standalone/server.js')], {
      cwd: REPO_ROOT, stdio: 'inherit', env,
    })
  }
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => child.kill(sig))
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
}

module.exports = {
  REPO_ROOT, STAMP_REL, COVERAGE_DIST, coverageMode, distRel, stampRel, coverageServerRawDir, buildLockPath, acquireBuildLock, resolvedBackendUrl, FINGERPRINT_INPUTS, newestMtimeMs, computeFingerprint, fingerprintsEqual,
  readStamp, classifyCommand, classifyChain, listenerChain, assertFrontendFresh, ensureStandaloneBuild,
  prepareGateFrontend, assertModeAllowed,
}

if (require.main === module) {
  const cmd = process.argv[2]
  try {
    if (cmd === 'start') start()
    else if (cmd === 'check') {
      const r = assertFrontendFresh()
      console.log(JSON.stringify(r))
    } else if (cmd === 'gate-prepare') {
      console.log(JSON.stringify(prepareGateFrontend()))
    } else {
      console.error('Usage: node scripts/e2e-frontend.cjs start|check|gate-prepare')
      process.exit(2)
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
