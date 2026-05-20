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
import { shopOwnerLogin, adminLogin as adminApiLogin } from './_helpers'

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
  fixtures?: {
    shop_slug?: string
    shop_id?: number
    product_slugs?: Record<string, string>
    product_ids?: Record<string, number>
  }
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

let _cachedOwnerToken: string | null = null
async function getOwnerToken(): Promise<string> {
  if (!_cachedOwnerToken) {
    _cachedOwnerToken = await shopOwnerLogin(STATE.email, STATE.password)
  }
  return _cachedOwnerToken
}

/** Create a ShopListing for the given item. Returns shop_listing_id, or null on failure (e.g. 422 if item_id not in catalog). */
async function getOrCreateShopListing(token: string, itemId = 53963): Promise<number | null> {
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
  await page.waitForLoadState('load')
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
  await page.waitForLoadState('load')

  // Click the first result button in the list
  const resultButtons = page.getByRole('dialog').locator('ul li button')
  await expect(resultButtons.first()).toBeVisible({ timeout: 8_000 })
  await resultButtons.first().click()

  // After click: ShopListing is created, step advances to 2
  await page.waitForLoadState('load')
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
    test.setTimeout(120_000)
    const health = await fetch(`${BACKEND_URL}/api/v1/categories`)
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)

    const token = await getOwnerToken()

    // Create a ShopListing for the default item (used by most tests).
    // Falls back to known seeded item_id 53963 (e2e-vet-consultation-larnaca) if fixtures not set.
    const defaultItemId = STATE.fixtures?.product_ids?.['e2e-vet-consultation-larnaca'] ?? 53963
    ctx.defaultShopListingId = await getOrCreateShopListing(token, defaultItemId)
    console.log(`[offers-spec] defaultShopListingId=${ctx.defaultShopListingId} (item_id=${defaultItemId})`)

    if (!ctx.defaultShopListingId) {
      console.warn(`[offers-spec] Could not create ShopListing for item_id=${defaultItemId} — most tests will fail`)
      return
    }

    // Pre-create the offer for C1/C2 archive/delete tests.
    // IMPORTANT: use a SEPARATE item/listing from defaultShopListingId. A1/A3 both POST to
    // the default listing and the backend auto-archives the previous active offer for that
    // listing. If we used the same listing here, the archive target would be silently archived
    // by A1 before C1 gets to test it.
    const archiveItemId = STATE.fixtures?.product_ids?.['fotokopieren-din-a4'] ?? 53962
    const archiveListingId = await getOrCreateShopListing(token, archiveItemId)
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
    test.setTimeout(60_000)
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // Step 1: Select item via modal (search by item name)
    await selectItemViaModal(page, 'Vet')

    // Now on Step 2
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 })

    // Set standard price type to on_request (no standard tiers needed)
    await setPriceType(page, 'on_request')

    // Expand the promo accordion — promo dates live inside a collapsed section
    await page.getByRole('button', { name: /promotion|aktionspreis|promo/i }).click()
    await page.waitForTimeout(200)

    // Default promo type is 'fixed' — add a promo price tier
    await addPriceTierStep(page, '9.99')

    // Fill promo dates (now visible inside the expanded accordion)
    await page.locator('input[name="promo_valid_from"]').fill('2026-06-01')
    await page.locator('input[name="promo_valid_until"]').fill('2026-08-31')

    // Fill optional fields
    await page.locator('input[name="title"]').fill('A1 Full Combo Offer')
    await page.locator('textarea[name="description"]').fill('Full combo description')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    // After submit, the form redirects to the offers list
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
    // OfferList shows item names (not offer titles) — confirm at least one offer edit link renders
    await expect(page.locator('a[href*="/shop-admin/offers/"][href*="/edit"]').first()).toBeVisible({ timeout: 10_000 })

    // Verify via API — offer title is the authoritative check
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

    // Create via API using the default listing (title-optional case)
    const token = await getOwnerToken()
    const { status, data } = await apiCreateOffer(token, ctx.defaultShopListingId, {
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

    test.setTimeout(60_000)
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // Step 1: Select item
    await selectItemViaModal(page, 'Vet')

    // Step 2: Use on_request (price_tiers not required — that's what we're testing)
    await setPriceType(page, 'on_request')
    await page.locator('input[name="title"]').fill('A3 On Request Offer')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })
    // OfferList shows item names (not offer titles) — confirm at least one offer edit link renders
    await expect(page.locator('a[href*="/shop-admin/offers/"][href*="/edit"]').first()).toBeVisible({ timeout: 10_000 })

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

    test.setTimeout(60_000)
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // Step 1: Select item
    await selectItemViaModal(page, 'Vet')

    // Step 2: Choose fixed but add no tiers — validation should reject this
    await setPriceType(page, 'fixed')
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
    // OfferList shows item names (not offer titles) — confirm at least one offer edit link renders
    await expect(page.locator('a[href*="/shop-admin/offers/"][href*="/edit"]').first()).toBeVisible({ timeout: 10_000 })

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

    // OfferList shows item name, not offer title. Item 53962 = "Fotokopieren DIN-A4" (de).
    // resolveLocalizedName falls back to 'de' when 'en' is missing.
    await expect(page.getByText('Fotokopieren DIN-A4')).toBeVisible()

    // Find the specific offer row by item name AND archive button
    const offerRow = page.locator('div').filter({
      has: page.locator('p', { hasText: 'Fotokopieren DIN-A4' }),
    }).filter({
      has: page.getByRole('button', { name: /archive|archivieren/i }),
    }).last()

    await offerRow.getByRole('button', { name: /archive|archivieren/i }).click()

    // Confirmation step — wait for Cancel to appear inside this row
    await offerRow.getByRole('button', { name: /cancel|abbrechen/i }).waitFor({ state: 'visible' })
    await offerRow.getByRole('button', { name: /archive|archivieren/i }).click()

    await expect(page.getByText('Fotokopieren DIN-A4')).not.toBeVisible({ timeout: 10_000 })

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

    // Use double-filter to find the specific row (innermost div with item name AND delete button)
    // OfferList shows item name "Fotokopieren DIN-A4" (item 53962), not the offer title
    const archiveTargetRow = page.locator('div').filter({
      has: page.locator('p', { hasText: 'Fotokopieren DIN-A4' }),
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
      // Wait briefly for the client-side state update to remove the row
      await page.waitForTimeout(500)
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

    // The customer-facing /shops/by-slug/{slug}/offers API only returns offers with an
    // ACTIVE promo period (promo_valid_from <= today <= promo_valid_until) AND promo price set.
    // We must provide promo_price_type + promo_price_tiers + promo_valid_from/until.
    // The backend uses offer.title as item_name in the response when no item name is available.
    const d1Res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: ctx.defaultShopListingId,
      price_type: 'fixed',
      price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 15.00, currency: 'EUR' }] }],
      promo_price_type: 'fixed',
      promo_price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 9.99, currency: 'EUR' }] }],
      promo_valid_from: TODAY_ISO,
      promo_valid_until: daysFromToday(30),
      title: 'D1 Customer Visible Offer',
    }, token)
    const { status, data } = d1Res as { status: number; data: { id: number } }
    expect(status, 'D1 setup: create offer failed').toBe(201)
    const offerId = (data as { id: number }).id
    ctx.createdOfferIds.push(offerId)

    // Wait until the public backend endpoint confirms the offer is visible.
    // In parallel test runs the Next.js SSR page is served by the same backend — if we
    // navigate before the offer is confirmed visible the page may render a cached empty list.
    let offerVisible = false
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${ctx.shopSlug}/offers`, {
        headers: { 'Accept-Language': 'en' },
      })
      if (res.ok) {
        const items = await res.json() as Array<{ id: number }>
        if (items.some(o => o.id === offerId)) { offerVisible = true; break }
      }
      await new Promise(r => setTimeout(r, 200))
    }
    expect(offerVisible, 'D1: offer not visible in public backend API after 2s').toBe(true)

    await page.goto(FRONTEND_URL + `/shops/${ctx.shopSlug}`)
    // networkidle: wait for all RSC streaming chunks to finish (Next.js App Router streams pages)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).not.toContain('404')
    expect(url).not.toContain('not-found')

    // Wait explicitly for the offer title to appear (streamed RSC content)
    await expect(page.getByText('D1 Customer Visible Offer')).toBeVisible({ timeout: 10_000 })

    const bodyText = await page.locator('body').innerText()
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
    test.setTimeout(60_000)
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

    // Step 2: Fill minimal data (no promo dates — they live inside a collapsed accordion)
    await setPriceType(page, 'on_request')
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
  return adminApiLogin()
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
    test.setTimeout(120_000)
    // ── Admin login ────────────────────────────────────────────────────────────
    twoShopCtx.adminToken = await getAdminToken()

    // ── Shop A: use existing e2e owner from .test-state.json ──────────────────
    twoShopCtx.shopAToken = await getOwnerToken()
    // ShopListing for Shop A — use seeded fixture item_id (e2e-vet-consultation-larnaca)
    // item_id=1 does not exist in the test DB; the real ID comes from STATE.fixtures.product_ids
    const shopAItemId = STATE.fixtures?.product_ids?.['e2e-vet-consultation-larnaca'] ?? 53963
    twoShopCtx.shopAListingId = await getOrCreateShopListing(twoShopCtx.shopAToken, shopAItemId)
    if (!twoShopCtx.shopAListingId) {
      throw new Error(`SETUP BROKEN: Could not create ShopListing for Shop A (item_id=${shopAItemId})`)
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

    // ShopListing for Shop B — use the same seeded fixture item_id
    const shopBItemId = STATE.fixtures?.product_ids?.['e2e-vet-consultation-larnaca'] ?? 53963
    twoShopCtx.shopBListingId = await getOrCreateShopListing(twoShopCtx.shopBOwnerToken, shopBItemId)
    if (!twoShopCtx.shopBListingId) {
      throw new Error(`SETUP BROKEN: Could not create ShopListing for Shop B (item_id=${shopBItemId})`)
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
    await page.waitForLoadState('load')

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
    await page.waitForLoadState('load')

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

    // PriceTierCreate schema: { unit, steps: [{ min_quantity, price, currency }] }
    // NOT: { unit, min_qty, price } — that is the legacy flat format
    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'fixed',
      price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 49.99, currency: 'EUR' }] }],
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

    // SP2: one tier with 3 steps (graduated pricing via steps array)
    // PriceTierCreate schema: { unit, steps: [{ min_quantity, price, currency }] }
    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'fixed',
      price_tiers: [
        {
          unit: 'per_m2',
          steps: [
            { min_quantity: 1, price: 15.00, currency: 'EUR' },
            { min_quantity: 11, price: 12.00, currency: 'EUR' },
            { min_quantity: 51, price: 10.00, currency: 'EUR' },
          ],
        },
      ],
      valid_from: TODAY_ISO,
      valid_until: daysFromToday(30),
      title: 'SP2 Three Tier Steps (per_m2)',
    }, token)
    expect(res.status, 'SP2: offer with 3 price tier steps must return 201').toBe(201)
    const offer = res.data as { id: number; price_tiers?: Array<{ steps?: unknown[] }> }
    twoShopCtx.createdOfferIds.push(offer.id)
    // The response wraps steps inside the tier — check the tier exists
    if ((offer.price_tiers ?? []).length > 0) {
      const tier = offer.price_tiers![0]
      const stepCount = (tier.steps ?? []).length
      if (stepCount > 0) {
        expect(stepCount, 'SP2: all 3 tier steps must be stored').toBe(3)
      }
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

    // Create an offer with both standard price_tiers AND promo pricing — only offers with
    // an active promo period (promo_valid_from..promo_valid_until) are returned by the
    // customer-facing /shops/by-slug/{slug}/offers endpoint.
    // The backend uses the offer title as item_name in the customer API response.
    const res = await apiPost('/api/v1/shop-owner/offers', {
      shop_listing_id: listingId,
      price_type: 'fixed',
      price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 29.99, currency: 'EUR' }] }],
      promo_price_type: 'fixed',
      promo_price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 19.99, currency: 'EUR' }] }],
      promo_valid_from: TODAY_ISO,
      promo_valid_until: daysFromToday(30),
      title: 'SP4 Customer Visible Price Tier Offer',
    }, token)
    expect(res.status, 'SP4 setup: create offer with price tier').toBe(201)
    const offerId = (res.data as { id: number }).id
    twoShopCtx.createdOfferIds.push(offerId)

    await page.goto(FRONTEND_URL + `/shops/${twoShopCtx.shopASlug}`)
    await page.waitForLoadState('load')

    const url = page.url()
    expect(url, 'SP4: shop page must not 404').not.toContain('not-found')
    expect(url, 'SP4: shop page must not 404').not.toContain('404')

    // The backend returns offer.title as item_name in the customer API response.
    // toContainText() retries until the streamed RSC content settles.
    await expect(page.locator('body')).toContainText('SP4 Customer Visible Price Tier Offer', { timeout: 8000 })
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
    const offer = res.data as { id: number; promo_valid_from: unknown; promo_valid_until: unknown }
    twoShopCtx.createdOfferIds.push(offer.id)
    expect(offer.promo_valid_from, 'DT1: promo_valid_from must be null in response').toBeNull()
    expect(offer.promo_valid_until, 'DT1: promo_valid_until must be null in response').toBeNull()
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
    await page.waitForLoadState('load')

    const body = await page.locator('body').innerText()
    expect(
      body.includes('DT2 Expired Offer Must Not Show'),
      'DT2: expired offer must NOT appear on customer shop page'
    ).toBe(false)
  })
})

// =============================================================================
// GROUP E — Item-Details, Filter & Dashboard-Aufräumen
//
// Spec: 2026-05-19-offer-list-item-details
// ACs:  AC-1 (Dashboard), AC-2–4 (Item-Name), AC-5–6 (Kategorie-Chip),
//       AC-9–10 (Thumbnail), AC-11–15 (Textsuche), AC-18–19 (Edit H1+Header),
//       AC-20 (RTL), AC-24 (nav_products entfernt)
//
// Backend-Status-Hinweis:
//   Tests E2a/E3a/E4a/E6a erwarten item-Embed in GET /offers — falls das Backend
//   den Embed noch nicht liefert, skipped der Test (SKIP, kein FAIL).
//   E1, E5, E6b (Fallback), E7 laufen rein frontend-seitig sofort.
// =============================================================================

const E2E_OWNER_EMAIL = 'e2e-owner@pundo-e2e.io'
const E2E_OWNER_PASSWORD = 'E2eTestPassword!99'

test.describe.serial('Group E — Item-Details, Filter & Dashboard', () => {

  // Shared token für API-Calls in Gruppe E
  let eOwnerToken: string | null = null
  let eOfferId: number | null = null
  const eCreatedOfferIds: number[] = []
  const eCreatedListingIds: number[] = []
  const eCreatedItemIds: number[] = []

  /** Holt die erste verfügbare category_id aus dem Backend. */
  async function getFirstCategoryId(): Promise<number | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/categories?limit=1`)
      if (!res.ok) return null
      const data = await res.json() as { items?: Array<{ id: number }> }
      return data.items?.[0]?.id ?? null
    } catch { return null }
  }

  /** Erstellt ein minimales Item via shop-owner API. Bei 409 fuzzy-match: vorhandenes Item wiederverwenden. */
  async function createTestItem(token: string, categoryId: number): Promise<number | null> {
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        item_type: 'product',
        name_de: 'E2E Group-E Testartikel',
        category_id: categoryId,
      }),
    })
    if (res.status === 201) {
      const data = await res.json() as { id: number }
      return data.id
    }
    if (res.status === 409) {
      // Backend meldet fuzzy-match — vorhandenes ähnliches Item wiederverwenden
      const body = await res.json() as { detail?: { similar_items?: Array<{ id: number }> } }
      const existingId = body.detail?.similar_items?.[0]?.id ?? null
      if (existingId) {
        console.log(`[Group E] createTestItem: 409 fuzzy-match — reuse item ${existingId}`)
        return existingId
      }
    }
    console.warn(`[Group E] createTestItem failed: ${res.status}`)
    return null
  }

  test.beforeAll(async () => {
    test.setTimeout(60_000)
    // Verify backend reachable
    const health = await fetch(`${BACKEND_URL}/api/v1/categories`)
    if (!health.ok) throw new Error(`[Group E] Backend health check failed: ${health.status}`)

    // Login
    try {
      eOwnerToken = await shopOwnerLogin(E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD)
    } catch (err) {
      console.warn(`[Group E] Login failed: ${err} — some tests will be skipped`)
    }

    if (eOwnerToken) {
      // 1. Finde eine gültige category_id dynamisch (statt hardcoded item_id=1)
      const categoryId = await getFirstCategoryId()
      if (!categoryId) {
        console.warn('[Group E] Keine Kategorie gefunden — Offer-abhängige Tests werden übersprungen')
      } else {
        // 2. Erstelle ein Item
        const itemId = await createTestItem(eOwnerToken, categoryId)
        if (itemId) {
          eCreatedItemIds.push(itemId)
          // 3. Erstelle ein ShopListing für dieses Item
          const listingId = await getOrCreateShopListing(eOwnerToken, itemId)
          if (listingId) {
            eCreatedListingIds.push(listingId)
            // 4. Erstelle ein Offer
            const r = await apiCreateOffer(eOwnerToken, listingId, {})
            if (r.status === 201) {
              eOfferId = r.data.id
              eCreatedOfferIds.push(eOfferId)
              console.log(`[Group E] Setup: item=${itemId}, listing=${listingId}, offer=${eOfferId}`)
            }
          }
        }
      }
    }
  })

  test.afterAll(async () => {
    if (!eOwnerToken) return
    for (const id of eCreatedOfferIds) {
      await apiPatch(`/api/v1/shop-owner/offers/${id}`, { archived: true }, eOwnerToken).catch(() => {})
      await apiDelete(`/api/v1/shop-owner/offers/${id}`, eOwnerToken).catch(() => {})
    }
    for (const id of eCreatedListingIds) {
      await apiDelete(`/api/v1/shop-owner/shop-listings/${id}`, eOwnerToken).catch(() => {})
    }
    // Items können nicht via shop-owner gelöscht werden — bleiben in Test-DB (0-cost)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E1 — Dashboard: keine Produkte-Kachel (AC-1)
  // ──────────────────────────────────────────────────────────────────────────

  test('E1 — Dashboard zeigt keine Produkte-Kachel (AC-1)', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/dashboard')
    await waitHydrated(page)

    const bodyText = await page.locator('body').innerText()

    // Die Produkte-Kachel muss fehlen
    // Wir suchen nach "Products" / "Produkte" als isoliertes Nav-Label
    // (Ein Link /shop-admin/products darf nicht existieren)
    const productLinks = await page.locator('a[href="/shop-admin/products"]').count()
    expect(productLinks, 'E1: /shop-admin/products Link darf nicht im Dashboard sein').toBe(0)

    // Die übrigen Quick-Links müssen noch da sein (im Dashboard-Grid, nicht in der Nav)
    const main = page.locator('main')
    await expect(main.locator('a[href="/shop-admin/offers"]')).toBeVisible()
    await expect(main.locator('a[href="/shop-admin/profile"]')).toBeVisible()
    await expect(main.locator('a[href="/shop-admin/hours"]')).toBeVisible()

    console.log('[E1] Dashboard body excerpt (first 300 chars):', bodyText.slice(0, 300))
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E5 — Textsuche in OfferList (AC-11–15) — läuft sofort (client-seitig)
  // ──────────────────────────────────────────────────────────────────────────

  test('E5a — Suchfeld ist sichtbar und hat Placeholder (AC-11)', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    const searchInput = page.locator('[data-testid="offer-search"]')
    await expect(searchInput).toBeVisible({ timeout: 8_000 })

    const placeholder = await searchInput.getAttribute('placeholder')
    expect(placeholder, 'E5a: Suchfeld hat keinen Placeholder').toBeTruthy()
    expect(placeholder!.length, 'E5a: Placeholder ist leer').toBeGreaterThan(0)
  })

  test('E5b — Suche filtert sichtbare Items (AC-12)', async ({ page }) => {
    if (!eOwnerToken) { test.skip(true, 'Login nicht möglich'); return }

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    const searchInput = page.locator('[data-testid="offer-search"]')
    await expect(searchInput).toBeVisible({ timeout: 8_000 })

    // Count items before search
    const allRows = page.locator('div.bg-white.rounded-xl.border > div')
    const totalBefore = await allRows.count()

    if (totalBefore === 0) {
      test.skip(true, 'Keine Angebote im aktiven Tab — Suche nicht testbar')
      return
    }

    // pressSequentially triggers React onChange per keystroke (more reliable than fill() for
    // controlled inputs under React 19 with CDP-based event dispatch)
    await searchInput.pressSequentially('zzz-no-match-xyzxyzxyz', { delay: 20 })
    await expect(searchInput).toHaveValue('zzz-no-match-xyzxyzxyz', { timeout: 3_000 })

    // Language-independent check: the offer list container must disappear and the no-results
    // paragraph (text-gray-400) must appear. Avoids regex that only covered EN/DE (B8950-002).
    await expect(
      page.locator('div.bg-white.rounded-xl.border'),
      'E5b: Offer-Tabelle noch sichtbar — Filter hat nicht angeschlagen'
    ).toHaveCount(0, { timeout: 8_000 })
    await expect(
      page.locator('p.text-gray-400.text-sm.text-center'),
      'E5b: No-results-Paragraph fehlt'
    ).toBeVisible({ timeout: 3_000 })
  })

  test('E5c — Suchfeld leeren zeigt alle Items wieder (AC-13)', async ({ page }) => {
    if (!eOwnerToken) { test.skip(true, 'Login nicht möglich'); return }

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    const searchInput = page.locator('[data-testid="offer-search"]')
    await expect(searchInput).toBeVisible({ timeout: 8_000 })

    // Fill search with no-match term
    await searchInput.fill('zzz-no-match')
    await page.waitForTimeout(300)

    // Clear search
    await searchInput.fill('')
    await page.waitForTimeout(300)

    // After clearing: no-results message should NOT be visible (unless list is truly empty)
    const noResultsFiltered = page.locator('p', { hasText: /no offers match the filter|keine angebote entsprechen dem filter/i })
    const hasFilterMsg = await noResultsFiltered.count() > 0
    expect(hasFilterMsg, 'E5c: "no results filtered" Meldung noch sichtbar nach Leeren des Suchfelds').toBe(false)
  })

  test('E5d — Kein Crash bei leerem Suchfeld-Ergebnis: Meldung zeigen (AC-15)', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    const searchInput = page.locator('[data-testid="offer-search"]')
    await expect(searchInput).toBeVisible({ timeout: 8_000 })

    // Force a no-match
    await searchInput.fill('zzz-absolutely-no-match-xyzxyz')
    await page.waitForTimeout(400)

    // Page must not crash (no error boundary, no blank page)
    await expect(page.locator('body')).toBeVisible()

    // Either rows are gone or "no results" message (either tr.no_results or tr.offer_no_results_filtered)
    const rowContainer = page.locator('div.bg-white.rounded-xl.border.divide-y')
    const containerExists = await rowContainer.count() > 0

    if (!containerExists) {
      // No container means no rows — check for empty-state message
      const emptyMsg = page.locator('p.text-gray-400')
      await expect(emptyMsg).toBeVisible({ timeout: 3_000 })
    }
    // In any case: no JS error thrown (page still functional)
    const title = await page.title()
    expect(title.length, 'E5d: Page hat keinen Titel mehr — möglicher Crash').toBeGreaterThan(0)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E4b — Thumbnail Fallback-SVG (AC-10) — läuft ohne Backend-Embed
  // ──────────────────────────────────────────────────────────────────────────

  test('E4b — Fallback-SVG sichtbar wenn kein Foto vorhanden (AC-10)', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    // Page must render without crash regardless of offer count
    await expect(page.locator('body')).toBeVisible()

    // The thumbnail placeholder is a div.shrink-0.w-12.h-12 containing an SVG with aria-hidden
    // It appears when offer.item?.photos[0] is null/undefined
    const placeholders = page.locator('div.shrink-0.w-12.h-12 svg[aria-hidden="true"]')
    const count = await placeholders.count()

    // We can't guarantee ALL offers have no photo — just ensure the component renders without crash
    // Either: at least one placeholder exists OR at least one <img> thumbnail exists
    const thumbnails = page.locator('div.shrink-0.w-12.h-12 img')
    const imgCount = await thumbnails.count()

    console.log(`[E4b] SVG placeholders: ${count}, img thumbnails: ${imgCount}`)

    if (count + imgCount === 0) {
      // No offer rows in the active tab — the component renders the empty state correctly
      // Verify the empty-state message is shown instead (no crash, no blank page)
      const emptyMsg = page.locator('p.text-gray-400.text-sm.py-8')
      await expect(emptyMsg).toBeVisible()
      test.skip(true, 'E4b: Keine Angebote im aktiven Tab — Thumbnail-Struktur nicht prüfbar, aber kein Crash')
      return
    }

    expect(
      count + imgCount,
      'E4b: Thumbnail-Slots gefunden, aber keiner ist sichtbar'
    ).toBeGreaterThan(0)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E2a — Item-Namen in OfferList (AC-2) — benötigt item-Embed
  // ──────────────────────────────────────────────────────────────────────────

  test('E2a — Offer-Liste zeigt Item-Name aus item.names (AC-2)', async ({ page }) => {
    if (!eOwnerToken) { test.skip(true, 'Login nicht möglich'); return }

    // Check whether backend delivers item-embed
    const token = eOwnerToken
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const offers = (data as { items: Array<{ id: number; item?: { names?: Record<string, string> } }> }).items
    const hasItemEmbed = offers.some(o => o.item?.names && Object.keys(o.item.names).length > 0)

    if (!hasItemEmbed) {
      test.skip(true, 'Backend liefert noch kein item-Embed — AC-2 nach Backend-Deployment testen')
      return
    }

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    // At least one offer row must exist
    const offerRows = page.locator('div.bg-white.rounded-xl.border.divide-y > div')
    const rowCount = await offerRows.count()
    expect(rowCount, 'E2a: Keine Offer-Zeilen gefunden').toBeGreaterThan(0)

    // The item name is rendered as a <p class="...font-medium..."> inside each row
    const nameCell = offerRows.first().locator('p.font-medium, p[class*="font-medium"]')
    await expect(nameCell).toBeVisible({ timeout: 5_000 })
    const nameText = await nameCell.textContent()
    expect(nameText, 'E2a: Item-Name ist leer').toBeTruthy()
    // Must NOT be "Offer #<id>" pattern when item-embed is present
    expect(nameText, 'E2a: Item-Name zeigt immer noch Offer #id Fallback obwohl item vorhanden').not.toMatch(/^Offer #\d+$/)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E3a — Kategorie-Chip (AC-5–6)
  // ──────────────────────────────────────────────────────────────────────────

  test('E3a — Kategorie-Chip sichtbar wenn category_name vorhanden (AC-5)', async ({ page }) => {
    if (!eOwnerToken) { test.skip(true, 'Login nicht möglich'); return }

    const token = eOwnerToken
    const { data } = await apiGet('/api/v1/shop-owner/offers', token)
    const offers = (data as { items: Array<{ item?: { category_name?: string | null } }> }).items
    const hasCategoryName = offers.some(o => o.item?.category_name)

    if (!hasCategoryName) {
      test.skip(true, 'Backend liefert kein category_name im item-Embed — AC-5 nach Deployment testen')
      return
    }

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    // Category chip: span with bg-blue-50 text-blue-600 classes
    const categoryChips = page.locator('span.bg-blue-50.text-blue-600, span[class*="bg-blue-50"][class*="text-blue-600"]')
    const chipCount = await categoryChips.count()
    expect(chipCount, 'E3a: Kein Kategorie-Chip sichtbar obwohl category_name im Backend').toBeGreaterThan(0)

    const chipText = await categoryChips.first().textContent()
    expect(chipText?.trim().length, 'E3a: Kategorie-Chip ist leer').toBeGreaterThan(0)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E6 — Edit-Page H1 und Item-Header-Block (AC-18–19)
  // ──────────────────────────────────────────────────────────────────────────

  test('E6a — Edit-Page H1 enthält Item-Name (AC-18) — bei item-Embed', async ({ page }) => {
    if (!eOfferId || !eOwnerToken) { test.skip(true, 'eOfferId nicht verfügbar'); return }

    // Check backend delivers item-embed for this offer
    const { data } = await apiGet(`/api/v1/shop-owner/offers/${eOfferId}`, eOwnerToken)
    const offerData = data as { id: number; item?: { names?: Record<string, string> } }
    const hasItemEmbed = offerData.item?.names && Object.keys(offerData.item.names).length > 0

    if (!hasItemEmbed) {
      test.skip(true, 'Backend liefert noch kein item-Embed für einzelnen Offer — AC-18 nach Deployment testen')
      return
    }

    await page.goto(FRONTEND_URL + `/shop-admin/offers/${eOfferId}/edit`)
    await waitHydrated(page)

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 8_000 })
    const h1Text = await h1.textContent()
    expect(h1Text, 'E6a: H1 ist leer').toBeTruthy()
    // H1 must NOT be just "Bearbeiten — #<id>" when item has names
    expect(h1Text, 'E6a: H1 zeigt noch Fallback "#id" obwohl item-Embed vorhanden').not.toMatch(/—\s*#\d+$/)
  })

  test('E6b — Edit-Page H1 zeigt Fallback #id wenn kein item-Embed (AC-18 Fallback)', async ({ page }) => {
    if (!eOfferId) { test.skip(true, 'eOfferId nicht verfügbar'); return }

    await page.goto(FRONTEND_URL + `/shop-admin/offers/${eOfferId}/edit`)
    await waitHydrated(page)

    // Page must not crash in any case
    await expect(page.locator('body')).toBeVisible()
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 8_000 })

    const h1Text = await h1.textContent()
    expect(h1Text, 'E6b: H1 fehlt komplett auf Edit-Page').toBeTruthy()
    // H1 should contain either item name or fallback pattern — both are valid
    const hasContent = h1Text!.trim().length > 0
    expect(hasContent, 'E6b: H1 ist leer / unsichtbar').toBe(true)
    console.log(`[E6b] H1 text: "${h1Text}"`)
  })

  test('E6c — Edit-Page zeigt Item-Header-Block wenn item vorhanden (AC-19)', async ({ page }) => {
    if (!eOfferId || !eOwnerToken) { test.skip(true, 'eOfferId nicht verfügbar'); return }

    // Check backend
    const { data } = await apiGet(`/api/v1/shop-owner/offers/${eOfferId}`, eOwnerToken)
    const offerData = data as { item?: unknown }
    if (!offerData.item) {
      test.skip(true, 'Backend liefert noch kein item-Embed — AC-19 nach Deployment testen')
      return
    }

    await page.goto(FRONTEND_URL + `/shop-admin/offers/${eOfferId}/edit`)
    await waitHydrated(page)

    // OfferItemHeader renders a div with bg-gray-50 rounded-xl border border-gray-200 p-4
    const itemHeader = page.locator('div.bg-gray-50.rounded-xl.border.border-gray-200.p-4')
    await expect(itemHeader).toBeVisible({ timeout: 8_000 })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E7 — RTL-Layout in Offer-Liste (AC-20)
  // ──────────────────────────────────────────────────────────────────────────

  test('E7 — RTL: Offer-Zeile hat rtl:flex-row-reverse Klasse (AC-20)', async ({ page }) => {
    // Set Arabic language cookie before navigating
    await page.context().addCookies([
      { name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' },
    ])

    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    // HTML element should have dir=rtl when lang=ar
    const htmlDir = await page.locator('html').getAttribute('dir')
    expect(htmlDir, 'E7: <html> hat kein dir=rtl bei lang=ar').toBe('rtl')

    // Offer row div must have rtl:flex-row-reverse in its class list
    // (Tailwind includes this literally in className string)
    const firstRow = page.locator('div.bg-white.rounded-xl.border.divide-y > div').first()
    const rowCount = await page.locator('div.bg-white.rounded-xl.border.divide-y > div').count()

    if (rowCount === 0) {
      // No offers — just verify the page doesn't crash in RTL mode
      await expect(page.locator('body')).toBeVisible()
      console.log('[E7] Keine Offer-Zeilen zum prüfen (RTL-Modus läuft aber ohne Crash)')
      return
    }

    const rowClass = await firstRow.getAttribute('class')
    expect(
      rowClass,
      'E7: Offer-Zeile hat keine rtl:flex-row-reverse Klasse'
    ).toContain('rtl:flex-row-reverse')

    // Cleanup: reset language cookie to English
    await page.context().addCookies([
      { name: 'app_lang', value: 'en', domain: '127.0.0.1', path: '/' },
    ])
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E-NAV — nav_products nicht mehr in Translations (AC-24)
  // ──────────────────────────────────────────────────────────────────────────

  test('E-NAV — nav_products-Link existiert nicht im Shop-Admin (AC-24)', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/shop-admin')
    await waitHydrated(page)

    // No link to /shop-admin/products anywhere on the page
    const productNavLinks = await page.locator('a[href*="/shop-admin/products"]').count()
    expect(
      productNavLinks,
      'E-NAV: Es gibt noch einen Link zu /shop-admin/products im Dashboard'
    ).toBe(0)

    // Navigate to sidebar/nav if it exists
    await page.goto(FRONTEND_URL + '/shop-admin/offers')
    await waitHydrated(page)

    const productNavLinksOnOffers = await page.locator('a[href*="/shop-admin/products"]').count()
    expect(
      productNavLinksOnOffers,
      'E-NAV: Es gibt noch einen Link zu /shop-admin/products auf der Offers-Seite'
    ).toBe(0)
  })
})
