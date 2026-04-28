/**
 * E2E-Tests: HTTP Security Headers (T3 — F6990 Phase 1)
 *
 * AC: GET / must return all required security headers.
 *
 * Uses Playwright's request context (page.request.get) so that response
 * headers are accessible — browser navigation does not expose them.
 *
 * Runs against port 3500 per port convention.
 */

import { test, expect } from '@playwright/test'

test.describe('HTTP Security Headers', () => {
  test('GET / returns all required security headers', async ({ page }) => {
    const response = await page.request.get('http://localhost:3500/')

    expect(response.ok()).toBeTruthy()

    const headers = response.headers()

    // Strict-Transport-Security must contain max-age
    const hsts = headers['strict-transport-security']
    expect(hsts, 'Strict-Transport-Security should be set').toBeTruthy()
    expect(hsts).toContain('max-age')

    // X-Content-Type-Options must be nosniff
    expect(headers['x-content-type-options'], 'X-Content-Type-Options').toBe('nosniff')

    // Referrer-Policy must be strict-origin-when-cross-origin
    expect(headers['referrer-policy'], 'Referrer-Policy').toBe('strict-origin-when-cross-origin')

    // X-Frame-Options must be DENY
    expect(headers['x-frame-options'], 'X-Frame-Options').toBe('DENY')

    // Permissions-Policy must be set (any non-empty value)
    expect(headers['permissions-policy'], 'Permissions-Policy should be set').toBeTruthy()
  })
})
