/**
 * Playwright-Reporter: löscht die generierten Test-Kategorien (`e2e-tmp-*`, B5900-011 T11)
 * nach einem ERFOLGREICHEN Lauf. Bei Fehlern bleiben sie zur Analyse stehen; der nächste
 * Lauf (global-setup → `prepare_e2e_db.py --seed-test-categories`) räumt sie vor dem Seed weg.
 *
 * Abhängige Items werden vom Backend-Skript auf die passende echte Google-Kategorie
 * umgehängt (bzw. category_id=NULL, falls es keine echte Taxonomie gibt).
 *
 * Hinweis: `--reporter=…` auf der CLI ersetzt die Reporter aus der Config und
 * überspringt damit diesen Cleanup. Manuell nachholen:
 *   cd <backend> && .venv/bin/python scripts/prepare_e2e_db.py --cleanup-test-categories
 */
import { execSync } from 'child_process'
import type { FullResult, Reporter } from '@playwright/test/reporter'

const BACKEND_REPO = process.env.BACKEND_REPO
  ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'

class CleanupTestCategoriesReporter implements Reporter {
  printsToStdio() {
    return false
  }

  onEnd(result: FullResult) {
    if (result.status !== 'passed') {
      console.log(`[E2E Teardown] Lauf ${result.status} — Test-Kategorien (e2e-tmp-*) bleiben zur Analyse stehen.`)
      return
    }
    try {
      const out = execSync(
        `${BACKEND_REPO}/.venv/bin/python ${BACKEND_REPO}/scripts/prepare_e2e_db.py --cleanup-test-categories`,
        { cwd: BACKEND_REPO, encoding: 'utf8', timeout: 60_000, env: { ...process.env, PYTHONPATH: BACKEND_REPO } }
      )
      console.log(`[E2E Teardown] Test-Kategorien entfernt: ${out.trim().split('\n').at(-1)}`)
    } catch (err) {
      console.warn('[E2E Teardown] Cleanup der Test-Kategorien fehlgeschlagen:', err instanceof Error ? err.message : err)
    }
  }
}

export default CleanupTestCategoriesReporter
