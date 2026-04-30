import { defineConfig } from '@playwright/test'

/**
 * Smoketest Playwright config.
 *
 * IMPORTANT: No webServer — this config tests against a live domain
 * configured via SMOKETEST_BASE_URL env var.
 *
 * Port convention: smoketests run against prod domains (pundo.cy / naidivse.cy),
 * NEVER against 3000 (prod local) or 3500 (test local).
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  workers: 1, // sequential — avoid rate-limit issues on prod
  reporter: [['list'], ['html', { outputFolder: 'report', open: 'never' }]],
  use: {
    headless: true,
    // Extra headers applied to all requests
    extraHTTPHeaders: {
      'X-Smoketest': '1',
      'User-Agent': 'pundo-smoketester/1.0 (+https://github.com/pundo-cy/pundo_frontend/tree/main/smoketests)',
    },
    // No baseURL — set per-brand in runner.ts
  },
})
