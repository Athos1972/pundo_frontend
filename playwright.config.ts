import { defineConfig } from '@playwright/test'

// Port-Konvention (PFLICHT — niemals mischen):
//   Produktion:  Backend 8000, Frontend 3000
//   E2E-Tests:   Backend 8500, Frontend 3500
//
// Der global-setup startet das Test-Backend automatisch (kill + restart).
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
const frontendUrl = process.env.FRONTEND_URL ?? `http://localhost:${frontendPort}`

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: frontendUrl,
  },
  webServer: {
    // Build with the right BACKEND_URL (bakes rewrites), then start standalone.
    // next start is incompatible with output:standalone — use server.js directly.
    // After build, static assets must be copied into the standalone dir (Next.js requirement).
    command: `BACKEND_URL=${backendUrl} npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && PORT=${frontendPort} BACKEND_URL=${backendUrl} node .next/standalone/server.js`,
    url: frontendUrl,
    reuseExistingServer: true,
    timeout: 300_000,
    env: {
      BACKEND_URL: backendUrl,
      PORT: frontendPort,
    },
  },
})
