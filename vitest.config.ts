import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.{ts,tsx}', 'e2e/journeys/_parser.spec.ts'],
    exclude: ['node_modules/**'],
  },
  resolve: {
    alias: {
      '@': '/Users/bb_studio_2025/dev/github/pundo_frontend/src',
      '@radix-ui/react-tooltip': '/Users/bb_studio_2025/dev/github/pundo_frontend/src/tests/__mocks__/radix-tooltip.tsx',
      '@radix-ui/react-popover': '/Users/bb_studio_2025/dev/github/pundo_frontend/src/tests/__mocks__/radix-popover.tsx',
    },
  },
})
