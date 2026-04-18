import { defineConfig } from '@playwright/test'

// Minimale Config für Coming-Soon-Tests — kein Backend nötig.
// Läuft gegen bereits laufenden Test-Frontend auf Port 3500.
export default defineConfig({
  testDir: '.',
  testMatch: '**/coming-soon.spec.ts',
  use: {
    baseURL: 'http://localhost:3500',
  },
})
