import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '**/legal-pages.spec.ts',
  use: {
    baseURL: 'http://localhost:3500',
  },
})
