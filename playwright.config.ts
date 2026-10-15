import { defineConfig } from '@playwright/test'
import { BACKEND_URL, BASE_URL } from './e2e/env'

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

// URLs und der Port-8000/3000-Guard: einzige Quelle e2e/env.ts.
const backendUrl = BACKEND_URL
const frontendUrl = BASE_URL
const frontendPort = process.env.E2E_FRONTEND_PORT ?? '3500'

// Coverage-Modus (optional, docs/e2e-testing.md "Coverage"): E2E_COVERAGE=1 misst src/** (Browser: V8-Coverage ueber
// e2e/coverage/, Server: NODE_V8_COVERAGE am Coverage-Build .next-cov). Ohne die Variable aendert sich nichts.
const coverage = process.env.E2E_COVERAGE === '1'

export default defineConfig({
  // Coverage: `@playwright/test` -> e2e/coverage/pw-test.ts (tsconfig-paths), damit alle Specs ohne Aenderung messen.
  ...(coverage ? { tsconfig: './tsconfig.e2e-cov.json' } : {}),
  testDir: './e2e',
  // Exclude files with `_` prefix — those are Vitest unit tests (e.g. _parser.spec.ts),
  // not Playwright browser tests. Journey spec files (without `_`) are included via testDir.
  testIgnore: ['**/e2e/journeys/_*.spec.ts', '**/e2e/journeys/_*.ts'],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  // list = Konsolenausgabe wie bisher (Default).
  // json = Laufzeit je Datei fuer scripts/e2e-durations.mjs (T3, F8950). Ein CLI-`--reporter` ersetzt ALLE
  // Config-Reporter (der JSON-Report entfaellt dann). Der Cleanup liegt im globalTeardown und ist davon unabhaengig.
  reporter: [
    [process.env.CI ? 'dot' : 'list'],
    ['json', { outputFile: 'test-results/e2e-report.json' }],
  ],
  // workers:4 (F8950 T16). Geteilter State geprueft (docs/e2e-testing.md "Geteilter State"): Specs, die schreiben,
  // laufen in workerShop/specShop; der globale e2e-test-shop wird nur gelesen. Der fruehere Rate-Limit-Grund fuer
  // workers:2 ist entfallen (RATE_LIMIT_TEST_MULTIPLIER=40 in scripts/start_test_server.sh, Impersonation statt Login);
  // Retry-Helper fuer 429 bleiben in e2e/journeys/_helpers.ts.
  workers: 4,
  // Abbruch nach N Fehlern (F8950 T15): ein kaputter Build soll nicht den vollen Lauf kosten.
  maxFailures: process.env.E2E_MAX_FAILURES ? Number(process.env.E2E_MAX_FAILURES) : 15,
  // Projekte (F8950 T15): `smoke` = Tests mit Tag @smoke (ca. 40, Gate), `full` = alle anderen. `full` haengt an
  // `smoke`: schlaegt ein Smoke-Test fehl, laeuft `full` nicht. Jeder Test laeuft in genau einem Projekt.
  //   npx playwright test --project=smoke            nur das Gate (auch fuer den Backend-Push, A5)
  //   npx playwright test --project=full --no-deps   ohne vorheriges Gate
  projects: [
    { name: 'smoke', grep: /@smoke/ },
    { name: 'full', grepInvert: /@smoke/, dependencies: ['smoke'] },
  ],
  use: {
    baseURL: frontendUrl,
  },
  webServer: {
    // Standalone-Build mit Fingerabdruck-Cache (kein veralteter Build, kein Rebuild ohne Codeänderung);
    // E2E_FRONTEND_MODE=dev startet stattdessen `npm run dev:test`. Siehe scripts/e2e-frontend.cjs.
    command: 'node scripts/e2e-frontend.cjs start',
    url: frontendUrl,
    // Coverage: ein bereits laufender (nicht instrumentierter) Server darf nicht wiederverwendet werden; SIGTERM mit
    // Wartezeit, damit Node die V8-Rohdaten (NODE_V8_COVERAGE) beim Beenden schreibt.
    reuseExistingServer: !coverage,
    ...(coverage ? { gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 20_000 } } : {}),
    timeout: 600_000,
    env: {
      BACKEND_URL: backendUrl,
      PORT: frontendPort,
    },
  },
})
