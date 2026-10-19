// Safety + privacy helpers for the strict recording mode (F8960 T10). Pure functions, NO Playwright import,
// so they can be unit-tested from Vitest (src/tests/video-record-guard.test.ts).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function parseLocal(label, url, port) {
  let u
  try { u = new URL(url) } catch { throw new Error(`Recording only against the test instance 3500/8500 - got ${label} "${url}" (not a URL)`) }
  if (!LOCAL_HOSTS.has(u.hostname) || u.port !== String(port) || u.protocol !== 'http:') {
    throw new Error(`Recording only against the test instance 3500/8500 - got ${label} "${url}" (expected http://localhost:${port})`)
  }
  return u
}

/** Throws unless frontend is http://localhost|127.0.0.1:3500 and backend is :8500. */
export function assertTestInstance({ frontend, backend }) {
  parseLocal('frontend', frontend, 3500)
  parseLocal('backend', backend, 8500)
}

/**
 * Backend must answer /health with 200 (proves that :8500 really is up).
 * @param {string} backend
 * @param {any} [fetchImpl]
 */
export async function assertBackendHealthy(backend, fetchImpl = fetch) {
  let res
  try { res = await fetchImpl(`${backend.replace(/\/$/, '')}/health`) } catch (e) {
    throw new Error(`Backend ${backend} not reachable (/health): ${e.message}`)
  }
  if (!res.ok) throw new Error(`Backend ${backend}/health answered ${res.status}`)
}

export const LOCK_FILE = process.env.E2E_LOCK_FILE ?? path.join(os.tmpdir(), 'pundo-e2e-run.lock')

export function isPidAlive(pid) {
  try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }
}

/** Parses the content of e2e/run-lock.ts lock files: {pid, runId, startedAt}; null if unreadable. */
export function parseLockFile(text) {
  try {
    const j = JSON.parse(text)
    return Number.isInteger(j.pid) ? j : null
  } catch { return null }
}

/** True when another E2E run (live PID) holds the lock; stale or own lock -> false. */
export function isLockHeld(file = LOCK_FILE, alive = isPidAlive, ownPid = process.pid) {
  let text
  try { text = fs.readFileSync(file, 'utf8') } catch { return false }
  const lock = parseLockFile(text)
  return !!lock && lock.pid !== ownPid && alive(lock.pid)
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g

/** All e-mail addresses in `text` whose domain is not in `allow` (default: pundo-e2e.io). */
export function findForeignEmails(text, allow = ['pundo-e2e.io']) {
  const ok = new Set(allow.map((d) => d.toLowerCase()))
  const found = []
  for (const m of String(text || '').matchAll(EMAIL_RE)) {
    const domain = m[1].toLowerCase().replace(/\.$/, '')
    if (!ok.has(domain)) found.push(m[0])
  }
  return [...new Set(found)]
}

/**
 * Logs in at the TEST backend and returns the admin_token. Throws on non-200 or missing cookie.
 * @param {string} backend
 * @param {{ email?: string, password?: string }} account
 * @param {any} [fetchImpl]
 * @returns {Promise<string>}
 * Same call as e2e/global-setup.ts (seedAndLoginAdmin).
 */
export async function loginForAdminToken(backend, account, fetchImpl = fetch) {
  if (!account?.email || !account?.password) throw new Error('admin account (email/password) missing in .recording-accounts.json')
  const res = await fetchImpl(`${backend.replace(/\/$/, '')}/api/v1/admin/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password }),
  })
  if (!res.ok) throw new Error(`Admin login failed: HTTP ${res.status}`)
  const cookie = res.headers.get('set-cookie') ?? ''
  const m = cookie.match(/admin_token=([^;]+)/)
  if (!m) throw new Error('admin_token cookie not found in login response')
  return m[1]
}
