import { defineConfig } from '@playwright/test'

// Port-Konvention (PFLICHT — niemals mischen):
//   Produktion:  Backend 8000, Frontend 3000
//   E2E-Tests:   Backend 8500, Frontend 3500
//
// Der global-setup startet das Test-Backend automatisch (kill + restart) und prüft nur noch,
// dass das Frontend auf 3500 aktuellen Code ausliefert (scripts/e2e-frontend.cjs). Das Frontend
// startet ausschließlich dieses webServer-Plugin: Standalone-Build mit Fingerabdruck-Cache,
// E2E_FRONTEND_MODE=dev → `npm run dev:test`. Läuft schon ein aktueller Server, wird er genutzt.
// BACKEND_URL kann weggelassen werden → default http://localhost:8500.
// Port 8000 wird explizit abgelehnt.
//
// Quick start (kein manueller Backend-Start nötig):
//   npx playwright test
//
// Oder mit explizitem Port:
//   BACKEND_URL=http://localhost:8500 npx playwright test

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8500'

// Sicherheitsnetz: Port 8000 ist der Produktiv-Port — niemals für E2E.
if (backendUrl.includes(':8000')) {
  throw new Error(
    '\n[E2E] BACKEND_URL zeigt auf Port 8000 — das ist der PRODUKTIV-Port!\n' +
    '  E2E-Tests verwenden Port 8500.\n' +
    '  Lösung: BACKEND_URL weglassen (→ auto 8500) oder BACKEND_URL=http://localhost:8500 setzen.\n'
  )
}

const frontendPort = process.env.E2E_FRONTEND_PORT ?? '3500'
const frontendUrl = process.env.FRONTEND_URL ?? `http://127.0.0.1:${frontendPort}`

export default defineConfig({
  testDir: './e2e',
  // Exclude files with `_` prefix — those are Vitest unit tests (e.g. _parser.spec.ts),
  // not Playwright browser tests. Journey spec files (without `_`) are included via testDir.
  testIgnore: ['**/e2e/journeys/_*.spec.ts', '**/e2e/journeys/_*.ts'],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  // list = Konsolenausgabe wie bisher (Default); der zweite Reporter räumt nach grünem Lauf alle
  // Testdaten des Laufs (Marker e2e-<RUN>-…) und die generierten Kategorien auf (B8950-012).
  reporter: [[process.env.CI ? 'dot' : 'list'], ['./e2e/reporters/cleanup-test-data.ts']],
  // workers:2 + Retry-Helper in e2e/journeys/_helpers.ts; die strikten App-Limits (B6220-001) entschärft
  // die Test-Instanz selbst: scripts/start_test_server.sh setzt RATE_LIMIT_TEST_MULTIPLIER (nur pundo_test, B8950-012).
  workers: 2,
  use: {
    baseURL: frontendUrl,
  },
  webServer: {
    // Standalone-Build mit Fingerabdruck-Cache (kein veralteter Build, kein Rebuild ohne Codeänderung);
    // E2E_FRONTEND_MODE=dev startet stattdessen `npm run dev:test`. Siehe scripts/e2e-frontend.cjs.
    command: 'node scripts/e2e-frontend.cjs start',
    url: frontendUrl,
    reuseExistingServer: true,
    timeout: 600_000,
    env: {
      BACKEND_URL: backendUrl,
      PORT: frontendPort,
    },
  },
})
