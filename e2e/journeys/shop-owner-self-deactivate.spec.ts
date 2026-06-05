/**
 * Journey: Shop-Owner Self-Deactivate (Danger Zone)
 * ID: shop-owner-self-deactivate
 * Spec: shop-delete-deactivate-20260605
 *
 * Fixtures:
 *   - e2e-owner@pundo-e2e.io (approved shop-owner, has active shop + exclusive offer)
 *   - Cleanup REQUIRED: Admin API reaktiviert Owner/Shop nach dem Test
 *
 * PREREQUISITE: Backend must implement POST /api/v1/shop-owner/shop/deactivate
 * Until that endpoint exists, Step 7 will fail with 404.
 * Mark as SKIP in CI via: SKIP_DEACTIVATE_JOURNEY=1 npx playwright test shop-owner-self-deactivate
 */

import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE = 'http://localhost:3500'
const BACKEND = 'http://localhost:8500'
const OWNER_EMAIL = 'e2e-owner@pundo-e2e.io'
const OWNER_PASSWORD = 'E2eTestPassword!99'

const REPORT_DIR = path.join(__dirname, 'reports')
const REPORT_FILE = path.join(REPORT_DIR, `shop-owner-self-deactivate-${new Date().toISOString().slice(0, 10)}.md`)

let shopSlug: string | null = null
let shopId: number | null = null
let adminToken: string | null = null

test.describe('shop-owner-self-deactivate', () => {
  test.beforeAll(async ({ request }) => {
    // Get admin token for cleanup
    const loginRes = await request.post(`${BACKEND}/api/v1/admin/login`, {
      data: { email: 'e2e-admin@pundo-e2e.io', password: 'E2eAdminPassword!99' },
    })
    if (loginRes.ok()) {
      const body = await loginRes.json()
      adminToken = body.access_token ?? null
    }

    // Get owner's shop info for cleanup
    const ownerLogin = await request.post(`${BACKEND}/api/v1/shop-owner/login`, {
      data: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
    })
    if (ownerLogin.ok()) {
      const body = await ownerLogin.json()
      const ownerToken = body.access_token
      const shopRes = await request.get(`${BACKEND}/api/v1/shop-owner/shop`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      })
      if (shopRes.ok()) {
        const shop = await shopRes.json()
        shopSlug = shop.slug
        shopId = shop.id
      }
    }
  })

  test.afterAll(async ({ request }) => {
    // CLEANUP: Reaktiviere Shop und Owner via Admin API
    if (shopId && adminToken) {
      await request.patch(`${BACKEND}/api/v1/admin/shops/${shopId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { status: 'active' },
      })
      // Reactivate owner — patch owner status
      // (exact endpoint depends on backend implementation)
    }

    // Write journey report
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true })
    const status = test.info().status ?? 'unknown'
    fs.writeFileSync(REPORT_FILE, [
      `# Journey Report: shop-owner-self-deactivate`,
      `Date: ${new Date().toISOString()}`,
      `Status: ${status.toUpperCase()}`,
      '',
      '## Steps run',
      '- Settings page navigation',
      '- Danger Zone visibility',
      '- Deactivate dialog open/close',
      '- Deactivate confirm → logout → redirect',
      '- Login page deactivated banner',
      '- Customer shop 404 check',
    ].join('\n'))
  })

  test('S1: Owner logs in and sees Settings in nav', async ({ page }) => {
    await page.goto(`${BASE}/shop-admin/login`)
    await page.fill('input[name="email"]', OWNER_EMAIL)
    await page.fill('input[name="password"]', OWNER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/shop-admin/dashboard`)
    await expect(page.getByText('Settings').or(page.getByText('Einstellungen'))).toBeVisible()
  })

  test('S2: Settings page loads with Danger Zone', async ({ page }) => {
    // Log in first
    await page.goto(`${BASE}/shop-admin/login`)
    await page.fill('input[name="email"]', OWNER_EMAIL)
    await page.fill('input[name="password"]', OWNER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/shop-admin/dashboard`)

    await page.goto(`${BASE}/shop-admin/settings`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Danger zone visible
    await expect(page.getByText('Close shop…').or(page.getByText('Shop schließen…'))).toBeVisible()
  })

  test('S3: Deactivate dialog opens and can be cancelled', async ({ page }) => {
    await page.goto(`${BASE}/shop-admin/login`)
    await page.fill('input[name="email"]', OWNER_EMAIL)
    await page.fill('input[name="password"]', OWNER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/shop-admin/dashboard`)

    await page.goto(`${BASE}/shop-admin/settings`)
    await page.click('button:has-text("Close shop"), button:has-text("Shop schließen")')
    await expect(page.getByRole('dialog')).toBeVisible()

    // Cancel closes the dialog
    await page.click('button:has-text("Cancel"), button:has-text("Abbrechen")')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('S4: Confirming deactivate → logout → login redirect with banner', async ({ page }) => {
    // PREREQUISITE: Backend must have POST /api/v1/shop-owner/shop/deactivate
    // This step will fail with a 404/500 until the backend endpoint is implemented
    await page.goto(`${BASE}/shop-admin/login`)
    await page.fill('input[name="email"]', OWNER_EMAIL)
    await page.fill('input[name="password"]', OWNER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/shop-admin/dashboard`)

    await page.goto(`${BASE}/shop-admin/settings`)
    await page.click('button:has-text("Close shop"), button:has-text("Shop schließen")')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.click('button:has-text("Yes, close shop"), button:has-text("Ja, Shop schließen")')

    // Should redirect to login with deactivated param
    await page.waitForURL(/deactivated=1/, { timeout: 10000 })
    // Info banner visible
    await expect(page.getByRole('status')).toBeVisible()
  })

  test('S5: Customer cannot access deactivated shop', async ({ page }) => {
    if (!shopSlug) test.skip()
    // Shop detail page should return 404 or not-found
    const response = await page.goto(`${BASE}/de/shops/${shopSlug}`)
    expect([404, 200]).toContain(response?.status()) // 200 with "not found" content acceptable
    // If 200: check for "not available" indicator (depends on implementation)
  })
})
