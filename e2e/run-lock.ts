/**
 * Lauf-Lock (B8950-012): verhindert zwei gleichzeitige Playwright-Laeufe gegen dieselbe
 * Test-Umgebung. Das globale Setup killt und startet das 8500-Backend neu - ein paralleler Lauf
 * wuerde den anderen zerstoeren. Der Lock liegt in `os.tmpdir()/pundo-e2e-run.lock`
 * (`{pid, runId, startedAt}`); ein toter Prozess gibt ihn frei (Takeover).
 */
import fs from 'fs'
import os from 'os'
import path from 'path'

/** Run-ID = UTC `YYYYMMDDHHMMSS` (gleiches Format wie die generierten Kategorien `e2e-tmp-<run>-*`). */
export function generateRunId(now: Date = new Date()): string {
  return now.toISOString().replace(/[-:T]/g, '').slice(0, 14)
}

/** `E2E_LOCK_FILE` nur fuer Unit-Tests (damit sie nie den echten Lock eines laufenden Laufs anfassen). */
const slot = /^[1-5]$/.test(process.env.PUNDO_SLOT ?? '') ? process.env.PUNDO_SLOT : '0'
export const LOCK_FILE = process.env.E2E_LOCK_FILE ?? path.join(os.tmpdir(), `pundo-e2e-run-s${slot}.lock`)

export interface LockInfo { pid: number; runId: string; startedAt: string }

export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

export function readLock(file = LOCK_FILE): LockInfo | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as LockInfo
  } catch {
    return null
  }
}

/** Wirft, wenn ein anderer, lebender Prozess den Lock haelt. Uebernimmt verwaiste Locks. */
export function acquireLock(runId: string, file = LOCK_FILE, pid = process.pid, alive = isPidAlive): void {
  const existing = readLock(file)
  if (existing && existing.pid !== pid && alive(existing.pid)) {
    throw new Error(
      `[E2E Setup] Es laeuft bereits ein E2E-Lauf (PID ${existing.pid}, Run ${existing.runId}, seit ${existing.startedAt}).\n` +
      `  Gleichzeitige Laeufe zerstoeren sich gegenseitig (Backend-Restart, Test-Shops).\n` +
      `  Warten, den anderen Lauf beenden oder - falls verwaist - ${file} loeschen.`
    )
  }
  fs.writeFileSync(file, JSON.stringify({ pid, runId, startedAt: new Date().toISOString() } satisfies LockInfo))
}

export function releaseLock(runId?: string, file = LOCK_FILE, pid = process.pid): void {
  const existing = readLock(file)
  if (!existing) return
  if (existing.pid !== pid && (runId === undefined || existing.runId !== runId)) return
  try { fs.unlinkSync(file) } catch { /* schon weg */ }
}

/**
 * True nur, wenn der Lock auf genau diesen Prozess UND diese Run-ID zeigt (T1, F8950).
 * `globalSetup` und Reporter laufen im selben Runner-Prozess; ein Prozess, der das Setup nie
 * durchlaufen hat (`playwright test --list`), hat den Lock nie genommen und darf nichts aufraeumen.
 */
export function ownsLock(runId: string | undefined, file = LOCK_FILE, pid = process.pid): boolean {
  if (!runId) return false
  const l = readLock(file)
  return !!l && l.pid === pid && l.runId === runId
}
