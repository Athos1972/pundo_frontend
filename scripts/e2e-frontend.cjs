#!/usr/bin/env node
'use strict'
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS-Skript: Playwright (CJS-Transform) und Node-CLI laden es ohne ESM */
/**
 * E2E-Frontend-Start ohne veralteten Build (B8950-012, AK6).
 *
 *   node scripts/e2e-frontend.cjs start   # Playwright `webServer.command`
 *   node scripts/e2e-frontend.cjs check   # prueft, ob der Server auf :3500 aktuellen Code ausliefert
 *
 * `start`: Standalone-Build mit Fingerabdruck-Cache. Der Fingerabdruck
 * (git HEAD, BACKEND_URL, neueste mtime von src/, public/, content/, next.config.ts,
 * package*.json, tsconfig.json, .env.local) steht in `.next/standalone/.e2e-build-stamp.json`.
 * Weicht er ab (oder fehlt der Build), wird `.next/standalone` geloescht und neu gebaut;
 * danach werden `static/` und `public/` SAUBER kopiert (rm -rf + cp -R, kein static/static).
 * `E2E_FRONTEND_MODE=dev` startet stattdessen `npm run dev:test`.
 *
 * `check` / assertFrontendFresh(): laeuft bereits ein Server auf dem Port (reuseExistingServer),
 * wird er klassifiziert (next dev | standalone | unbekannt) und ein Standalone-Server gegen den
 * Stamp geprueft. Veraltet/unbekannt -> Fehler mit Anleitung. Das globale Setup killt/startet
 * KEIN Frontend mehr.
 */
const { execFileSync, spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const STAMP_REL = '.next/standalone/.e2e-build-stamp.json'
const FINGERPRINT_INPUTS = [
  'src', 'public', 'content', 'next.config.ts', 'package.json', 'package-lock.json',
  'tsconfig.json', '.env.local',
]

// ── Fingerprint ──────────────────────────────────────────────────────────────

/** Neueste mtime (ms) unter `target` (Datei oder Verzeichnis, rekursiv). 0 wenn nicht vorhanden. */
function newestMtimeMs(target) {
  let st
  try { st = fs.statSync(target) } catch { return 0 }
  if (!st.isDirectory()) return Math.floor(st.mtimeMs)
  let newest = Math.floor(st.mtimeMs)
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.DS_Store') continue
    newest = Math.max(newest, newestMtimeMs(path.join(target, entry.name)))
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
  const backend = backendUrl ?? process.env.BACKEND_URL ?? 'http://localhost:8500'
  let newest = 0
  for (const rel of FINGERPRINT_INPUTS) newest = Math.max(newest, newestMtimeMs(path.join(repoRoot, rel)))
  return { gitHead: head ?? gitHead(repoRoot), backendUrl: backend, newestMtimeMs: newest }
}

function fingerprintsEqual(a, b) {
  return !!a && !!b && a.gitHead === b.gitHead && a.backendUrl === b.backendUrl
    && a.newestMtimeMs === b.newestMtimeMs
}

function readStamp(repoRoot = REPO_ROOT) {
  try { return JSON.parse(fs.readFileSync(path.join(repoRoot, STAMP_REL), 'utf8')) } catch { return null }
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
    log(`[E2E Frontend] next dev (aktuell) auf Port ${port} - kein Restart.`)
    return { mode: 'dev', detail: procs[0].command }
  }
  if (kind === 'standalone') {
    const stamp = readStamp(repoRoot)
    const fp = computeFingerprint({ repoRoot, backendUrl, head })
    const startedMs = procs[0].startedMs
    const stale = !stamp || !fingerprintsEqual(stamp.fingerprint, fp)
      || (Number.isFinite(startedMs) && stamp.builtAtMs && startedMs + 2000 < stamp.builtAtMs)
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

// ── Start ────────────────────────────────────────────────────────────────────

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', cwd: REPO_ROOT, ...opts })
}

/** @param {{ repoRoot?: string, backendUrl?: string, log?: (msg: string) => void }} [opts] */
function ensureStandaloneBuild({ repoRoot = REPO_ROOT, backendUrl, log = console.log } = {}) {
  const backend = backendUrl ?? process.env.BACKEND_URL ?? 'http://localhost:8500'
  const fp = computeFingerprint({ repoRoot, backendUrl: backend })
  const stamp = readStamp(repoRoot)
  const server = path.join(repoRoot, '.next/standalone/server.js')
  if (stamp && fingerprintsEqual(stamp.fingerprint, fp) && fs.existsSync(server)
    && fs.existsSync(path.join(repoRoot, '.next/standalone/.next/static'))) {
    log('[E2E Frontend] Standalone-Build aktuell (Fingerabdruck gleich) - kein Rebuild.')
    return false
  }
  log('[E2E Frontend] Standalone-Build fehlt oder veraltet - baue neu (ca. 3 min)...')
  fs.rmSync(path.join(repoRoot, '.next/standalone'), { recursive: true, force: true })
  // B6220-003 (E7): the backend is the only Turnstile verifier and the widget needs a sitekey
  // in a production build. Default to Cloudflare's always-passes TEST sitekey (inlined at build
  // time; the E2E backend runs without a secret and bypasses verification on pundo_test).
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || '1x00000000000000000000AA'
  run('npx', ['next', 'build'], {
    env: { ...process.env, BACKEND_URL: backend, NEXT_PUBLIC_TURNSTILE_SITEKEY: sitekey },
  })
  const sa = path.join(repoRoot, '.next/standalone')
  fs.rmSync(path.join(sa, '.next/static'), { recursive: true, force: true })
  fs.rmSync(path.join(sa, 'public'), { recursive: true, force: true })
  fs.cpSync(path.join(repoRoot, '.next/static'), path.join(sa, '.next/static'), { recursive: true })
  fs.cpSync(path.join(repoRoot, 'public'), path.join(sa, 'public'), { recursive: true })
  // Stamp = Fingerabdruck VOR dem Build: wird ein Input waehrend des Builds editiert, baut der naechste Lauf neu.
  fs.writeFileSync(path.join(sa, '.e2e-build-stamp.json'),
    JSON.stringify({ fingerprint: fp, builtAtMs: Date.now() }, null, 2))
  return true
}

function start() {
  const port = process.env.PORT ?? process.env.E2E_FRONTEND_PORT ?? '3500'
  const backend = process.env.BACKEND_URL ?? 'http://localhost:8500'
  if (backend.includes(':8000')) throw new Error('[E2E Frontend] BACKEND_URL zeigt auf Port 8000 (Produktion).')
  let child
  if (process.env.E2E_FRONTEND_MODE === 'dev') {
    console.log('[E2E Frontend] E2E_FRONTEND_MODE=dev - starte npm run dev:test')
    child = spawn('npm', ['run', 'dev:test'], { cwd: REPO_ROOT, stdio: 'inherit' })
  } else {
    ensureStandaloneBuild({ backendUrl: backend })
    child = spawn('node', [path.join(REPO_ROOT, '.next/standalone/server.js')], {
      cwd: REPO_ROOT, stdio: 'inherit', env: { ...process.env, PORT: port, BACKEND_URL: backend },
    })
  }
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => child.kill(sig))
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
}

module.exports = {
  REPO_ROOT, STAMP_REL, FINGERPRINT_INPUTS, newestMtimeMs, computeFingerprint, fingerprintsEqual,
  readStamp, classifyCommand, classifyChain, listenerChain, assertFrontendFresh, ensureStandaloneBuild,
}

if (require.main === module) {
  const cmd = process.argv[2]
  try {
    if (cmd === 'start') start()
    else if (cmd === 'check') {
      const r = assertFrontendFresh()
      console.log(JSON.stringify(r))
    } else {
      console.error('Usage: node scripts/e2e-frontend.cjs start|check')
      process.exit(2)
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
