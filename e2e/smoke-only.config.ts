import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  testMatch: 'smoke.spec.ts',
  use: { baseURL: 'http://127.0.0.1:3500' },
  timeout: 30000,
})
