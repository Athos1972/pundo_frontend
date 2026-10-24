/**
 * Aufraeumen der Testdaten eines Laufs (B8950-012, T1 F8950). Laeuft im `globalTeardown`
 * (`e2e/global-teardown.ts`) und ist damit UNABHAENGIG von der Reporter-Konfiguration: ein CLI-
 * `--reporter=line|list` ersetzt die Config-Reporter und liess frueher den Cleanup ausfallen.
 *
 * Nur der Prozess, der den Lauf-Lock haelt (`ownsLock`), raeumt auf - ein `--list`-Prozess, der die Run-ID
 * eines fremden Laufs aus .test-state.json uebernimmt, tut nichts. Danach gibt der Inhaber den Lock frei.
 *
 * `scripts/e2e_test_data.py cleanup --run-id <RUN> --apply` im Backend-Repo loescht alles mit Marker
 * `e2e-<RUN>-...` (Shops, Owner, Listings, Offers, Items samt Foto-Dateien, Kunden) und die generierten
 * Kategorien `e2e-tmp-<RUN>-*` (exakte 14-stellige Run-ID, andere Laeufe sind nicht betroffen).
 * `E2E_KEEP_FAILED_DATA=1` laesst die Daten stehen (globalTeardown kennt das Teststatus-Ergebnis nicht -
 * die Option gilt daher fuer jeden Lauf); das naechste Setup raeumt Laeufe aelter als E2E_STALE_HOURS (6).
 */
import { execFileSync } from 'child_process'
import { ownsLock, releaseLock } from './run-lock'
import { E2E_STATE_FILE } from './state'

const BACKEND_REPO = process.env.BACKEND_REPO
  ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'
const PY = `${BACKEND_REPO}/.venv/bin/python`
const SCRIPT = `${BACKEND_REPO}/scripts/e2e_test_data.py`

function runScript(args: string[]): { counts: Record<string, number>; skipped: unknown[] } | null {
  try {
    const out = execFileSync(PY, [SCRIPT, ...args], {
      cwd: BACKEND_REPO, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: BACKEND_REPO, E2E_STATE_FILE },
    })
    return JSON.parse(out.trim().split('\n').at(-1)!)
  } catch (err) {
    console.warn('[E2E Teardown] e2e_test_data.py fehlgeschlagen:', err instanceof Error ? err.message.split('\n')[0] : err)
    return null
  }
}

const fmt = (c: Record<string, number> | undefined) =>
  c ? Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(' ') || 'nichts' : 'n/a'

export function cleanupRun(): void {
  const runId = process.env.E2E_RUN_ID
  if (!runId) {
    console.log('[E2E Teardown] Keine E2E_RUN_ID — Cleanup übersprungen.')
    return
  }
  if (!ownsLock(runId)) {
    console.log(`[E2E Teardown] Lock gehört nicht diesem Prozess (Run ${runId}) – Cleanup übersprungen.`)
    return
  }
  try {
    if (process.env.E2E_KEEP_FAILED_DATA === '1') {
      console.log(`[E2E Teardown] E2E_KEEP_FAILED_DATA=1 — Testdaten von Run ${runId} bleiben stehen.`)
      console.log(`[E2E Teardown] Manuell aufräumen: ${PY} ${SCRIPT} cleanup --run-id ${runId} --apply`)
      return
    }
    const before = runScript(['cleanup', '--run-id', runId])
    console.log(`[E2E Teardown] Reste von Run ${runId} vor Cleanup: ${fmt(before?.counts)}`)
    const done = runScript(['cleanup', '--run-id', runId, '--apply'])
    console.log(`[E2E Teardown] Cleanup Run ${runId}: ${fmt(done?.counts)}`)
    const skipped = done?.skipped ?? []
    if (skipped.length) console.warn(`[E2E Teardown] ${skipped.length} Item(s) übersprungen (Listing in echtem Shop): ${JSON.stringify(skipped)}`)
  } finally {
    releaseLock(runId)
  }
}
