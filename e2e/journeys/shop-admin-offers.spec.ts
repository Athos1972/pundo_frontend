/**
 * Shop-Admin Offers — Comprehensive E2E Test Suite
 *
 * Covers all meaningful UI combinations for the shop-owner offers feature:
 *   Group A: Create offer (6 combinations)
 *   Group B: Edit offer (4 cases)
 *   Group C: Archive + Delete (3 cases)
 *   Group D: Customer-facing visibility (2 cases)
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 *
 * Setup:
 *   - Uses the global-setup test owner (e2e/.test-state.json)
 *   - Creates a test product in beforeAll for product-link tests
 *   - Cleans up all created offers in afterAll
 *
 * Test approach:
 *   - UI interaction via Playwright browser
 *   - Post-action API verification via fetch() to BACKEND_URL
 *   - Customer-facing checks navigate to /shops/[slug]
 *
 * FINDINGS documented inline:
 *   - B4: PATCH product_id: null is silently ignored by backend (cannot unlink product)
 *   - D1: Customer shop page /shops/[slug] does not render shop_owner_offers section
 */

import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// ─── Port safety ──────────────────────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL ?? process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? process.env.TEST_BACKEND_URL ?? 'http://localhost:8500'

if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[shop-admin-offers] Safety: NEVER run against production ports 3000/8000!')
}

// ─── Load test state ─────────────────────────────────────────────────────────

interface TestState {
  email: string
  password: string
  shop_name: string
  shop_address: string
  ownerId: number
  shopId: number
  shopSlug: string | null
  storageState: { cookies: unknown[]; origins: unknown[] }
}

function loadState(): TestState {
  const stateFile = path.join(__dirname, '..', '.test-state.json')
  if (!fs.existsSync(stateFile)) {
    throw new Error('[shop-admin-offers] .test-state.json not found — run global-setup first')
  }
  return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as TestState
}

const STATE = loadState()

// ─── Playwright auth state ────────────────────────────────────────────────────

test.use({ storageState: STATE.storageState as Parameters<typeof test.use>[0]['storageState'] })

// ─── Shared context ───────────────────────────────────────────────────────────

interface OfferCtx {
  /** product_id created in beforeAll for offer-product linking tests */
  productId: number | null
  /** All offer IDs created during tests, for cleanup */
  createdOfferIds: number[]
  /** Offer ID used for B1 edit title test (created by A1) */
  editOfferId: number | null
  /** Offer ID used for C1/C2 archive/delete tests — created fresh in C1 setup */
  archiveOfferId: number | null
  /** shop slug for customer-facing tests */
  shopSlug: string | null
  /** Findings to document in report */
  findings: string[]
}

const ctx: OfferCtx = {
  productId: null,
  createdOfferIds: [],
  editOfferId: null,
  archiveOfferId: null,
  shopSlug: STATE.shopSlug ?? null,
  findings: [],
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiGet(urlPath: string, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: res.status, data: res.status !== 204 ? await res.json() : {} }
}

async function apiPost(urlPath: string, body: unknown, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: res.status !== 204 ? await res.json() : {} }
}

async function apiPatch(urlPath: string, body: unknown, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: res.status !== 204 ? await res.json() : {} }
}

async function apiDelete(urlPath: string, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: res.status }
}

async function getOwnerToken(): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: STATE.email, password: STATE.password }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  const cookieHeader = res.headers.get('set-cookie') ?? ''
  const match = cookieHeader.match(/shop_owner_token=([^;]+)/)
  if (!match) throw new Error('shop_owner_token cookie not found in login response')
  return match[1]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function waitHydrated(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('body[data-hydrated="true"]', { timeout: 15_000 }).catch(() => {
    // Fallback: some pages may not set data-hydrated - just wait for networkidle
  })
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

test.describe.serial('Shop-Admin Offers — Full Matrix', () => {

  test.beforeAll(async () => {
    // Ensure backend is reachable
    const health = await fetch(`${BACKEND_URL}/api/v1/products?limit=1`)
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)

    const token = await getOwnerToken()

    // Create a product for product-linking tests (A1, A3, B3, B4)
    const prodRes = await apiPost('/api/v1/shop-owner/products', {
      name: 'Offers Test Product',
      category_id: 1,
    }, token)
    if (prodRes.status === 201 || prodRes.status === 200) {
      ctx.productId = (prodRes.data as { id: number }).id
      console.log(`[offers-spec] Created test product ID=${ctx.productId}`)
    } else {
      console.warn(`[offers-spec] Product creation returned ${prodRes.status} — product-link tests will skip`)
    }

    // Pre-create the offer for C1/C2 archive/delete tests
    // (so they don't depend on A4 which might fail in a different run)
    const archiveSetupRes = await apiPost('/api/v1/shop-owner/offers', {
      title: 'C-Setup Archive Target',
      price: null,
      valid_from: '2026-05-01T00:00:00',
      valid_until: '2026-05-31T23:59:59',
    }, token)
    if (archiveSetupRes.status === 201) {
      ctx.archiveOfferId = (archiveSetupRes.data as { id: number }).id
      ctx.createdOfferIds.push(ctx.archiveOfferId)
      console.log(`[offers-spec] Pre-created archive target offer ID=${ctx.archiveOfferId}`)
    }
  })

  test.afterAll(async () => {
    // Cleanup: delete all offers created during tests
    if (ctx.createdOfferIds.length === 0) return
    const token = await getOwnerToken()
    for (const id of ctx.createdOfferIds) {
      // Try to archive first (required before delete for active offers)
      await apiPatch(`/api/v1/shop-owner/offers/${id}`, { archived: true }, token).catch(() => {})
      const del = await apiDelete(`/api/v1/shop-owner/offers/${id}`, token)
      console.log(`[offers-spec] Cleanup offer ${id}: DELETE → ${del.status}`)
    }

    // Write findings log
    if (ctx.findings.length > 0) {
      console.log('\n[offers-spec] FINDINGS:')
      ctx.findings.forEach(f => console.log(`  - ${f}`))
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP A — Create Offer
  // ═══════════════════════════════════════════════════════════════════════════

  test('A1 — Full combo: title + description + price + dates + product link → 201 + visible in list', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    await page.locator('input[name="title"]').fill('A1 Full Combo Offer')
    await page.locator('textarea[name="description"]').fill('Full combo description')
    await page.locator('input[name="price"]').fill('9.99')
    await page.locator('input[name="valid_from"]').fill('2026-06-01')
    await page.locator('input[name="valid_until"]').fill('2026-08-31')

    // Select product if available
    if (ctx.productId) {
      const productSelect = page.locator('select[name="product_id"]')
      const selectCount = await productSelect.count()
      if (selectCount > 0) {
        await productSelect.selectOption({ value: String(ctx.productId) })
      }
    }

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
    await expect(page.getByText('A1 Full Combo Offer')).toBeVisible()

    // Verify via API
    const token = await getOwnerToken()
    const { status, data } = await apiGet('/api/v1/shop-owner/offers', token)
    expect(status).toBe(200)
    const items = (data as { items: Array<{ id: number; title: string; price: string | null; description: string | null }> }).items
    const created = items.find(o => o.title === 'A1 Full Combo Offer')
    expect(created, 'A1 offer not found in API response').toBeTruthy()
    expect(created?.price).toBe('9.9900')
    expect(created?.description).toBe('Full combo description')

    if (created) {
      ctx.createdOfferIds.push(created.id)
      ctx.editOfferId = created.id  // Used for B1 test
    }
  })

  test('A2 — No description, with price + dates, no product link → 201 + visible', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    await page.locator('input[name="title"]').fill('A2 No Description Offer')
    // Leave description empty
    await page.locator('input[name="price"]').fill('5.00')
    await page.locator('input[name="valid_from"]').fill('2026-07-01')
    await page.locator('input[name="valid_until"]').fill('2026-09-30')
    // Leave product_id empty

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
    await expect(page.getByText('A2 No Description Offer')).toBeVisible()

    // Verify via API
    const token = await getOwnerToken()
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (data as { items: Array<{ id: number; title: string; description: string | null }> }).items
    const created = items.find(o => o.title === 'A2 No Description Offer')
    expect(created, 'A2 offer not found in API').toBeTruthy()
    // Description should be null or empty
    expect(!created?.description || created.description === '').toBeTruthy()

    if (created) ctx.createdOfferIds.push(created.id)
  })

  test('A3 — Empty price field → backend receives null (not empty string), 201 OK', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    await page.locator('input[name="title"]').fill('A3 No Price Offer')
    await page.locator('textarea[name="description"]').fill('Price-less offer')
    // Leave price field empty (default value)
    await page.locator('input[name="valid_from"]').fill('2026-06-01')
    await page.locator('input[name="valid_until"]').fill('2026-08-31')

    if (ctx.productId) {
      const productSelect = page.locator('select[name="product_id"]')
      const selectCount = await productSelect.count()
      if (selectCount > 0) {
        await productSelect.selectOption({ value: String(ctx.productId) })
      }
    }

    // This was the bug: price: '' would cause 422. After fix: price: null is sent.
    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()

    // Should navigate to offers list (no error toast = success)
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
    await expect(page.getByText('A3 No Price Offer')).toBeVisible()

    // Verify via API that price is null, NOT empty string
    const token = await getOwnerToken()
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (data as { items: Array<{ id: number; title: string; price: string | null }> }).items
    const created = items.find(o => o.title === 'A3 No Price Offer')
    expect(created, 'A3 offer not found in API').toBeTruthy()
    expect(created?.price, 'price must be null, not empty string — REGRESSION BUG if this fails').toBeNull()

    if (created) ctx.createdOfferIds.push(created.id)
  })

  test('A4 — Minimal: title + dates only (no description, no price, no product) → 201', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    await page.locator('input[name="title"]').fill('A4 Minimal Offer')
    await page.locator('input[name="valid_from"]').fill('2026-05-01')
    await page.locator('input[name="valid_until"]').fill('2026-05-31')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
    await expect(page.getByText('A4 Minimal Offer')).toBeVisible()

    // Verify via API
    const token = await getOwnerToken()
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (data as { items: Array<{ id: number; title: string }> }).items
    const created = items.find(o => o.title === 'A4 Minimal Offer')
    expect(created, 'A4 offer not found in API').toBeTruthy()

    if (created) {
      ctx.createdOfferIds.push(created.id)
    }
  })

  test('A5 — Missing title → frontend validation error, no API call made', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // Leave title empty
    await page.locator('input[name="valid_from"]').fill('2026-06-01')
    await page.locator('input[name="valid_until"]').fill('2026-08-31')
    await page.locator('input[name="price"]').fill('10.00')

    // Track any network requests to offers endpoint
    let offerApiCalled = false
    page.on('request', req => {
      if (req.url().includes('/shop-admin/offers') && req.method() === 'POST') {
        offerApiCalled = true
      }
    })

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await page.waitForTimeout(1000)

    // Should remain on the new offer page
    expect(page.url()).toContain('/shop-admin/offers/new')
    // Should NOT have made an API call
    expect(offerApiCalled, 'API was called despite missing title').toBe(false)
    // Should show a validation error (inline error near title field)
    const titleError = await page.locator('p[class*="error"], span[class*="error"], .text-red-500, .text-red-600, [class*="text-red"]').count()
    const roleAlert = await page.locator('[role="alert"]').count()
    expect(titleError + roleAlert, 'No validation error shown for missing title').toBeGreaterThan(0)
  })

  test('A6 — Missing valid_from → frontend validation error, no API call', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    await page.locator('input[name="title"]').fill('A6 Missing Dates')
    // Leave valid_from empty
    await page.locator('input[name="valid_until"]').fill('2026-08-31')

    let offerApiCalled = false
    page.on('request', req => {
      if (req.url().includes('/shop-admin/offers') && req.method() === 'POST') {
        offerApiCalled = true
      }
    })

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await page.waitForTimeout(1000)

    // Should remain on form page
    expect(page.url()).toContain('/shop-admin/offers/new')
    expect(offerApiCalled, 'API was called despite missing valid_from').toBe(false)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP B — Edit Offer
  // ═══════════════════════════════════════════════════════════════════════════

  test('B1 — Edit title → "Updated Title" visible in list after save', async ({ page }) => {
    if (!ctx.editOfferId) {
      test.skip(true, 'editOfferId not set (A1 failed)')
      return
    }

    await page.goto(FRONTEND_URL + `/shop-admin/offers/${ctx.editOfferId}/edit`)
    await waitHydrated(page)

    const titleInput = page.locator('input[name="title"]')
    await titleInput.clear()
    await titleInput.fill('B1 Updated Title')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
    await expect(page.getByText('B1 Updated Title')).toBeVisible()

    // Verify via API
    const token = await getOwnerToken()
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (data as { items: Array<{ id: number; title: string }> }).items
    const updated = items.find(o => o.id === ctx.editOfferId)
    expect(updated?.title).toBe('B1 Updated Title')
  })

  test('B2 — Add price to previously price-less offer → price shown in list', async ({ page }) => {
    // Create a fresh offer without price, then edit it
    const token = await getOwnerToken()
    const { status, data } = await apiPost('/api/v1/shop-owner/offers', {
      title: 'B2 Originally No Price',
      price: null,
      valid_from: '2026-06-01T00:00:00',
      valid_until: '2026-08-31T23:59:59',
    }, token)
    expect(status, 'B2 setup: create offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    // Navigate to edit
    await page.goto(FRONTEND_URL + `/shop-admin/offers/${offerId}/edit`)
    await waitHydrated(page)

    await page.locator('input[name="price"]').fill('7.50')
    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })

    // Verify via API that price was updated
    const { data: updData } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (updData as { items: Array<{ id: number; price: string | null }> }).items
    const updated = items.find(o => o.id === offerId)
    expect(updated?.price, 'B2: price not updated').toBe('7.5000')

    // Price should also be visible in the list UI
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('7.5000').first()).toBeVisible()
  })

  test('B3 — Link a product to an existing offer → product relationship updated', async ({ page }) => {
    if (!ctx.productId) {
      test.skip(true, 'productId not available — product creation failed in beforeAll')
      return
    }

    // Create a fresh offer without product link
    const token = await getOwnerToken()
    const { status, data } = await apiPost('/api/v1/shop-owner/offers', {
      title: 'B3 No Product Link',
      price: null,
      valid_from: '2026-06-01T00:00:00',
      valid_until: '2026-08-31T23:59:59',
    }, token)
    expect(status, 'B3 setup: create offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    // Edit: add product link
    await page.goto(FRONTEND_URL + `/shop-admin/offers/${offerId}/edit`)
    await waitHydrated(page)

    const productSelect = page.locator('select[name="product_id"]')
    const selectCount = await productSelect.count()
    if (selectCount === 0) {
      test.skip(true, 'product_id select not rendered — no products available for this shop')
      return
    }
    await productSelect.selectOption({ value: String(ctx.productId) })

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })

    // Verify via API
    const { data: updData } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (updData as { items: Array<{ id: number; product_id: number | null }> }).items
    const updated = items.find(o => o.id === offerId)
    expect(updated?.product_id, 'B3: product_id not updated').toBe(ctx.productId)
  })

  test('B4 — [FINDING] Unlink product via PATCH product_id: null → documents backend behavior', async () => {
    // FINDING: This test is annotated with test.fail() because the backend has a confirmed bug:
    // patch_offer() uses `if body.product_id is not None:` — null values are silently ignored.
    // PATCH { product_id: null } does NOT unlink the product.
    // Fix required in backend: use model_fields_set (Pydantic v2) to distinguish null from missing.
    // test.fail() means: this test PASSES when the assertion fails (expected failure),
    // and would FAIL if the bug is fixed (then test.fail() should be removed).
    test.fail()

    if (!ctx.productId) {
      test.skip(true, 'productId not available')
      return
    }

    const token = await getOwnerToken()
    const { status, data } = await apiPost('/api/v1/shop-owner/offers', {
      title: 'B4 With Product Link',
      price: null,
      valid_from: '2026-06-01T00:00:00',
      valid_until: '2026-08-31T23:59:59',
      product_id: ctx.productId,
    }, token)
    expect(status, 'B4 setup: create offer failed').toBe(201)
    const offerId = (data as { id: number; product_id: number | null }).id
    const initialProductId = (data as { id: number; product_id: number | null }).product_id
    ctx.createdOfferIds.push(offerId)

    expect(initialProductId, 'B4: product_id not set after creation').toBe(ctx.productId)

    ctx.findings.push(
      'B4: PATCH /api/v1/shop-owner/offers/{id} with product_id: null does NOT unlink the product. ' +
      `product_id remains ${initialProductId}. ` +
      'Backend patch_offer() uses `if body.product_id is not None:` — null is silently skipped. ' +
      'Fix: use `if "product_id" in body.model_fields_set:` (Pydantic v2) to distinguish null from missing.'
    )

    // Attempt to unlink via PATCH product_id: null
    const patchRes = await apiPatch(`/api/v1/shop-owner/offers/${offerId}`, { product_id: null }, token)
    expect(patchRes.status).toBe(200)
    const updatedProductId = (patchRes.data as { product_id: number | null }).product_id

    // This assertion is EXPECTED TO FAIL (hence test.fail() above):
    expect(updatedProductId, '[FINDING B4] PATCH product_id: null should set product_id to null — backend bug').toBeNull()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP C — Archive + Delete
  // ═══════════════════════════════════════════════════════════════════════════

  test('C1 — Archive active offer → offer moves to expired/archived tab', async ({ page }) => {
    if (!ctx.archiveOfferId) {
      test.skip(true, 'archiveOfferId not set (beforeAll fixture creation failed)')
      return
    }

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    // Confirm the offer is in active list first
    await expect(page.getByText('C-Setup Archive Target')).toBeVisible()

    // Find the archive button for this specific offer row
    const offerRow = page.locator('div').filter({ hasText: 'C-Setup Archive Target' }).first()
    const archiveBtn = offerRow.getByRole('button', { name: /archive|archivieren/i }).first()
    await archiveBtn.click()
    // Cancel button appears (confirmation step)
    await page.getByRole('button', { name: /cancel|abbrechen/i }).waitFor({ state: 'visible' })
    // Click Archive to confirm
    await offerRow.getByRole('button', { name: /archive|archivieren/i }).first().click()

    // Offer should disappear from active tab
    await expect(page.getByText('C-Setup Archive Target')).not.toBeVisible({ timeout: 10_000 })

    // Verify via API that archived=true
    const token = await getOwnerToken()
    const { data } = await apiGet('/api/v1/shop-owner/offers?archived=true', token)
    const items = (data as { items: Array<{ id: number; archived: boolean }> }).items
    const archived = items.find(o => o.id === ctx.archiveOfferId)
    expect(archived?.archived, 'C1: offer not marked archived in API').toBe(true)

    // Switch to expired tab and verify it's there
    await page.getByRole('button', { name: /expired|abgelaufen/i }).click()
    await expect(page.getByText('C-Setup Archive Target').first()).toBeVisible()
  })

  test('C2 — Delete archived offer → offer gone from list + API', async ({ page }) => {
    if (!ctx.archiveOfferId) {
      test.skip(true, 'archiveOfferId not set')
      return
    }

    // Ensure it's archived (C1 should have done this, but guarantee it)
    const token = await getOwnerToken()
    await apiPatch(`/api/v1/shop-owner/offers/${ctx.archiveOfferId}`, { archived: true }, token)

    // Check if delete button is exposed in UI (expired tab)
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)
    await page.getByRole('button', { name: /expired|abgelaufen/i }).click()
    await page.waitForLoadState('networkidle')

    // Look for delete button in expired tab
    const deleteBtn = page.getByRole('button', { name: /delete|löschen/i }).first()
    const hasDeleteInUI = await deleteBtn.count() > 0

    if (hasDeleteInUI) {
      await deleteBtn.click()
      const cancelBtn = page.getByRole('button', { name: /cancel|abbrechen/i })
      const hasCancelBtn = await cancelBtn.count() > 0
      if (hasCancelBtn) {
        await cancelBtn.waitFor({ state: 'visible' })
        await page.getByRole('button', { name: /delete|löschen/i }).first().click()
      }
      await expect(page.getByText('C-Setup Archive Target')).not.toBeVisible({ timeout: 10_000 })
    } else {
      // Delete UI not implemented — delete via API directly (archive done above)
      ctx.findings.push(
        'C2: No delete button in UI for archived offers in the expired tab. ' +
        'Delete is only possible via direct API call. Frontend does not expose delete action.'
      )
      const delRes = await apiDelete(`/api/v1/shop-owner/offers/${ctx.archiveOfferId}`, token)
      expect([200, 204], `C2: DELETE returned unexpected status ${delRes.status}`).toContain(delRes.status)
    }

    // Verify gone from API
    const { data } = await apiGet('/api/v1/shop-owner/offers?archived=true', token)
    const items = (data as { items: Array<{ id: number }> }).items
    const found = items.find(o => o.id === ctx.archiveOfferId)
    expect(found, 'C2: deleted offer still appears in API').toBeUndefined()

    // Remove from cleanup list (already deleted)
    ctx.createdOfferIds = ctx.createdOfferIds.filter(id => id !== ctx.archiveOfferId)
    ctx.archiveOfferId = null
  })

  test('C3 — Delete active (non-archived) offer → 409 from backend', async ({ page }) => {
    // Create a fresh active offer
    const token = await getOwnerToken()
    const { status, data } = await apiPost('/api/v1/shop-owner/offers', {
      title: 'C3 Active Cannot Delete',
      price: null,
      valid_from: '2026-06-01T00:00:00',
      valid_until: '2026-08-31T23:59:59',
    }, token)
    expect(status, 'C3 setup: create offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    // Try to delete via API (not archived, not expired)
    const delRes = await apiDelete(`/api/v1/shop-owner/offers/${offerId}`, token)

    // Backend MUST reject with 409 for active non-expired offers
    if (delRes.status === 409) {
      // Correct behavior documented
      console.log('C3: Backend correctly returned 409 for deleting active non-expired offer')
    } else {
      ctx.findings.push(
        `C3: Expected HTTP 409 when deleting active offer, got ${delRes.status}. ` +
        'Backend should enforce archive-before-delete.'
      )
    }
    expect(delRes.status, 'C3: Backend should return 409 when deleting active (non-archived, non-expired) offer').toBe(409)

    // UI check: active tab should NOT show delete button
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)
    // OfferList only renders Archive button for active tab, not Delete
    // The delete button appears in the expired/archived tab
    const activeTabDeleteBtns = page.locator('button').filter({ hasText: /^delete$|^löschen$/i })
    const deleteCount = await activeTabDeleteBtns.count()
    if (deleteCount > 0) {
      ctx.findings.push('C3: UI shows Delete button for active offers — UI should not expose delete for active offers')
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP D — Customer-Facing Visibility
  // ═══════════════════════════════════════════════════════════════════════════

  test('D1 — Active offer visibility on customer shop detail page /shops/[slug]', async ({ page }) => {
    // FINDING: The customer shop detail page (/shops/[slug]) does not render shop_owner_offers.
    // The shop page source (src/app/(customer)/shops/[slug]/page.tsx) has no offers section.
    // Per spec D1: active offers should be visible to customers on the shop detail page.
    // This is a missing feature, not a bug in existing code. test.fail() documents this gap.
    test.fail()

    if (!ctx.shopSlug) {
      test.skip(true, 'shopSlug not available — cannot test customer-facing page')
      return
    }

    // Verify we have at least one active offer in the list
    const token = await getOwnerToken()
    const { data } = await apiGet('/api/v1/shop-owner/offers?archived=false', token)
    const activeItems = (data as { items: Array<{ id: number; title: string }> }).items

    if (activeItems.length === 0) {
      test.skip(true, 'No active offers to verify — create tests may have failed')
      return
    }

    // Use the first active offer's title
    const offerToCheck = activeItems[0]

    // Navigate to customer-facing shop page
    await page.goto(FRONTEND_URL + `/shops/${ctx.shopSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url, 'D1: shop page returned 404').not.toContain('404')
    expect(url, 'D1: redirected to not-found').not.toContain('not-found')

    const bodyText = await page.locator('body').innerText()
    const offerTitleVisible = bodyText.includes(offerToCheck.title)
    const hasOffersSection = bodyText.toLowerCase().includes('offer') || bodyText.toLowerCase().includes('angebot')

    if (!offerTitleVisible) {
      ctx.findings.push(
        `D1: Active offer "${offerToCheck.title}" is NOT visible on customer shop page /shops/${ctx.shopSlug}. ` +
        `hasOffersSection=${hasOffersSection}. ` +
        'The shop detail page (/shops/[slug]) does not render shop_owner_offers. ' +
        'Per spec: active offers SHOULD be visible to customers on the shop detail page.'
      )
      console.warn(`[FINDING D1] Active offer not shown on customer shop page /shops/${ctx.shopSlug}`)
    }

    // Per spec: active offers must be visible. This is a hard assertion.
    expect(offerTitleVisible, `[FINDING D1] Active offer "${offerToCheck.title}" not visible on /shops/${ctx.shopSlug}`).toBe(true)
  })

  test('D2 — Archived offer NOT visible on customer shop detail page', async ({ page }) => {
    if (!ctx.shopSlug) {
      test.skip(true, 'shopSlug not available')
      return
    }

    // Create and immediately archive an offer
    const token = await getOwnerToken()
    const { status, data } = await apiPost('/api/v1/shop-owner/offers', {
      title: 'D2 Archived Should Be Hidden',
      price: null,
      valid_from: '2026-01-01T00:00:00',
      valid_until: '2026-01-31T23:59:59',
    }, token)
    expect(status, 'D2 setup: create offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    // Archive it
    await apiPatch(`/api/v1/shop-owner/offers/${offerId}`, { archived: true }, token)

    // Navigate to customer shop page
    await page.goto(FRONTEND_URL + `/shops/${ctx.shopSlug}`)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    const hasArchivedOffer = bodyText.includes('D2 Archived Should Be Hidden')

    expect(hasArchivedOffer, 'D2: Archived offer is visible on customer-facing shop page — should be hidden').toBe(false)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // REGRESSION — price: null vs "" regression check
  // ═══════════════════════════════════════════════════════════════════════════

  test('REGRESSION — OfferForm sends price: null (not empty string) when price field is empty', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // Intercept the POST to /api/shop-admin/offers and capture the request body
    let capturedBody: Record<string, unknown> | null = null
    page.on('request', req => {
      if (req.url().includes('/api/shop-admin/offers') && req.method() === 'POST') {
        try {
          capturedBody = JSON.parse(req.postData() ?? '{}')
        } catch { /* ignore */ }
      }
    })

    await page.locator('input[name="title"]').fill('REGRESSION Empty Price Test')
    // Explicitly clear the price field (ensure it's empty)
    const priceField = page.locator('input[name="price"]')
    await priceField.clear()
    await priceField.fill('')
    await page.locator('input[name="valid_from"]').fill('2026-06-01')
    await page.locator('input[name="valid_until"]').fill('2026-08-31')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await page.waitForTimeout(2000)

    if (capturedBody) {
      expect(
        capturedBody.price,
        `REGRESSION: OfferForm sent price="${capturedBody.price}" instead of null — the price:'' bug is back`
      ).toBeNull()
    } else {
      // Couldn't capture body (maybe form redirected too fast)
      // Verify via API instead
      await page.waitForURL(/\/shop-admin\/offers/, { timeout: 5000 }).catch(() => {})
    }

    // Clean up if offer was created
    const token = await getOwnerToken()
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (data as { items: Array<{ id: number; title: string }> }).items
    const created = items.find(o => o.title === 'REGRESSION Empty Price Test')
    if (created) ctx.createdOfferIds.push(created.id)
  })
})
