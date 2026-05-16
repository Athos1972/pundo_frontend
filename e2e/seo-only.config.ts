/**
 * Minimale Playwright-Config für SEO-Tests — kein globalSetup, kein webServer-Check.
 * Voraussetzung: Frontend läuft bereits auf Port 3500.
 */
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testIgnore: ['**/_*.spec.ts', '**/_*.ts'],
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:3500',
    actionTimeout: 15000,
  },
})
