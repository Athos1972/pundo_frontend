/**
 * Playwright config ohne global-setup — nutzt vorhandenes .test-state.json.
 *
 * Voraussetzung: Backend läuft auf 8500, Frontend auf 3500, .test-state.json vorhanden.
 * Verwendung:
 *   npx playwright test <spec> --config=e2e/no-setup.config.ts
 */
import { defineConfig } from '@playwright/test'

const frontendPort = process.env.E2E_FRONTEND_PORT ?? '3500'
const frontendUrl = process.env.FRONTEND_URL ?? `http://127.0.0.1:${frontendPort}`

export default defineConfig({
  testDir: '.',
  testIgnore: ['**/_*.spec.ts', '**/_*.ts'],
  // Kein globalSetup — .test-state.json muss bereits vorhanden sein
  workers: 2,
  use: {
    baseURL: frontendUrl,
  },
  webServer: {
    command: `echo "Using existing server on ${frontendUrl}"`,
    url: frontendUrl,
    reuseExistingServer: true,
    timeout: 10_000,
  },
})
