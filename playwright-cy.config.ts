import { defineConfig, devices } from '@playwright/test'

// Playwright-Config für lesende E2E-Tests gegen pundo.cy (Produktion/Staging).
// KEIN globalSetup, KEIN webServer — die Seite läuft bereits.
// Cookie-Domain wird per Env-Variable gesetzt:
//   E2E_COOKIE_DOMAIN=pundo.cy npx playwright test --config playwright-cy.config.ts

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/main.spec.ts'],
  workers: 2,
  retries: 1,
  use: {
    baseURL: 'https://pundo.cy',
    // DNS-Override: pundo.cy A-Record zeigt noch auf alten Server (185.26.106.234, kein HTTPS).
    // Chromium-Flag umgeht den DNS und routet direkt auf den nginx-Server (138.201.141.109).
    launchOptions: {
      args: ['--host-resolver-rules=MAP pundo.cy 138.201.141.109'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
