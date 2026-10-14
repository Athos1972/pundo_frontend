import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { acquireLock, readLock, releaseLock, ownsLock, LOCK_FILE } from '../../e2e/run-lock'

const execFileSync = vi.hoisted(() => {
  // Vor den Imports: Test-Lock-Datei statt des echten Lauf-Locks
  process.env.E2E_LOCK_FILE = `${process.env.TMPDIR ?? '/tmp'}/pundo-e2e-run-unit-${process.pid}.lock`
  return vi.fn(() => '{"counts":{},"skipped":[]}')
})
vi.mock('child_process', () => ({ execFileSync, default: { execFileSync } }))

describe('run lock (B8950-012)', () => {
  let file: string
  beforeEach(() => { file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lock-')), 'run.lock') })
  afterEach(() => fs.rmSync(path.dirname(file), { recursive: true, force: true }))

  it('acquires a free lock and releases it', () => {
    acquireLock('R1', file, 111, () => false)
    expect(readLock(file)).toMatchObject({ pid: 111, runId: 'R1' })
    releaseLock('R1', file, 111)
    expect(readLock(file)).toBeNull()
  })

  it('refuses while another live process holds the lock', () => {
    acquireLock('R1', file, 111, () => true)
    expect(() => acquireLock('R2', file, 222, () => true)).toThrow(/laeuft bereits ein E2E-Lauf/)
    expect(readLock(file)?.runId).toBe('R1')
  })

  it('takes over a lock of a dead process', () => {
    acquireLock('R1', file, 111, () => true)
    acquireLock('R2', file, 222, () => false)
    expect(readLock(file)).toMatchObject({ pid: 222, runId: 'R2' })
  })

  it('does not release a foreign live lock', () => {
    acquireLock('R1', file, 111, () => true)
    releaseLock('R2', file, 222)
    expect(readLock(file)?.runId).toBe('R1')
  })

  it('ownsLock: own pid + run id -> true', () => {
    acquireLock('R1', file, 111, () => false)
    expect(ownsLock('R1', file, 111)).toBe(true)
  })

  it('ownsLock: foreign pid -> false', () => {
    acquireLock('R1', file, 111, () => false)
    expect(ownsLock('R1', file, 222)).toBe(false)
  })

  it('ownsLock: foreign run id (e.g. --list adopting .test-state.json) -> false', () => {
    acquireLock('R1', file, 111, () => false)
    expect(ownsLock('R2', file, 111)).toBe(false)
  })

  it('ownsLock: missing lock or missing run id -> false', () => {
    expect(ownsLock('R1', file, 111)).toBe(false)
    acquireLock('R1', file, 111, () => false)
    expect(ownsLock(undefined, file, 111)).toBe(false)
  })
})

describe('cleanup im globalTeardown (T1, F8950)', () => {
  beforeEach(() => { execFileSync.mockClear(); vi.spyOn(console, 'log').mockImplementation(() => {}) })
  afterEach(() => { vi.restoreAllMocks(); delete process.env.E2E_RUN_ID; fs.rmSync(LOCK_FILE, { force: true }) })

  async function endWith(runId: string) {
    process.env.E2E_RUN_ID = runId
    const { default: teardown } = await import('../../e2e/global-teardown')
    await teardown()
  }

  it('skips cleanup when this process does not hold the lock', async () => {
    acquireLock('19990101000000', LOCK_FILE, process.pid + 1, () => false) // fremder Inhaber
    await endWith('19990101000000')
    expect(execFileSync).not.toHaveBeenCalled()
  })

  it('skips cleanup when no lock exists (e.g. --list)', async () => {
    await endWith('19990101000002')
    expect(execFileSync).not.toHaveBeenCalled()
  })

  it('runs cleanup when this process holds the lock', async () => {
    acquireLock('19990101000001', LOCK_FILE, process.pid, () => false)
    await endWith('19990101000001')
    expect(execFileSync).toHaveBeenCalled()
    expect(readLock(LOCK_FILE)).toBeNull() // Teardown gibt den Lock nach dem Cleanup frei
  })

  it('does not release a foreign lock', async () => {
    acquireLock('19990101000003', LOCK_FILE, process.pid + 1, () => false)
    await endWith('19990101000003')
    expect(readLock(LOCK_FILE)?.runId).toBe('19990101000003')
  })
})
