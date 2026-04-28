/**
 * E2E-Tests: Open Redirect Security (T2 — F6990 Phase 1)
 *
 * AC-1: Given a login URL with ?next=https://evil.example
 * When login succeeds
 * Then the browser must end up on /shop-admin/dashboard (not the evil URL)
 *
 * Runs against port 3500 / backend 8500 per port convention.
 */

import { test, expect } from '@playwright/test'

const SHOP_OWNER_EMAIL = 'e2e-owner@pundo-e2e.io'
const SHOP_OWNER_PASSWORD = 'E2eTestPassword!99'

test.describe('Open Redirect Protection', () => {
  test('login with ?next=https://evil.example redirects to /shop-admin/dashboard', async ({ page }) => {
    // Navigate to shop-admin login with malicious next param
    await page.goto('/shop-admin/login?next=https%3A%2F%2Fevil.example')

    // Fill and submit login form
    await page.getByLabel(/email/i).fill(SHOP_OWNER_EMAIL)
    await page.getByLabel(/password/i).fill(SHOP_OWNER_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for navigation to complete
    await page.waitForURL(/\/shop-admin\//, { timeout: 10_000 })

    const url = new URL(page.url())

    // Must be same origin (no external redirect)
    expect(url.hostname).not.toBe('evil.example')
    expect(url.origin).toMatch(/127\.0\.0\.1|localhost/)

    // Must land on /shop-admin/dashboard (the safe fallback)
    expect(url.pathname).toBe('/shop-admin/dashboard')
  })

  test('login with ?next=//evil.example redirects to /shop-admin/dashboard', async ({ page }) => {
    await page.goto('/shop-admin/login?next=%2F%2Fevil.example')

    await page.getByLabel(/email/i).fill(SHOP_OWNER_EMAIL)
    await page.getByLabel(/password/i).fill(SHOP_OWNER_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    await page.waitForURL(/\/shop-admin\//, { timeout: 10_000 })

    const url = new URL(page.url())
    expect(url.pathname).toBe('/shop-admin/dashboard')
  })

  test('login with valid ?next=/shop-admin/products redirects to that path', async ({ page }) => {
    await page.goto('/shop-admin/login?next=%2Fshop-admin%2Fproducts')

    await page.getByLabel(/email/i).fill(SHOP_OWNER_EMAIL)
    await page.getByLabel(/password/i).fill(SHOP_OWNER_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    await page.waitForURL(/\/shop-admin\//, { timeout: 10_000 })

    const url = new URL(page.url())
    expect(url.pathname).toBe('/shop-admin/products')
  })
})
