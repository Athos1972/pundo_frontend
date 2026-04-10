import { defineConfig } from '@playwright/test'

// Port-Konvention (PFLICHT — niemals mischen):
//   Produktion:  Backend 8001, Frontend 3000
//   E2E-Tests:   Backend 8002, Frontend 3002
//
// Der global-setup startet das Test-Backend automatisch (kill + restart).
// BACKEND_URL kann weggelassen werden → default http://localhost:8002.
// Port 8001 wird explizit abgelehnt.
//
// Quick start (kein manueller Backend-Start nötig):
//   npx playwright test
//
// Oder mit explizitem Port:
//   BACKEND_URL=http://localhost:8002 npx playwright test

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8002'

// Sicherheitsnetz: Port 8001 ist der Produktiv-Port — niemals für E2E.
if (backendUrl.includes(':8001')) {
  throw new Error(
    '\n[E2E] BACKEND_URL zeigt auf Port 8001 — das ist der PRODUKTIV-Port!\n' +
    '  E2E-Tests verwenden Port 8002.\n' +
    '  Lösung: BACKEND_URL weglassen (→ auto 8002) oder BACKEND_URL=http://localhost:8002 setzen.\n'
  )
}

const frontendPort = process.env.E2E_FRONTEND_PORT ?? '3002'
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
