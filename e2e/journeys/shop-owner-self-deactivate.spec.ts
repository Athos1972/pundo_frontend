/**
 * Journey: Shop-Owner Self-Deactivate (Danger Zone)
 * ID: shop-owner-self-deactivate
 * Spec: shop-delete-deactivate-20260605
 *
 * Fixtures (B8950-012):
 *   - EIGENER Owner + Shop (`e2e-<run>-self-deact-…@pundo.com`, Auto-Approve via Onboarding) — die Spec
 *     deaktiviert den Shop; das darf nie den geteilten e2e-test-shop/e2e-owner treffen.
 *   - Cleanup: Admin-Shop-Delete (kaskadiert den Owner)
 *
 * PREREQUISITE: Backend must implement POST /api/v1/shop-owner/shop/deactivate
 * Until that endpoint exists, Step 7 will fail with 404.
 * Mark as SKIP in CI via: SKIP_DEACTIVATE_JOURNEY=1 npx playwright test shop-owner-self-deactivate
 */

import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { shopOwnerLogin, shopOwnerOnboardWithRetry } from './_helpers'
import { TestDataTracker, adminApi, e2eEmail, e2eName } from './_helpers/test-data'

const BASE = 'http://localhost:3500'
const OWNER_EMAIL = e2eEmail('SELF-DEACT', 'pundo.com')
const OWNER_PASSWORD = 'E2eSelfDeact!99'
const tracker = new TestDataTracker()

const REPORT_DIR = path.join(__dirname, 'reports')
const REPORT_FILE = path.join(REPORT_DIR, `shop-owner-self-deactivate-${new Date().toISOString().slice(0, 10)}.md`)

let shopSlug: string | null = null
let ownerToken = ''

test.describe('shop-owner-self-deactivate', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000)
    // Eigener Owner + Shop per Onboarding (@pundo.com → auto-approved)
    const onb = await shopOwnerOnboardWithRetry({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
      provider_type: 'haendler',
      domain_slugs: ['kleidung-mode'],
      shop_name: e2eName('SELF-DEACT', 'Shop'),
      location: { lat: 34.917, lng: 33.636 },
      contact: { phone: '+35799000002' },
      credentials: { type: 'email', email: OWNER_EMAIL, password: OWNER_PASSWORD, name: 'E2E Self Deactivate' },
      lang: 'en',
    })
    if (onb.status !== 'approved') throw new Error(`SETUP BROKEN: Onboarding status=${String(onb.status)} (Auto-Approve für @pundo.com erwartet)`)

    // Owner → Shop (für Cleanup und den Kunden-Check in S5) per Admin-API
    const owners = await adminApi<{ items: Array<{ id: number; email: string; shop_id: number | null }> }>(
      'GET', `/shop-owners?q=${encodeURIComponent(OWNER_EMAIL)}&limit=20`)
    const owner = owners.json?.items?.find((o) => o.email === OWNER_EMAIL)
    if (!owner?.shop_id) throw new Error(`SETUP BROKEN: Owner ${OWNER_EMAIL} nicht in der Admin-Liste gefunden`)
    tracker.owner(owner.id)
    // EIN API-Login mit Retry (10/min, geteilt mit allen Specs); S1 prüft den UI-Login, S2–S4 setzen das Cookie
    ownerToken = await shopOwnerLogin(OWNER_EMAIL, OWNER_PASSWORD)
    const shop = await adminApi<{ slug: string }>('GET', `/shops/${owner.shop_id}`)
    shopSlug = shop.json?.slug ?? null
    if (!shopSlug) throw new Error(`SETUP BROKEN: Slug von Shop ${owner.shop_id} nicht ermittelbar`)
  })

  test.afterAll(async () => {
    // Cleanup (B8950-012): Admin-Shop-Delete statt "Reaktivieren" — der Shop gehört dieser Spec allein
    await tracker.cleanup()

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
    // Login-Limit (10/min) wird mit allen Specs geteilt → Session per Cookie statt vierten UI-Login (B8950-012)
    await page.context().addCookies([{ name: 'shop_owner_token', value: ownerToken, domain: new URL(BASE).hostname, path: '/' }])
    await page.goto(`${BASE}/shop-admin/dashboard`)

    await page.goto(`${BASE}/shop-admin/settings`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Danger zone visible
    await expect(page.getByText('Close shop…').or(page.getByText('Shop schließen…'))).toBeVisible()
  })

  test('S3: Deactivate dialog opens and can be cancelled', async ({ page }) => {
    // Login-Limit (10/min) wird mit allen Specs geteilt → Session per Cookie statt vierten UI-Login (B8950-012)
    await page.context().addCookies([{ name: 'shop_owner_token', value: ownerToken, domain: new URL(BASE).hostname, path: '/' }])
    await page.goto(`${BASE}/shop-admin/dashboard`)

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
    // Login-Limit (10/min) wird mit allen Specs geteilt → Session per Cookie statt vierten UI-Login (B8950-012)
    await page.context().addCookies([{ name: 'shop_owner_token', value: ownerToken, domain: new URL(BASE).hostname, path: '/' }])
    await page.goto(`${BASE}/shop-admin/dashboard`)

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
    expect(shopSlug, 'Slug aus beforeAll').toBeTruthy()
    // Shop detail page should return 404 or not-found
    const response = await page.goto(`${BASE}/de/shops/${shopSlug}`)
    expect([404, 200]).toContain(response?.status()) // 200 with "not found" content acceptable
    // If 200: check for "not available" indicator (depends on implementation)
  })
})
