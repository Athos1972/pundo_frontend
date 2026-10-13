/**
 * Playwright-Reporter (B8950-012, ersetzt cleanup-test-categories.ts): Sicherheitsnetz für Testdaten.
 *
 * Grüner Lauf  → `scripts/e2e_test_data.py cleanup --run-id <RUN> --apply` im Backend-Repo:
 *                löscht alles mit Marker `e2e-<RUN>-…` (Shops, Owner, Listings, Offers, Items samt
 *                Foto-Dateien, Kunden) und die generierten Kategorien `e2e-tmp-<RUN>-*`.
 *                Vorher/Nachher-Inventar wird ausgegeben.
 * Roter Lauf   → ebenfalls Cleanup, aber NUR dieses Laufs (Marker `e2e-<RUN>-…` mit exakter 14-stelliger
 *                Run-ID, andere Läufe/Sessions sind nicht betroffen). Fehleranalyse läuft über Trace/Screenshot/Log
 *                in test-results, nicht über DB-Reste. Zur Analyse in der DB: `E2E_KEEP_FAILED_DATA=1` —
 *                dann bleiben die Daten stehen, das nächste Setup räumt Läufe älter als E2E_STALE_HOURS (6) weg.
 *
 * Primäres Aufräumen passiert in den Specs (Admin-Shop-Delete / Tracker); das hier fängt Reste ab.
 * Hinweis: `--reporter=…` auf der CLI ersetzt die Reporter aus der Config und überspringt diesen Cleanup.
 */
import { execFileSync } from 'child_process'
import type { FullResult, Reporter } from '@playwright/test/reporter'

const BACKEND_REPO = process.env.BACKEND_REPO
  ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'
const PY = `${BACKEND_REPO}/.venv/bin/python`
const SCRIPT = `${BACKEND_REPO}/scripts/e2e_test_data.py`

function runScript(args: string[]): { counts: Record<string, number>; skipped: unknown[] } | null {
  try {
    const out = execFileSync(PY, [SCRIPT, ...args], {
      cwd: BACKEND_REPO, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: BACKEND_REPO },
    })
    return JSON.parse(out.trim().split('\n').at(-1)!)
  } catch (err) {
    console.warn('[E2E Teardown] e2e_test_data.py fehlgeschlagen:', err instanceof Error ? err.message.split('\n')[0] : err)
    return null
  }
}

const fmt = (c: Record<string, number> | undefined) =>
  c ? Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(' ') || 'nichts' : 'n/a'

class CleanupTestDataReporter implements Reporter {
  printsToStdio() {
    return false
  }

  onEnd(result: FullResult) {
    const runId = process.env.E2E_RUN_ID
    if (!runId) {
      console.log('[E2E Teardown] Keine E2E_RUN_ID — Cleanup übersprungen.')
      return
    }
    const cmd = `${PY} ${SCRIPT} cleanup --run-id ${runId} --apply`
    if (result.status !== 'passed' && process.env.E2E_KEEP_FAILED_DATA === '1') {
      console.log(`[E2E Teardown] Lauf ${result.status} + E2E_KEEP_FAILED_DATA=1 — Testdaten von Run ${runId} bleiben stehen.`)
      console.log(`[E2E Teardown] Manuell aufräumen: ${cmd}`)
      return
    }
    const before = runScript(['cleanup', '--run-id', runId])
    console.log(`[E2E Teardown] Reste von Run ${runId} vor Cleanup: ${fmt(before?.counts)}`)
    const done = runScript(['cleanup', '--run-id', runId, '--apply'])
    console.log(`[E2E Teardown] Cleanup Run ${runId}: ${fmt(done?.counts)}`)
    const skipped = done?.skipped ?? []
    if (skipped.length) console.warn(`[E2E Teardown] ${skipped.length} Item(s) übersprungen (Listing in echtem Shop): ${JSON.stringify(skipped)}`)
  }
}

export default CleanupTestDataReporter
