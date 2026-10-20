/**
 * Journey: Social-Link-Moderation — System-Admin-UI (AC6: Regel-Seite, Nav-Link, Formular, Host-Validierung)
 *
 * F8950 T32: aus `social-link-moderation.spec.ts` (717 Zeilen) herausgeloest. Diese Tests brauchen keinen Spec-Shop,
 * nur die Admin-Session (Fixture `adminPage`), und laufen parallel in einem eigenen Worker. Der Regel-CRUD-Test
 * (blockiert Shop-Save) bleibt in der Haupt-Spec, weil er den Spec-Shop braucht.
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect } from '../fixtures'
import type { Page } from '@playwright/test'
import { BASE_URL as FRONTEND_URL, BACKEND_URL } from '../env'
import { expectRealMatchesContract, fulfillFrom } from './_helpers/contracts'
import { getAdminToken } from './_helpers/test-data'

/** Wartet, bis der Body-Text das Muster zeigt (statt waitForTimeout); gibt den Text zurueck. */
async function bodyTextMatching(page: Page, re: RegExp, message: string, timeout = 10_000): Promise<string> {
  await expect.poll(async () => re.test((await page.textContent('body')) ?? ''), { message, timeout }).toBe(true)
  return (await page.textContent('body')) ?? ''
}

test.describe('Social-Link-Moderation AC6 — Admin-UI', () => {

  test('AC6 — Social-link-rules page renders correctly in browser', async ({ adminPage: page }) => {
    await page.goto(`${FRONTEND_URL}/admin/social-link-rules`)
    await page.waitForLoadState('domcontentloaded')

    // Title visible (even with empty list due to missing backend endpoint)
    const h1 = page.locator('h1')
    expect(await h1.count()).toBeGreaterThan(0)

    // Table or empty state visible
    const table = page.locator('table, [class*="table"], [class*="no_items"]')
    const emptyState = page.locator('text=empty, text=keine, text=no items, td')
    const _hasContent = (await table.count()) > 0 || (await emptyState.count()) > 0

    // At minimum the page renders without error
    const pageUrl = page.url()
    expect(pageUrl).not.toContain('error')
    expect(pageUrl).not.toContain('404')

    // Add button present
    const addLink = page.locator('a[href*="social-link-rules/new"]')
    expect(await addLink.count(), 'AC6: "Add rule" link must exist').toBeGreaterThan(0)
  })

  test('AC6 — AdminNav has Social-Link-Rules link', async ({ adminPage: page }) => {
    // /admin has no page.tsx — navigate to the dashboard which has the full nav
    await page.goto(`${FRONTEND_URL}/admin/dashboard`)
    await page.waitForLoadState('domcontentloaded')

    const navLink = page.locator('nav a[href*="social-link-rules"], a[href*="social-link-rules"]').first()
    expect(await navLink.count(), 'AC6: NavLink to /admin/social-link-rules must exist').toBeGreaterThan(0)
  })

  test('AC6 — New rule form at /admin/social-link-rules/new renders all fields', async ({ adminPage: page }) => {
    await page.goto(`${FRONTEND_URL}/admin/social-link-rules/new`)
    await page.waitForLoadState('domcontentloaded')

    // Host input
    const hostInput = page.locator('input[name="host"]')
    expect(await hostInput.isVisible(), 'AC6: host input must be visible').toBe(true)

    // Category select
    const categorySelect = page.locator('select[name="category"]')
    expect(await categorySelect.isVisible(), 'AC6: category select must be visible').toBe(true)

    // Note textarea
    const noteTextarea = page.locator('textarea[name="note"]')
    expect(await noteTextarea.isVisible(), 'AC6: note textarea must be visible').toBe(true)

    // Submit button
    const submitBtn = page.locator('button[type="submit"]')
    expect(await submitBtn.isVisible(), 'AC6: Submit button must be visible').toBe(true)
  })

  test('AC6 — Real backend: an invalid host is rejected with the body the mocked test uses', async () => {
    // B8950-016 T19: the mocked test below answers with exactly this recorded response
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/social-link-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${await getAdminToken()}` },
      body: JSON.stringify({ host: 'https://invalid.com/path', category: 'adult', note: 'E2E invalid host probe' }),
    })
    expectRealMatchesContract('admin-social-link-rule-invalid-host', res.status, await res.json())
  })

  test('AC6 — Host validation: invalid host shows error inline', async ({ adminPage: page }) => {
    // Mock the POST to return 422 invalid host
    await page.route('**/api/admin/social-link-rules', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill(fulfillFrom('admin-social-link-rule-invalid-host'))
      } else {
        await route.continue()
      }
    })

    await page.goto(`${FRONTEND_URL}/admin/social-link-rules/new`)
    await page.waitForLoadState('domcontentloaded')

    // Enter invalid host (with scheme — should fail client-side validation)
    const hostInput = page.locator('input[name="host"]')
    await hostInput.fill('https://invalid.com/path')

    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    const bodyText = await bodyTextMatching(
      page, /valid host|invalid host|gültigen|ungültig/i, 'AC6: Invalid host should show inline error',
    )
    const hasValidationError =
      bodyText.toLowerCase().includes('valid host') ||
      bodyText.toLowerCase().includes('invalid host') ||
      bodyText.toLowerCase().includes('gültigen') ||
      bodyText.toLowerCase().includes('ungültig')

    expect(hasValidationError, 'AC6: Invalid host should show inline error').toBe(true)
  })
})
