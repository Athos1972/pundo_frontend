import { defineConfig } from '@playwright/test'

// E2E tests use the standalone production server on a dedicated port (3002).
// This avoids conflicts with a running `next dev` server.
//
// IMPORTANT: The frontend must be built with the correct BACKEND_URL before
// running tests, because next.config.ts bakes API rewrites at build time.
//
// Quick start:
//   E2E_BACKEND_PORT=8002 ./scripts/start_test_server.sh     # in pundo_main_backend
//   BACKEND_URL=http://localhost:8002 npx playwright test     # builds + runs
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8001'
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
