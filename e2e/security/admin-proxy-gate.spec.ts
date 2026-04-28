/**
 * E2E-Tests: System-Admin Proxy-Gate (T17 — F6990 Phase 2)
 *
 * AC-7: Given an unauthenticated user
 * When they navigate directly to /admin/dashboard (no admin_token cookie)
 * Then the proxy redirects them to /admin/login (not the layout — at proxy level)
 *
 * Runs against port 3500 per port convention.
 */

import { test, expect } from '@playwright/test'

test.describe('System-Admin Proxy-Gate', () => {
  test('unauthenticated GET /admin/dashboard redirects to /admin/login', async ({ page }) => {
    // Ensure no admin_token cookie is present.
    await page.context().clearCookies()

    // Navigate directly — should be intercepted by the proxy.
    await page.goto('/admin/dashboard')

    // The proxy must redirect to /admin/login before any layout renders.
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 })
  })

  test('/admin/login is accessible without cookie', async ({ page }) => {
    await page.context().clearCookies()
    const response = await page.goto('/admin/login')
    // Must not redirect to another login page or return an error.
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('unauthenticated GET /admin/ redirects to /admin/login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin/')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 })
  })
})
