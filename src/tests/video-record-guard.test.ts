// F8960 T10: Sicherheitsschranke + Datenschutz-Helfer der Video-Pipeline (video/_branding/lib/guard.mjs, record-lib.mjs).
// Reine Funktionen ohne Playwright; die record-lib-Faelle pruefen nur, dass die Schranke VOR jedem Loeschen/Browserstart greift.
import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  assertTestInstance, assertBackendHealthy, isLockHeld, parseLockFile, findForeignEmails, loginForAdminToken,
} from '../../video/_branding/lib/guard.mjs'

const F = 'http://localhost:3500'
const B = 'http://localhost:8500'

describe('assertTestInstance', () => {
  it('accepts localhost/127.0.0.1 on 3500/8500', () => {
    expect(() => assertTestInstance({ frontend: F, backend: B })).not.toThrow()
    expect(() => assertTestInstance({ frontend: 'http://127.0.0.1:3500', backend: 'http://127.0.0.1:8500' })).not.toThrow()
  })

  it.each([
    ['frontend :3000', 'http://localhost:3000', B],
    ['frontend :3501', 'http://localhost:3501', B],
    ['frontend prod', 'https://pundo.cy', B],
    ['frontend LAN host', 'http://192.168.1.5:3500', B],
    ['frontend https', 'https://localhost:3500', B],
    ['frontend no URL', 'localhost', B],
    ['backend :8000', F, 'http://localhost:8000'],
    ['backend :8501', F, 'http://localhost:8501'],
    ['backend prod', F, 'https://api.pundo.cy'],
  ])('rejects %s', (_n, frontend, backend) => {
    expect(() => assertTestInstance({ frontend, backend })).toThrow(/test instance 3500\/8500/)
  })

  it('names the offending value in the message', () => {
    expect(() => assertTestInstance({ frontend: 'http://localhost:3000', backend: B })).toThrow(/:3000/)
  })
})

describe('assertBackendHealthy', () => {
  it('passes on 200, fails on 500 and on network errors', async () => {
    await expect(assertBackendHealthy(B, async () => ({ ok: true, status: 200 }))).resolves.toBeUndefined()
    await expect(assertBackendHealthy(B, async () => ({ ok: false, status: 500 }))).rejects.toThrow(/500/)
    await expect(assertBackendHealthy(B, async () => { throw new Error('ECONNREFUSED') })).rejects.toThrow(/not reachable/)
  })
})

describe('E2E run lock', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vidlock-'))
  const lock = path.join(tmp, 'lock')
  afterEach(() => fs.rmSync(lock, { force: true }))

  it('is held for a live foreign PID, free for a dead PID, own PID or missing/garbled file', () => {
    fs.writeFileSync(lock, JSON.stringify({ pid: 4242, runId: 'r', startedAt: 'now' }))
    expect(isLockHeld(lock, () => true, 1)).toBe(true)
    expect(isLockHeld(lock, () => false, 1)).toBe(false)     // stale
    expect(isLockHeld(lock, () => true, 4242)).toBe(false)   // own
    fs.writeFileSync(lock, 'garbage')
    expect(isLockHeld(lock, () => true, 1)).toBe(false)
    fs.rmSync(lock)
    expect(isLockHeld(lock, () => true, 1)).toBe(false)
  })

  it('parses the lock format of e2e/run-lock.ts', () => {
    expect(parseLockFile('{"pid":7,"runId":"2026","startedAt":"x"}')).toMatchObject({ pid: 7 })
    expect(parseLockFile('{"runId":"x"}')).toBeNull()
    expect(parseLockFile('')).toBeNull()
  })
})

describe('findForeignEmails', () => {
  it('allows @pundo-e2e.io only', () => {
    expect(findForeignEmails('Claimant: claimant@pundo-e2e.io, Owner@PUNDO-E2E.IO')).toEqual([])
    expect(findForeignEmails('write to x@gmail.com or a@pundo-e2e.io')).toEqual(['x@gmail.com'])
    expect(findForeignEmails('a@sub.pundo-e2e.io')).toEqual(['a@sub.pundo-e2e.io'])   // subdomains are NOT allowed
    expect(findForeignEmails('a@pundo-e2e.io.evil.com')).toHaveLength(1)
  })
  it('handles empty input and deduplicates', () => {
    expect(findForeignEmails('')).toEqual([])
    expect(findForeignEmails(undefined as unknown as string)).toEqual([])
    expect(findForeignEmails('a@b.cy a@b.cy')).toEqual(['a@b.cy'])
  })
})

describe('loginForAdminToken (same call as e2e/global-setup.ts)', () => {
  const account = { email: 'e2e-admin@pundo-e2e.io', password: 'pw' }
  const res = (status: number, cookie?: string) => ({ ok: status < 400, status, headers: { get: () => cookie ?? null } })

  it('returns the admin_token from set-cookie and posts to the test backend', async () => {
    const f = vi.fn().mockResolvedValue(res(200, 'admin_token=jwt.abc; Path=/; HttpOnly'))
    await expect(loginForAdminToken(B, account, f)).resolves.toBe('jwt.abc')
    expect(f.mock.calls[0][0]).toBe(`${B}/api/v1/admin/auth/login`)
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual(account)
  })
  it('fails without cookie, on 401, and without credentials', async () => {
    await expect(loginForAdminToken(B, account, async () => res(200))).rejects.toThrow(/admin_token cookie not found/)
    await expect(loginForAdminToken(B, account, async () => res(401))).rejects.toThrow(/401/)
    await expect(loginForAdminToken(B, {} as never, async () => res(200, 'admin_token=x'))).rejects.toThrow(/missing/)
  })
})

describe('record-lib strict mode', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

  const marker = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidrec-'))
    fs.writeFileSync(path.join(dir, 'keep.txt'), 'x')
    return dir
  }

  it('aborts on a wrong backend BEFORE the output directory is touched', async () => {
    const { startSession } = await import('../../video/_branding/lib/record-lib.mjs')
    const dir = marker()
    await expect(startSession({ lang: 'en', outDir: dir, device: 'desktop', strict: true, backend: 'http://localhost:8000' }))
      .rejects.toThrow(/3500\/8500/)
    expect(fs.existsSync(path.join(dir, 'keep.txt'))).toBe(true)
  })

  it('aborts on a wrong frontend port (3501) BEFORE the output directory is touched', async () => {
    vi.stubEnv('VIDEO_BASE_URL', 'http://localhost:3501')
    vi.resetModules()
    const { startSession } = await import('../../video/_branding/lib/record-lib.mjs')
    const dir = marker()
    await expect(startSession({ lang: 'en', outDir: dir, device: 'desktop', strict: true })).rejects.toThrow(/:3501/)
    expect(fs.existsSync(path.join(dir, 'keep.txt'))).toBe(true)
  })

  it('refuses production ports already on import (also for old non-strict videos)', async () => {
    vi.stubEnv('VIDEO_BASE_URL', 'http://localhost:3000')
    vi.resetModules()
    await expect(import('../../video/_branding/lib/record-lib.mjs')).rejects.toThrow(/Port 3000\/8000/)
  })
})
