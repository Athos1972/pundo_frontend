import { defineConfig } from '@playwright/test'
import { BASE_URL } from './env'

export default defineConfig({
  testDir: '.',
  testMatch: '**/legal-pages.spec.ts',
  use: {
    baseURL: BASE_URL,
  },
})
