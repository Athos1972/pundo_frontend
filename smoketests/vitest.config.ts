import { defineConfig } from 'vitest/config'

/**
 * Vitest config for the smoketester.
 * Standalone — does NOT inherit from the frontend root vitest.config.ts.
 * No React plugin needed here (pure Node.js TypeScript).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
})
