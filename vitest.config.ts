import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.{ts,tsx}', 'e2e/journeys/_parser.spec.ts', 'tests/unit/**/*.test.ts'],
    exclude: ['node_modules/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@radix-ui/react-tooltip': path.resolve(__dirname, 'src/tests/__mocks__/radix-tooltip.tsx'),
      '@radix-ui/react-popover': path.resolve(__dirname, 'src/tests/__mocks__/radix-popover.tsx'),
    },
  },
})
