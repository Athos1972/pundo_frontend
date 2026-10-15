import { defineConfig } from '@playwright/test'
import { BASE_URL } from './env'
export default defineConfig({
  testDir: '.',
  // Kein Setup, aber: der Server auf 3500 muss aktuellen Code ausliefern (B8950-012, AK6)
  globalSetup: './frontend-freshness.ts',
  testMatch: ['smoke.spec.ts', 'smoke-shop-visibility.spec.ts'],
  use: { baseURL: BASE_URL },
  timeout: 30000,
  workers: 1,
})
