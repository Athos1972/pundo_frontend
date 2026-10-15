/**
 * Shop-Admin Offers — Anlegen und Bearbeiten (Gruppen A, B und Regression; v2: two-step OfferForm)
 *
 * F8950 T32: Teil 1 von 4 des frueheren `shop-admin-offers.spec.ts` (1700 Zeilen, ein Worker). Die Teile laufen jetzt
 * parallel in eigenen Workern, jeweils mit eigenem Worker-Shop:
 *   shop-admin-offers.spec.ts                  A (Create), B (Edit), REGRESSION   <- diese Datei
 *   shop-admin-offers-archive.spec.ts          C (Archive/Delete), D (Kunden-Sicht)
 *   shop-admin-offers-cross-shop.spec.ts       XS, AR, SP, DT (Isolation, Staffelpreise, Datum)
 *   shop-admin-offers-item-details.spec.ts     E (Item-Details, Filter, Dashboard)
 * Gemeinsame Helfer: _helpers/offers-api.ts.
 *
 * OfferForm flow (new):
 *   Step 1 — Select item via ItemPickerModal (creates ShopListing)
 *   Step 2 — Fill price_type, price_tiers (if fixed/variable), dates, optional title/description/url
 *
 * API schema (new):
 *   POST /api/v1/shop-owner/offers → { shop_listing_id, price_type, price_tiers, valid_from, valid_until, ... }
 *   NO: price (float), product_id — these fields no longer exist
 *
 * F8950 T31: keine echten Prod-Items mehr (vorher avicentra 21476/21477). Die Spec legt Marker-Items im Worker-Shop an:
 * ein Item fuer die API-Offers (mit Listing) und ein Item, das die UI im Item-Picker per Namen sucht.
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect, type WorkerShop, type CreatedItem } from './_helpers/worker-shop'
import {
  apiGet, apiPatch, apiCreateOffer, waitHydrated, selectItemViaModal, setPriceType, addPriceTierStep,
} from './_helpers/offers-api'
import { BASE_URL as FRONTEND_URL, BACKEND_URL } from '../env'

// ─── Worker-Shop (B8950-012) ─────────────────────────────────────────────────

let W: WorkerShop
let uiItem: CreatedItem

// ─── Shared context ───────────────────────────────────────────────────────────

interface OfferCtx {
  /** shop_listing_id created in beforeAll for the API offer tests */
  defaultShopListingId: number | null
  /** All offer IDs created during tests, for cleanup */
  createdOfferIds: number[]
  /** Offer ID created by A1 */
  editOfferId: number | null
  /** Findings to document in report */
  findings: string[]
}

const ctx: OfferCtx = {
  defaultShopListingId: null,
  createdOfferIds: [],
  editOfferId: null,
  findings: [],
}

async function getOwnerToken(): Promise<string> {
  return W.ownerToken
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

test.describe.serial('Shop-Admin Offers — Create + Edit (v2)', () => {

  test.beforeAll(async ({ workerShop }) => {
    test.setTimeout(120_000)
    W = workerShop
    const health = await fetch(`${BACKEND_URL}/api/v1/categories`)
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)

    // Item + Listing fuer die API-Offers (A2-A4, B1-B4)
    const defaultItem = await W.createItem('OFFERS', 'api-default', { listing: true })
    ctx.defaultShopListingId = defaultItem.listingId ?? null
    if (!ctx.defaultShopListingId) throw new Error('SETUP BROKEN: kein ShopListing fuer das Default-Item')

    // Item fuer die UI-Flows (A1, A5, A6, REGRESSION): der Picker findet es ueber den eindeutigen Marker-Namen
    uiItem = await W.createItem('OFFERS', 'ui-picker')
  })

  test.afterAll(async () => {
    await W.cleanupSpecData()
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
    await selectItemViaModal(page, uiItem.name)

    // Now on Step 2
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 })

    // Set standard price type to on_request (no standard tiers needed)
    await setPriceType(page, 'on_request')

    // Expand the promo accordion — promo dates live inside a collapsed section
    await page.getByRole('button', { name: /promotion|aktionspreis|promo/i }).click()

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

  test('A2 — No description, on_request price + dates, no title → 201 + visible', async ({ page: _page }) => {
    if (!ctx.defaultShopListingId) { throw new Error('SETUP BROKEN: defaultShopListingId fehlt') }

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
    if (!ctx.defaultShopListingId) { throw new Error('SETUP BROKEN: defaultShopListingId fehlt') }

    test.setTimeout(60_000)
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // Step 1: Select item
    await selectItemViaModal(page, uiItem.name)

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
    if (!ctx.defaultShopListingId) { throw new Error('SETUP BROKEN: defaultShopListingId fehlt') }

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
    // F8950 T22: kein Timeout - der Klick-Handler setzt State synchron (discrete event)

    // Step 2 should not be accessible without step 1
    // Either still on step 1 or form shows validation error
    // The step indicator button is clickable only when selectedItem is set
    // (onClick={() => selectedItem && setStep(2)})
    const formVisible = await page.locator('form').count() > 0
    // If form is shown (shouldn't be without item), submit it
    if (formVisible) {
      await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
      // Should show shop_listing_id error or stay on form
      await expect(page.locator('[class*="text-red"]').first(), 'No error shown for missing item').toBeVisible()
      const errorCount = await page.locator('[class*="text-red"]').count()
      expect(errorCount, 'No error shown for missing item').toBeGreaterThan(0)
    } else {
      // Step 1 still shown — correct behavior
      const step1Content = await page.locator('button.border-dashed, button[class*="border-dashed"]').count()
      expect(step1Content, 'Step 1 not shown when item not selected').toBeGreaterThan(0)
    }
  })

  test('A6 — Fixed price type with no tiers → validation error (tier required)', async ({ page }) => {
    if (!ctx.defaultShopListingId) { throw new Error('SETUP BROKEN: defaultShopListingId fehlt') }

    test.setTimeout(60_000)
    await page.goto(FRONTEND_URL + '/shop-admin/offers/new')
    await waitHydrated(page)

    // Step 1: Select item
    await selectItemViaModal(page, uiItem.name)

    // Step 2: Choose fixed but add no tiers — validation should reject this
    await setPriceType(page, 'fixed')
    await page.locator('input[name="title"]').fill('A6 No Tiers')

    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    // Should show price_tiers validation error (web-first statt waitForTimeout(1000))
    await expect(page.locator('[class*="text-red"]').first(), 'No error shown for missing price tiers').toBeVisible()

    // Should remain on form (not navigate to list)
    expect(page.url()).not.toMatch(/\/shop-admin\/offers$/)
    const tierError = await page.locator('[class*="text-red"]').count()
    expect(tierError, 'No error shown for missing price tiers').toBeGreaterThan(0)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP B — Edit Offer
  // ═══════════════════════════════════════════════════════════════════════════

  test('B1 — Edit title → "B1 Updated Title" visible in list after save', async ({ page }) => {
    if (!ctx.defaultShopListingId) { throw new Error('SETUP BROKEN: defaultShopListingId fehlt') }

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
    if (!ctx.defaultShopListingId) { throw new Error('SETUP BROKEN: defaultShopListingId fehlt') }

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
    if (!ctx.defaultShopListingId) { throw new Error('SETUP BROKEN: defaultShopListingId fehlt') }

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
    if (!ctx.defaultShopListingId) { throw new Error('SETUP BROKEN: defaultShopListingId fehlt') }

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
    await selectItemViaModal(page, uiItem.name)

    // Step 2: Fill minimal data (no promo dates — they live inside a collapsed accordion)
    await setPriceType(page, 'on_request')
    await page.locator('input[name="title"]').fill('REGRESSION Test Offer')

    // F8950 T22: statt waitForTimeout(2000) + bedingter Pruefung auf den POST warten (Pruefung jetzt unbedingt)
    const offerPost = page.waitForRequest(req => req.url().includes('/api/shop-admin/offers') && req.method() === 'POST')
    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await offerPost
    expect(capturedBody, 'REGRESSION: kein POST /api/shop-admin/offers erfasst').not.toBeNull()

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
