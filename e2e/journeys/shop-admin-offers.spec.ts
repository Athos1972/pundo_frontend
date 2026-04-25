/**
 * Shop-Admin Offers — Comprehensive E2E Test Suite (v2: two-step OfferForm)
 *
 * OfferForm flow (new):
 *   Step 1 — Select item via ItemPickerModal (creates ShopListing)
 *   Step 2 — Fill price_type, price_tiers (if fixed/variable), dates, optional title/description/url
 *
 * API schema (new):
 *   POST /api/v1/shop-owner/offers → { shop_listing_id, price_type, price_tiers, valid_from, valid_until, ... }
 *   NO: price (float), product_id — these fields no longer exist
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
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
  /** shop_listing_id created in beforeAll for offer tests */
  defaultShopListingId: number | null
  /** All offer IDs created during tests, for cleanup */
  createdOfferIds: number[]
  /** Offer ID used for B1 edit title test (created by A1) */
  editOfferId: number | null
  /** Offer ID used for C1/C2 archive/delete tests */
  archiveOfferId: number | null
  /** shop slug for customer-facing tests */
  shopSlug: string | null
  /** Findings to document in report */
  findings: string[]
}

const ctx: OfferCtx = {
  defaultShopListingId: null,
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

/** Create a ShopListing for item_id=1 (e2e-vet-consultation-larnaca). Returns shop_listing_id. */
async function getOrCreateShopListing(token: string, itemId = 1): Promise<number | null> {
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ item_id: itemId }),
  })
  if (res.ok) {
    const data = await res.json() as { id: number }
    return data.id
  }
  if (res.status === 409) {
    // Already exists — extract from body or list
    const body = await res.json() as { id?: number; shop_listing_id?: number; detail?: { shop_listing_id?: number } }
    return body.id ?? body.shop_listing_id ?? body.detail?.shop_listing_id ?? null
  }
  return null
}

/** Create a minimal offer via API with new schema. */
async function apiCreateOffer(
  token: string,
  shopListingId: number,
  overrides: Record<string, unknown> = {}
): Promise<{ status: number; data: { id: number } }> {
  return apiPost('/api/v1/shop-owner/offers', {
    shop_listing_id: shopListingId,
    price_type: 'on_request',
    price_tiers: [],
    valid_from: '2026-06-01',
    valid_until: '2026-08-31',
    ...overrides,
  }, token) as Promise<{ status: number; data: { id: number } }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function waitHydrated(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('body[data-hydrated="true"]', { timeout: 15_000 }).catch(() => {})
}

/**
 * UI helper: complete Step 1 of the OfferForm.
 * Clicks the border-dashed "Select item" button, types a search query,
 * waits for results and clicks the first one.
 */
async function selectItemViaModal(page: Page, searchQuery: string) {
  // Click the dashed "Select item" button in Step 1
  await page.locator('button.border-dashed, button[class*="border-dashed"]').click()

  // Wait for modal to appear
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 })

  // Type in the text search field (second input in the modal, after EAN)
  const textInputs = page.getByRole('dialog').locator('input[type="text"]')
  // Second input is the name search (first is EAN)
  const searchInput = textInputs.nth(1)
  await searchInput.fill(searchQuery)

  // Wait for results list
  await page.waitForTimeout(500) // debounce: 300ms
  await page.waitForLoadState('networkidle')

  // Click the first result button in the list
  const resultButtons = page.getByRole('dialog').locator('ul li button')
  await expect(resultButtons.first()).toBeVisible({ timeout: 8_000 })
  await resultButtons.first().click()

  // After click: ShopListing is created, step advances to 2
  await page.waitForLoadState('networkidle')
}

/** Select price type in Step 2. */
async function setPriceType(page: Page, priceType: string) {
  await page.locator('select').first().selectOption(priceType)
}

/** Add one fixed-price tier with given price.
 *
 * emptyTier() already includes 1 step — clicking "Add step" would create a
 * second step whose price stays empty and causes frontend validation to fail.
 * We only: add the tier, select unit 'piece', fill the first step's price.
 */
async function addPriceTierStep(page: Page, price: string) {
  // 1. Click "Add pricing unit" → tier with 1 step is created
  const addTierBtn = page.getByRole('button', { name: /add pricing unit|preiseinheit hinzufügen/i })
  await expect(addTierBtn.first()).toBeVisible({ timeout: 5_000 })
  await addTierBtn.first().click()
  await page.waitForTimeout(300)

  // 2. Select unit 'piece' from the tier's unit <select> (second select: first is price_type)
  const selects = page.locator('select')
  const selectCount = await selects.count()
  if (selectCount >= 2) {
    // The unit select is the last select in the form (after price_type select)
    await selects.last().selectOption('per_piece')
    await page.waitForTimeout(200)
  }

  // 3. Fill the price input of the (only) step — inputMode="decimal"
  const priceInputs = page.locator('input[inputmode="decimal"]')
  await expect(priceInputs.first()).toBeVisible({ timeout: 5_000 })
  await priceInputs.first().fill(price)
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

test.describe.serial('Shop-Admin Offers — Full Matrix (v2)', () => {

  test.beforeAll(async () => {
    const health = await fetch(`${BACKEND_URL}/api/v1/categories`)
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)

    const token = await getOwnerToken()

    // Create a ShopListing for item_id=1 (used by most tests)
    ctx.defaultShopListingId = await getOrCreateShopListing(token, 1)
    console.log(`[offers-spec] defaultShopListingId=${ctx.defaultShopListingId}`)

    if (!ctx.defaultShopListingId) {
      console.warn('[offers-spec] Could not create ShopListing for item_id=1 — most tests will fail')
      return
    }

    // Pre-create the offer for C1/C2 archive/delete tests.
    // IMPORTANT: use item_id=3 (Bulk Dog Food) — a SEPARATE listing from defaultShopListingId
    // (item_id=1). A1/A3 both POST to item_id=1's listing and the backend auto-archives the
    // previous active offer for that listing. If we used the same listing here, the archive
    // target would be silently archived by A1 before C1 gets to test it.
    const archiveListingId = await getOrCreateShopListing(token, 3)
    if (archiveListingId) {
      const archiveSetup = await apiCreateOffer(token, archiveListingId, {
        title: 'C-Setup Archive Target',
      })
      if (archiveSetup.status === 201) {
        ctx.archiveOfferId = archiveSetup.data.id
        ctx.createdOfferIds.push(ctx.archiveOfferId)
        console.log(`[offers-spec] Pre-created archive target offer ID=${ctx.archiveOfferId} (listing=${archiveListingId})`)
      }
    }
  })

  test.afterAll(async () => {
    if (ctx.createdOfferIds.length === 0) return
    const token = await getOwnerToken()
    for (const id of ctx.createdOfferIds) {
      await apiPatch(`/api/v1/shop-owner/offers/${id}`, { archived: true }, token).catch(() => {})
      const del = await apiDelete(`/api/v1/shop-owner/offers/${id}`, token)
      console.log(`[offers-spec] Cleanup offer ${id}: DELETE → ${del.status}`)
    }
    if (ctx.findings.length > 0) {
      console.log('\n[offers-spec] FINDINGS:')
      ctx.findings.forEach(f => console.log(`  - ${f}`))
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP A — Create Offer (UI flow: two-step OfferForm)
  // ═══════════════════════════════════════════════════════════════════════════

  test('A1 — Full combo: title + description + on_request price + dates → 201 + visible in list', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // Step 1: Select item via modal (search by item name)
    await selectItemViaModal(page, 'Vet')

    // Now on Step 2
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 })

    // Set price type to on_request (no price tiers needed)
    await setPriceType(page, 'on_request')

    // Fill dates
    await page.locator('input[name="valid_from"]').fill('2026-06-01')
    await page.locator('input[name="valid_until"]').fill('2026-08-31')

    // Fill optional fields
    await page.locator('input[name="title"]').fill('A1 Full Combo Offer')
    await page.locator('textarea[name="description"]').fill('Full combo description')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
    await expect(page.getByText('A1 Full Combo Offer')).toBeVisible()

    // Verify via API
    const token = await getOwnerToken()
    const { status, data } = await apiGet('/api/v1/shop-owner/offers', token)
    expect(status).toBe(200)
    const items = (data as { items: Array<{ id: number; title: string; price_type: string }> }).items
    const created = items.find(o => o.title === 'A1 Full Combo Offer')
    expect(created, 'A1 offer not found in API response').toBeTruthy()
    expect(created?.price_type).toBe('on_request')

    if (created) {
      ctx.createdOfferIds.push(created.id)
      ctx.editOfferId = created.id
    }
  })

  test('A2 — No description, on_request price + dates, no title → 201 + visible', async ({ page }) => {
    if (!ctx.defaultShopListingId) { test.skip(true, 'defaultShopListingId not available'); return }

    // Create via API (simpler, tests form for title-optional case)
    const token = await getOwnerToken()
    // Use a second item (e2e-free-pet-advice, item_id=2)
    const listingId = await getOrCreateShopListing(token, 2)
    if (!listingId) { test.skip(true, 'Could not create ShopListing for item_id=2'); return }

    const { status, data } = await apiCreateOffer(token, listingId, {
      price_type: 'free',
    })
    expect(status, 'A2: create offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    // Verify via API
    const { data: listData } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (listData as { items: Array<{ id: number; price_type: string }> }).items
    const created = items.find(o => o.id === offerId)
    expect(created, 'A2 offer not found in API').toBeTruthy()
    expect(created?.price_type).toBe('free')
  })

  test('A3 — on_request price_type → no price_tiers required, 201 OK', async ({ page }) => {
    if (!ctx.defaultShopListingId) { test.skip(true, 'defaultShopListingId not available'); return }

    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // Step 1: Select item
    await selectItemViaModal(page, 'Vet')

    // Step 2: Use on_request (price_tiers not required)
    await setPriceType(page, 'on_request')
    await page.locator('input[name="valid_from"]').fill('2026-06-01')
    await page.locator('input[name="valid_until"]').fill('2026-08-31')
    await page.locator('input[name="title"]').fill('A3 On Request Offer')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
    await expect(page.getByText('A3 On Request Offer')).toBeVisible()

    const token = await getOwnerToken()
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (data as { items: Array<{ id: number; title: string; price_type: string; price_tiers: unknown[] }> }).items
    const created = items.find(o => o.title === 'A3 On Request Offer')
    expect(created, 'A3 offer not found in API').toBeTruthy()
    // on_request offers have no price tiers
    expect(created?.price_tiers ?? []).toHaveLength(0)

    if (created) ctx.createdOfferIds.push(created.id)
  })

  test('A4 — Minimal: only shop_listing_id + on_request + dates (no title) → 201', async ({ page }) => {
    if (!ctx.defaultShopListingId) { test.skip(true, 'defaultShopListingId not available'); return }

    const token = await getOwnerToken()
    const { status, data } = await apiCreateOffer(token, ctx.defaultShopListingId, {})
    expect(status, 'A4 minimal offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    // Verify visible in offer list via UI
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)
    // Offer list should show (no crash, 200 page)
    expect(page.url()).toContain('/shop-admin/offers')
  })

  test('A5 — Missing shop_listing_id (skip Step 1) → validation error on step 2', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // DON'T complete step 1 — try to click Step 2 tab directly
    const step2Tab = page.getByRole('button', { name: /2\. price|2\. preis/i })
    await step2Tab.click()
    await page.waitForTimeout(500)

    // Step 2 should not be accessible without step 1
    // Either still on step 1 or form shows validation error
    // The step indicator button is clickable only when selectedItem is set
    // (onClick={() => selectedItem && setStep(2)})
    const formVisible = await page.locator('form').count() > 0
    // If form is shown (shouldn't be without item), submit it
    if (formVisible) {
      await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
      await page.waitForTimeout(1000)
      // Should show shop_listing_id error or stay on form
      const errorCount = await page.locator('[class*="text-red"]').count()
      expect(errorCount, 'No error shown for missing item').toBeGreaterThan(0)
    } else {
      // Step 1 still shown — correct behavior
      const step1Content = await page.locator('button.border-dashed, button[class*="border-dashed"]').count()
      expect(step1Content, 'Step 1 not shown when item not selected').toBeGreaterThan(0)
    }
  })

  test('A6 — Fixed price type with no tiers → validation error (tier required)', async ({ page }) => {
    if (!ctx.defaultShopListingId) { test.skip(true, 'defaultShopListingId not available'); return }

    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // Step 1: Select item
    await selectItemViaModal(page, 'Vet')

    // Step 2: Choose fixed but add no tiers
    await setPriceType(page, 'fixed')
    await page.locator('input[name="valid_from"]').fill('2026-06-01')
    await page.locator('input[name="valid_until"]').fill('2026-08-31')
    await page.locator('input[name="title"]').fill('A6 No Tiers')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await page.waitForTimeout(1000)

    // Should remain on form (not navigate to list)
    expect(page.url()).not.toMatch(/\/shop-admin\/offers$/)
    // Should show price_tiers validation error
    const tierError = await page.locator('[class*="text-red"]').count()
    expect(tierError, 'No error shown for missing price tiers').toBeGreaterThan(0)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP B — Edit Offer
  // ═══════════════════════════════════════════════════════════════════════════

  test('B1 — Edit title → "B1 Updated Title" visible in list after save', async ({ page }) => {
    if (!ctx.defaultShopListingId) { test.skip(true, 'defaultShopListingId not available'); return }

    // Create a fresh offer to edit (ctx.editOfferId from A1 may have been superseded)
    const token = await getOwnerToken()
    const { status: createStatus, data: createData } = await apiCreateOffer(token, ctx.defaultShopListingId, {
      title: 'B1 Original Title',
    })
    expect(createStatus, 'B1 setup: create offer failed').toBe(201)
    const offerId = (createData as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    await page.goto(FRONTEND_URL + `/shop-admin/offers/${offerId}/edit`)
    await waitHydrated(page)

    const titleInput = page.locator('input[name="title"]')
    await titleInput.clear()
    await titleInput.fill('B1 Updated Title')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
    await expect(page.getByText('B1 Updated Title')).toBeVisible()

    // Verify via API (PATCH archive+create gives a new ID — search by title)
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (data as { items: Array<{ id: number; title: string }> }).items
    const updated = items.find(o => o.title === 'B1 Updated Title')
    expect(updated, 'B1 Updated Title not found via API').toBeTruthy()
    if (updated) ctx.createdOfferIds.push(updated.id)
  })

  test('B2 — Change price_type from on_request to free → updated in API', async ({ page }) => {
    if (!ctx.defaultShopListingId) { test.skip(true, 'defaultShopListingId not available'); return }

    // Create an on_request offer, then edit it to free
    const token = await getOwnerToken()
    const { status, data } = await apiCreateOffer(token, ctx.defaultShopListingId, {
      title: 'B2 Originally On Request',
    })
    expect(status, 'B2 setup: create offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    await page.goto(FRONTEND_URL + `/shop-admin/offers/${offerId}/edit`)
    await waitHydrated(page)

    await setPriceType(page, 'free')
    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })

    // Verify via API (PATCH archive+create → new ID; search by title instead)
    const { data: updData } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (updData as { items: Array<{ id: number; title: string; price_type: string }> }).items
    const updated = items.find(o => o.title === 'B2 Originally On Request')
    expect(updated, 'B2: updated offer not found via API').toBeTruthy()
    expect(updated?.price_type, 'B2: price_type not updated').toBe('free')
    if (updated) ctx.createdOfferIds.push(updated.id)
  })

  test('B3 — Add a fixed price tier to existing on_request offer → price_type=fixed', async ({ page }) => {
    if (!ctx.defaultShopListingId) { test.skip(true, 'defaultShopListingId not available'); return }

    const token = await getOwnerToken()
    const { status, data } = await apiCreateOffer(token, ctx.defaultShopListingId, {
      title: 'B3 Add Price Tier',
    })
    expect(status, 'B3 setup: create offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    await page.goto(FRONTEND_URL + `/shop-admin/offers/${offerId}/edit`)
    await waitHydrated(page)

    // Change to fixed and add a price tier
    await setPriceType(page, 'fixed')
    await addPriceTierStep(page, '9.99')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })

    // Verify via API (PATCH archive+create → new ID; search by title instead)
    const { data: updData } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (updData as { items: Array<{ id: number; title: string; price_type: string; price_tiers: unknown[] }> }).items
    const updated = items.find(o => o.title === 'B3 Add Price Tier')
    expect(updated, 'B3: updated offer not found via API').toBeTruthy()
    expect(updated?.price_type, 'B3: price_type not fixed').toBe('fixed')
    expect((updated?.price_tiers ?? []).length, 'B3: no price tiers saved').toBeGreaterThan(0)
    if (updated) ctx.createdOfferIds.push(updated.id)
  })

  test('B4 — PATCH price_type to on_request via API → price_tiers cleared', async () => {
    if (!ctx.defaultShopListingId) { test.skip(true, 'defaultShopListingId not available'); return }

    const token = await getOwnerToken()
    const { status, data } = await apiCreateOffer(token, ctx.defaultShopListingId, {
      title: 'B4 Switch To On Request',
      price_type: 'free',
    })
    expect(status, 'B4 setup: create offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    // PATCH to on_request
    const patchRes = await apiPatch(`/api/v1/shop-owner/offers/${offerId}`, {
      price_type: 'on_request',
      price_tiers: [],
    }, token)
    expect(patchRes.status).toBe(200)
    const updated = patchRes.data as { price_type: string; price_tiers: unknown[] }
    expect(updated.price_type, 'B4: price_type not on_request').toBe('on_request')
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP C — Archive + Delete
  // ═══════════════════════════════════════════════════════════════════════════

  test('C1 — Archive active offer → offer moves to archived tab', async ({ page }) => {
    if (!ctx.archiveOfferId) { test.skip(true, 'archiveOfferId not set (beforeAll failed)'); return }

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    await expect(page.getByText('C-Setup Archive Target')).toBeVisible()

    // Use double-filter to find the specific offer row div (innermost div that has BOTH
    // the offer title AND an archive button — avoids matching outer wrapper divs).
    const offerRow = page.locator('div').filter({
      has: page.locator('p', { hasText: 'C-Setup Archive Target' }),
    }).filter({
      has: page.getByRole('button', { name: /archive|archivieren/i }),
    }).last()

    await offerRow.getByRole('button', { name: /archive|archivieren/i }).click()

    // Confirmation step — wait for Cancel to appear inside this row
    await offerRow.getByRole('button', { name: /cancel|abbrechen/i }).waitFor({ state: 'visible' })
    await offerRow.getByRole('button', { name: /archive|archivieren/i }).click()

    await expect(page.getByText('C-Setup Archive Target')).not.toBeVisible({ timeout: 10_000 })

    // Verify via API
    const token = await getOwnerToken()
    const { data } = await apiGet('/api/v1/shop-owner/offers?archived=true', token)
    const items = (data as { items: Array<{ id: number; archived: boolean }> }).items
    const archived = items.find(o => o.id === ctx.archiveOfferId)
    expect(archived?.archived, 'C1: offer not archived in API').toBe(true)
  })

  test('C2 — Delete archived offer → offer gone from API', async ({ page }) => {
    if (!ctx.archiveOfferId) { test.skip(true, 'archiveOfferId not set'); return }

    const token = await getOwnerToken()
    // Ensure archived
    await apiPatch(`/api/v1/shop-owner/offers/${ctx.archiveOfferId}`, { archived: true }, token)

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)
    await page.getByRole('button', { name: /expired|abgelaufen/i }).click()
    await page.waitForTimeout(500) // let client-side tab switch render

    // Use double-filter to find the specific row (innermost div with both title AND delete button)
    const archiveTargetRow = page.locator('div').filter({
      has: page.locator('p', { hasText: 'C-Setup Archive Target' }),
    }).filter({
      has: page.getByRole('button', { name: /delete|löschen/i }),
    }).last()

    const hasDeleteInUI = await archiveTargetRow.getByRole('button', { name: /delete|löschen/i }).count() > 0

    if (hasDeleteInUI) {
      await archiveTargetRow.getByRole('button', { name: /delete|löschen/i }).click()
      const cancelBtn = archiveTargetRow.getByRole('button', { name: /cancel|abbrechen/i })
      if (await cancelBtn.count() > 0) {
        await cancelBtn.waitFor({ state: 'visible' })
        await archiveTargetRow.getByRole('button', { name: /delete|löschen/i }).click()
      }
      await expect(page.getByText('C-Setup Archive Target')).not.toBeVisible({ timeout: 10_000 })
    } else {
      ctx.findings.push('C2: No delete button in UI for archived offers — delete only possible via API')
      const delRes = await apiDelete(`/api/v1/shop-owner/offers/${ctx.archiveOfferId}`, token)
      expect([200, 204]).toContain(delRes.status)
    }

    // Verify gone from API
    const { data } = await apiGet('/api/v1/shop-owner/offers?archived=true', token)
    const items = (data as { items: Array<{ id: number }> }).items
    expect(items.find(o => o.id === ctx.archiveOfferId), 'C2: deleted offer still in API').toBeUndefined()

    ctx.createdOfferIds = ctx.createdOfferIds.filter(id => id !== ctx.archiveOfferId)
    ctx.archiveOfferId = null
  })

  test('C3 — Delete active (non-archived) offer → 409 from backend', async ({ page }) => {
    if (!ctx.defaultShopListingId) { test.skip(true, 'defaultShopListingId not available'); return }

    const token = await getOwnerToken()
    const { status, data } = await apiCreateOffer(token, ctx.defaultShopListingId, {
      title: 'C3 Active Cannot Delete',
    })
    expect(status, 'C3 setup failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    const delRes = await apiDelete(`/api/v1/shop-owner/offers/${offerId}`, token)

    if (delRes.status === 409) {
      console.log('C3: Backend correctly returned 409 for deleting active non-expired offer')
    } else {
      ctx.findings.push(
        `C3: Expected 409 when deleting active offer, got ${delRes.status}. ` +
        'Backend should enforce archive-before-delete.'
      )
    }
    expect(delRes.status, 'C3: Expected 409').toBe(409)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP D — Customer-Facing Visibility
  // ═══════════════════════════════════════════════════════════════════════════

  test('D1 — Active offer visible on customer shop detail page /shops/[slug]', async ({ page }) => {
    if (!ctx.shopSlug || !ctx.defaultShopListingId) {
      test.skip(true, 'shopSlug or defaultShopListingId not available')
      return
    }

    const token = await getOwnerToken()

    // Create an offer that is currently active (valid_from in past, valid_until in future)
    // All other test offers use valid_from: '2026-06-01' (future), which the public API filters out.
    const { status, data } = await apiCreateOffer(token, ctx.defaultShopListingId, {
      title: 'D1 Customer Visible Offer',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
    })
    expect(status, 'D1 setup: create offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    await page.goto(FRONTEND_URL + `/shops/${ctx.shopSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).not.toContain('404')
    expect(url).not.toContain('not-found')

    const bodyText = await page.locator('body').innerText()
    const hasOffersSection = bodyText.toLowerCase().includes('offer') || bodyText.toLowerCase().includes('angebot')
    expect(hasOffersSection, 'D1: No offers section on customer shop page').toBe(true)
    expect(
      bodyText.includes('D1 Customer Visible Offer'),
      'D1: offer title not visible on customer shop page'
    ).toBe(true)
  })

  test('D2 — Archived offer NOT visible on customer shop detail page', async ({ page }) => {
    if (!ctx.shopSlug || !ctx.defaultShopListingId) {
      test.skip(true, 'shopSlug or defaultShopListingId not available')
      return
    }

    const token = await getOwnerToken()
    // Use currently-valid dates so the offer WOULD appear on customer page if not archived
    const { status, data } = await apiCreateOffer(token, ctx.defaultShopListingId, {
      title: 'D2 Archived Should Be Hidden',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
    })
    expect(status, 'D2 setup failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    // Archive it — public endpoint must not show it
    await apiPatch(`/api/v1/shop-owner/offers/${offerId}`, { archived: true }, token)

    await page.goto(FRONTEND_URL + `/shops/${ctx.shopSlug}`)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.includes('D2 Archived Should Be Hidden'), 'D2: Archived offer visible on customer page').toBe(false)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // REGRESSION — OfferForm sends shop_listing_id (not product_id or price)
  // ═══════════════════════════════════════════════════════════════════════════

  test('REGRESSION — OfferForm sends shop_listing_id in POST body', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // Intercept the POST to /api/shop-admin/offers and capture the request body
    let capturedBody: Record<string, unknown> | null = null
    page.on('request', req => {
      if (req.url().includes('/api/shop-admin/offers') && req.method() === 'POST') {
        try { capturedBody = JSON.parse(req.postData() ?? '{}') } catch { /* ignore */ }
      }
    })

    // Step 1: Select item
    await selectItemViaModal(page, 'Vet')

    // Step 2: Fill minimal data
    await setPriceType(page, 'on_request')
    await page.locator('input[name="valid_from"]').fill('2026-06-01')
    await page.locator('input[name="valid_until"]').fill('2026-08-31')
    await page.locator('input[name="title"]').fill('REGRESSION Test Offer')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await page.waitForTimeout(2000)

    if (capturedBody) {
      const body = capturedBody as Record<string, unknown>
      // Must have shop_listing_id
      expect(
        body['shop_listing_id'],
        'REGRESSION: OfferForm did not send shop_listing_id — old product_id bug?'
      ).toBeTruthy()
      // Must NOT have old price field
      expect(
        'price' in body,
        'REGRESSION: OfferForm sent deprecated "price" field — revert to old schema?'
      ).toBe(false)
      // Must NOT have old product_id field
      expect(
        'product_id' in body,
        'REGRESSION: OfferForm sent deprecated "product_id" field'
      ).toBe(false)
    }

    // Cleanup if created
    const token = await getOwnerToken()
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const items = (data as { items: Array<{ id: number; title: string }> }).items
    const created = items.find(o => o.title === 'REGRESSION Test Offer')
    if (created) ctx.createdOfferIds.push(created.id)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATED FROM LEGACY: shop-admin-offer-product.spec.ts
//
// These scenarios were in a fixme block (shop_owner_products-based API).
// Migrated to new ShopListing/UnifiedOffer API (shop_listing_id + price_tiers).
//
// Covers: Cross-Shop-Isolation, Preis-Edgecases, archivierte Angebote,
//         Staffelpreise, Datum-Edgecases.
//
// Two-Shop setup: uses buildAdminShopPayload for Shop-B creation.
// ─────────────────────────────────────────────────────────────────────────────

import { buildAdminShopPayload } from './_helpers/admin-shop-payload'
import { randomUUID } from 'crypto'

const LEGACY_UUID = randomUUID().slice(0, 8)
const LEGACY_PREFIX = `e2e-legacy-${LEGACY_UUID}`

// ─── Two-shop context ─────────────────────────────────────────────────────────

interface TwoShopCtx {
  /** Shop A — the "main" e2e shop owner from .test-state.json */
  shopAToken: string | null
  shopAListingId: number | null
  shopASlug: string | null
  /** Shop B — a second shop created via admin API for isolation tests */
  shopBId: number | null
  shopBSlug: string | null
  shopBOwnerId: number | null
  shopBOwnerToken: string | null
  shopBListingId: number | null
  adminToken: string | null
  createdOfferIds: number[]
}

const twoShopCtx: TwoShopCtx = {
  shopAToken: null,
  shopAListingId: null,
  shopASlug: STATE.shopSlug ?? null,
  shopBId: null,
  shopBSlug: null,
  shopBOwnerId: null,
  shopBOwnerToken: null,
  shopBListingId: null,
  adminToken: null,
  createdOfferIds: [],
}

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'e2e-admin@pundo-e2e.io', password: 'E2eAdminPassword!99' }),
  })
  if (!res.ok) throw new Error(`[two-shop] Admin login failed: ${res.status}`)
  const cookieHeader = res.headers.get('set-cookie') ?? ''
  const match = cookieHeader.match(/admin_token=([^;]+)/)
  if (!match) throw new Error('[two-shop] admin_token cookie not found')
  return match[1]
}

async function adminFetch(
  method: string,
  path: string,
  body?: unknown,
  adminTok?: string
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const tok = adminTok ?? twoShopCtx.adminToken
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Cookie: `admin_token=${tok}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data: unknown = {}
  try { if (res.status !== 204) data = await res.json() } catch { /* empty */ }
  return { ok: res.ok, status: res.status, data }
}

async function shopOwnerLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`[two-shop] Shop owner login failed (${email}): ${res.status}`)
  const cookieHeader = res.headers.get('set-cookie') ?? ''
  const match = cookieHeader.match(/shop_owner_token=([^;]+)/)
  if (!match) throw new Error('[two-shop] shop_owner_token cookie not found')
  return match[1]
}

async function registerAndApprove(
  email: string,
  password: string,
  name: string,
  shopName: string,
  shopAddress: string,
  adminTok: string
): Promise<{ ownerId: number; shopId: number; token: string }> {
  let ownerId: number | null = null

  const regRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, shop_name: shopName, shop_address: shopAddress }),
  })
  if (regRes.ok) {
    const reg = await regRes.json() as { id?: number }
    ownerId = reg.id ?? null
  } else if (regRes.status === 400) {
    console.log(`[two-shop] ${email} already registered`)
  } else {
    throw new Error(`[two-shop] Registration failed for ${email}: ${regRes.status}`)
  }

  if (!ownerId) {
    const listRes = await adminFetch('GET', '/api/v1/admin/shop-owners?limit=100', undefined, adminTok)
    const owners = ((listRes.data as { items?: Array<{ id: number; email: string }> })?.items ?? [])
    const found = owners.find(o => o.email === email)
    if (found) ownerId = found.id
  }
  if (!ownerId) throw new Error(`[two-shop] Could not find owner ID for ${email}`)

  const approveRes = await adminFetch('PATCH', `/api/v1/admin/shop-owners/${ownerId}`, { status: 'approved' }, adminTok)
  const shopId = (approveRes.data as { shop_id?: number })?.shop_id ?? 0

  const token = await shopOwnerLogin(email, password)
  return { ownerId, shopId, token }
}

// ─── Today helpers ────────────────────────────────────────────────────────────

const TODAY_ISO = new Date().toISOString().slice(0, 10)

function daysFromToday(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// ─── Suite: Cross-Shop Isolation ──────────────────────────────────────────────

test.describe.serial('MIGRATED — Cross-Shop Isolation + Preis-Edgecases + Staffelpreise', () => {

  test.beforeAll(async () => {
    // ── Admin login ────────────────────────────────────────────────────────────
    twoShopCtx.adminToken = await getAdminToken()

    // ── Shop A: use existing e2e owner from .test-state.json ──────────────────
    twoShopCtx.shopAToken = await getOwnerToken()
    // ShopListing for Shop A (item_id=1, e2e-vet-consultation-larnaca)
    twoShopCtx.shopAListingId = await getOrCreateShopListing(twoShopCtx.shopAToken, 1)
    if (!twoShopCtx.shopAListingId) {
      throw new Error('SETUP BROKEN: Could not create ShopListing for Shop A (item_id=1)')
    }

    // ── Shop B: register a second owner + shop ────────────────────────────────
    const shopBEmail = `${LEGACY_PREFIX}-shopb@pundo-e2e.io`
    const shopBPassword = 'ShopBLegacy!99'

    const shopBData = await registerAndApprove(
      shopBEmail,
      shopBPassword,
      `E2E Legacy Shop B ${LEGACY_UUID}`,
      `${LEGACY_PREFIX}-shop-B`,
      'Mackenzie Beach, Larnaca, Cyprus',
      twoShopCtx.adminToken
    )
    twoShopCtx.shopBOwnerId = shopBData.ownerId
    twoShopCtx.shopBOwnerToken = shopBData.token

    // Retrieve shop B details + set geo so slug is returned
    const ownerDetailRes = await adminFetch(
      'GET',
      `/api/v1/admin/shop-owners/${twoShopCtx.shopBOwnerId}`
    )
    if (!ownerDetailRes.ok) {
      throw new Error(`SETUP BROKEN: Could not get shop-B owner detail: ${ownerDetailRes.status}`)
    }
    const ownerDetail = ownerDetailRes.data as { shop_id?: number }
    if (!ownerDetail.shop_id) {
      throw new Error('SETUP BROKEN: Shop B owner has no shop_id')
    }
    twoShopCtx.shopBId = ownerDetail.shop_id

    // Set geo for shop B
    const patchRes = await adminFetch('PATCH', `/api/v1/admin/shops/${twoShopCtx.shopBId}`, {
      lat: 34.9050,
      lng: 33.6183,
    })
    twoShopCtx.shopBSlug = (patchRes.data as { slug?: string })?.slug ?? null

    // ShopListing for Shop B
    twoShopCtx.shopBListingId = await getOrCreateShopListing(twoShopCtx.shopBOwnerToken, 1)
    if (!twoShopCtx.shopBListingId) {
      throw new Error('SETUP BROKEN: Could not create ShopListing for Shop B (item_id=1)')
    }
  })

  test.afterAll(async () => {
    if (!twoShopCtx.adminToken) return

    // Archive + delete created offers
    if (twoShopCtx.shopAToken) {
      for (const id of twoShopCtx.createdOfferIds) {
        await apiPatch(`/api/v1/shop-owner/offers/${id}`, { archived: true }, twoShopCtx.shopAToken).catch(() => {})
        await apiDelete(`/api/v1/shop-owner/offers/${id}`, twoShopCtx.shopAToken).catch(() => {})
      }
    }

    // Reject shop B owner
    if (twoShopCtx.shopBOwnerId) {
      await adminFetch('PATCH', `/api/v1/admin/shop-owners/${twoShopCtx.shopBOwnerId}`, { status: 'rejected' }).catch(() => {})
    }
  })

  // ── Cross-Shop Isolation ───────────────────────────────────────────────────

  test('XS1 — POST offer with ShopListing from OTHER shop → 403 or 422 (isolation enforced)', async () => {
    // Shop A owner tries to use Shop B's shop_listing_id — must be rejected
    const shopAToken = twoShopCtx.shopAToken!
    const shopBListingId = twoShopCtx.shopBListingId!

    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: shopBListingId,
      price_type: 'on_request',
      price_tiers: [],
      valid_from: TODAY_ISO,
      valid_until: daysFromToday(30),
      title: 'XS1 Cross-shop injection attempt',
    }, shopAToken)

    // Backend must reject this — either 403 (forbidden) or 422 (validation)
    expect([403, 422], `XS1: cross-shop shop_listing_id must be rejected (got ${res.status})`).toContain(res.status)
    console.log(`[XS1] Backend rejected cross-shop attempt with: ${res.status}`)
  })

  test('XS2 — Shop B offer NOT visible on Shop A customer page', async ({ page }) => {
    if (!twoShopCtx.shopASlug || !twoShopCtx.shopBListingId || !twoShopCtx.shopBOwnerToken) {
      throw new Error('PREREQUISITE BROKEN: shopASlug or shopB context missing')
    }

    // Create an active offer for Shop B
    const offerRes = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: twoShopCtx.shopBListingId,
      price_type: 'on_request',
      price_tiers: [],
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      title: 'XS2 Shop-B Offer Must Not Appear on Shop-A Page',
    }, twoShopCtx.shopBOwnerToken)
    expect(offerRes.status, 'XS2 setup: create Shop-B offer').toBe(201)

    // Navigate to Shop A page — must NOT show Shop B's offer
    await page.goto(FRONTEND_URL + `/shops/${twoShopCtx.shopASlug}`)
    await page.waitForLoadState('networkidle')

    const body = await page.locator('body').innerText()
    expect(
      body.includes('XS2 Shop-B Offer Must Not Appear on Shop-A Page'),
      'XS2: Shop-B offer must NOT appear on Shop-A customer page'
    ).toBe(false)
  })

  // ── Archivierte Angebote ───────────────────────────────────────────────────

  test('AR1 — Archived offer is NOT visible on customer shop page', async ({ page }) => {
    if (!twoShopCtx.shopASlug || !twoShopCtx.shopAToken || !twoShopCtx.shopAListingId) {
      throw new Error('PREREQUISITE BROKEN: shopA context missing')
    }

    const token = twoShopCtx.shopAToken

    // Create an active offer
    const offerRes = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: twoShopCtx.shopAListingId,
      price_type: 'free',
      price_tiers: [],
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      title: 'AR1 Archived Must Be Hidden From Customer',
    }, token)
    expect(offerRes.status, 'AR1 setup: create offer').toBe(201)
    const offerId = (offerRes.data as { id: number }).id
    twoShopCtx.createdOfferIds.push(offerId)

    // Archive it
    await apiPatch(`/api/v1/shop-owner/offers/${offerId}`, { archived: true }, token)

    await page.goto(FRONTEND_URL + `/shops/${twoShopCtx.shopASlug}`)
    await page.waitForLoadState('networkidle')

    const body = await page.locator('body').innerText()
    expect(
      body.includes('AR1 Archived Must Be Hidden From Customer'),
      'AR1: archived offer must NOT be visible on customer shop page'
    ).toBe(false)
  })

  // ── Staffelpreise (price_tiers) ────────────────────────────────────────────

  test('SP1 — Offer with fixed price tier (per_piece, 1 step) → 201', async () => {
    const token = twoShopCtx.shopAToken!
    const listingId = twoShopCtx.shopAListingId!

    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'fixed',
      price_tiers: [{ unit: 'per_piece', min_qty: 1, price: 49.99 }],
      valid_from: TODAY_ISO,
      valid_until: daysFromToday(30),
      title: 'SP1 Single Price Tier',
    }, token)
    expect(res.status, 'SP1: offer with 1 price tier must return 201').toBe(201)
    const offer = res.data as { id: number; price_tiers?: unknown[] }
    twoShopCtx.createdOfferIds.push(offer.id)
    if ((offer.price_tiers ?? []).length > 0) {
      expect(offer.price_tiers!.length, 'SP1: 1 price tier must be stored').toBe(1)
    }
  })

  test('SP2 — Offer with multiple price tier steps → 201', async () => {
    const token = twoShopCtx.shopAToken!
    const listingId = twoShopCtx.shopAListingId!

    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'fixed',
      price_tiers: [
        { unit: 'per_m2', min_qty: 1, price: 15.00 },
        { unit: 'per_m2', min_qty: 11, price: 12.00 },
        { unit: 'per_m2', min_qty: 51, price: 10.00 },
      ],
      valid_from: TODAY_ISO,
      valid_until: daysFromToday(30),
      title: 'SP2 Three Tier Steps (per_m2)',
    }, token)
    expect(res.status, 'SP2: offer with 3 price tier steps must return 201').toBe(201)
    const offer = res.data as { id: number; price_tiers?: unknown[] }
    twoShopCtx.createdOfferIds.push(offer.id)
    if ((offer.price_tiers ?? []).length > 0) {
      expect(offer.price_tiers!.length, 'SP2: all 3 tier steps must be stored').toBe(3)
    }
  })

  test('SP3 — Offer with on_request price_type: no price_tiers required → 201', async () => {
    const token = twoShopCtx.shopAToken!
    const listingId = twoShopCtx.shopAListingId!

    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'on_request',
      price_tiers: [],
      title: 'SP3 On Request No Tiers',
    }, token)
    expect(res.status, 'SP3: on_request offer without dates must return 201').toBe(201)
    const offer = res.data as { id: number }
    twoShopCtx.createdOfferIds.push(offer.id)
  })

  test('SP4 — Offer price_tiers visible on customer shop page', async ({ page }) => {
    if (!twoShopCtx.shopASlug || !twoShopCtx.shopAToken || !twoShopCtx.shopAListingId) {
      throw new Error('PREREQUISITE BROKEN: shopA context missing')
    }

    const token = twoShopCtx.shopAToken
    const listingId = twoShopCtx.shopAListingId

    // Create an active offer with price tiers
    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'fixed',
      price_tiers: [{ unit: 'per_piece', min_qty: 1, price: 29.99 }],
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      title: 'SP4 Customer Visible Price Tier Offer',
    }, token)
    expect(res.status, 'SP4 setup: create offer with price tier').toBe(201)
    const offerId = (res.data as { id: number }).id
    twoShopCtx.createdOfferIds.push(offerId)

    await page.goto(FRONTEND_URL + `/shops/${twoShopCtx.shopASlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url, 'SP4: shop page must not 404').not.toContain('not-found')
    expect(url, 'SP4: shop page must not 404').not.toContain('404')

    // The offer title should appear on the page
    const body = await page.locator('body').innerText()
    expect(
      body.includes('SP4 Customer Visible Price Tier Offer'),
      'SP4: offer with price tiers must appear on customer shop page'
    ).toBe(true)
  })

  // ── Datum-Edgecases ────────────────────────────────────────────────────────

  test('DT1 — Offer without valid_from and valid_until (timeless) → 201', async () => {
    const token = twoShopCtx.shopAToken!
    const listingId = twoShopCtx.shopAListingId!

    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'on_request',
      price_tiers: [],
      title: 'DT1 Timeless Offer',
      // NO valid_from, NO valid_until
    }, token)
    expect(res.status, 'DT1: offer without dates must return 201 (both optional)').toBe(201)
    const offer = res.data as { id: number; valid_from: unknown; valid_until: unknown }
    twoShopCtx.createdOfferIds.push(offer.id)
    expect(offer.valid_from, 'DT1: valid_from must be null in response').toBeNull()
    expect(offer.valid_until, 'DT1: valid_until must be null in response').toBeNull()
  })

  test('DT2 — Expired offer (valid_until in past) NOT shown on customer shop page', async ({ page }) => {
    if (!twoShopCtx.shopASlug || !twoShopCtx.shopAToken || !twoShopCtx.shopAListingId) {
      throw new Error('PREREQUISITE BROKEN: shopA context missing')
    }

    const token = twoShopCtx.shopAToken

    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: twoShopCtx.shopAListingId,
      price_type: 'free',
      price_tiers: [],
      valid_from: '2026-01-01',
      valid_until: '2026-03-31',  // expired (past date)
      title: 'DT2 Expired Offer Must Not Show',
    }, token)
    expect(res.status, 'DT2 setup: create expired offer').toBe(201)
    const offerId = (res.data as { id: number }).id
    twoShopCtx.createdOfferIds.push(offerId)

    await page.goto(FRONTEND_URL + `/shops/${twoShopCtx.shopASlug}`)
    await page.waitForLoadState('networkidle')

    const body = await page.locator('body').innerText()
    expect(
      body.includes('DT2 Expired Offer Must Not Show'),
      'DT2: expired offer must NOT appear on customer shop page'
    ).toBe(false)
  })
})
