import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { acquireLock, readLock, releaseLock } from '../../e2e/run-lock'

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
})
