/**
 * Gemeinsame Helfer der Shop-Admin-Offers-Specs (F8950 T32: aus dem frueheren 1700-Zeilen-File `shop-admin-offers.spec.ts`
 * herausgeloest; die vier Specs `shop-admin-offers*.spec.ts` nutzen sie). Owner-API-Aufrufe per Bearer-Token.
 */
import { expect, type Page } from '@playwright/test'
import { BACKEND_URL } from '../../env'
import { openItemPickerModal } from './hydration'

export const TODAY_ISO = new Date().toISOString().slice(0, 10)

export function daysFromToday(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export async function apiGet(urlPath: string, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: res.status, data: res.status !== 204 ? await res.json() : {} }
}

export async function apiPost(urlPath: string, body: unknown, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: res.status !== 204 ? await res.json() : {} }
}

export async function apiPatch(urlPath: string, body: unknown, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: res.status !== 204 ? await res.json() : {} }
}

export async function apiDelete(urlPath: string, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: res.status }
}

/** Create a ShopListing for the given item. Returns shop_listing_id, or null on failure (e.g. 422 if item_id not in catalog). */
export async function getOrCreateShopListing(token: string, itemId: number): Promise<number | null> {
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

/** YYYY-MM-DD for today + `days` (UTC). */
function isoDay(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

/** Create a minimal offer via API with new schema. */
export async function apiCreateOffer(
  token: string,
  shopListingId: number,
  overrides: Record<string, unknown> = {}
): Promise<{ status: number; data: { id: number } }> {
  return apiPost('/api/v1/shop-owner/offers', {
    shop_listing_id: shopListingId,
    price_type: 'on_request',
    price_tiers: [],
    // Relative to today: a fixed date silently turned every default offer into an expired one.
    valid_from: isoDay(-30),
    valid_until: isoDay(365),
    ...overrides,
  }, token) as Promise<{ status: number; data: { id: number } }>
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export async function waitHydrated(page: Page) {
  await page.waitForLoadState('load')
  await page.waitForSelector('body[data-hydrated="true"]', { timeout: 15_000 }).catch(() => {})
}

/**
 * UI helper: complete Step 1 of the OfferForm.
 * Clicks the border-dashed "Select item" button, types a search query,
 * waits for results and clicks the first one.
 */
export async function selectItemViaModal(page: Page, searchQuery: string) {
  // Click the dashed "Select item" button in Step 1
  await openItemPickerModal(page.locator('button.border-dashed, button[class*="border-dashed"]'))

  // Wait for modal to appear
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 })

  // Type in the text search field (second input in the modal, after EAN)
  const textInputs = page.getByRole('dialog').locator('input[type="text"]')
  // Second input is the name search (first is EAN)
  const searchInput = textInputs.nth(1)
  // F8950 T22: statt waitForTimeout(500) auf die debounced Such-Antwort (300 ms Debounce) warten
  const searchResponse = page.waitForResponse(
    r => r.url().includes(`/api/shop-admin/items?q=${encodeURIComponent(searchQuery.trim())}`),
  )
  await searchInput.fill(searchQuery)
  await searchResponse

  // Click the first result button in the list
  const resultButtons = page.getByRole('dialog').locator('ul li button')
  await expect(resultButtons.first()).toBeVisible({ timeout: 8_000 })
  await resultButtons.first().click()

  // After click: ShopListing is created, step advances to 2
  await page.waitForLoadState('load')
}

/** Select price type in Step 2. */
export async function setPriceType(page: Page, priceType: string) {
  await page.locator('select').first().selectOption(priceType)
}

/** Add one fixed-price tier with given price.
 *
 * emptyTier() already includes 1 step — clicking "Add step" would create a
 * second step whose price stays empty and causes frontend validation to fail.
 * We only: add the tier, select unit 'piece', fill the first step's price.
 */
export async function addPriceTierStep(page: Page, price: string) {
  // 1. Click "Add pricing unit" → tier with 1 step is created
  const addTierBtn = page.getByRole('button', { name: /add pricing unit|preiseinheit hinzufügen/i })
  await expect(addTierBtn.first()).toBeVisible({ timeout: 5_000 })
  await addTierBtn.first().click()

  // 2. Select unit 'piece' from the tier's unit <select> (second select: first is price_type)
  // F8950 T22: statt waitForTimeout(300) warten, bis der Tier gerendert ist (zweites <select> erscheint)
  const selects = page.locator('select')
  await expect.poll(() => selects.count(), { message: 'Preiseinheit-Select erscheint' }).toBeGreaterThanOrEqual(2)
  // The unit select is the last select in the form (after price_type select)
  await selects.last().selectOption('per_piece')

  // 3. Fill the price input of the (only) step — inputMode="decimal"
  const priceInputs = page.locator('input[inputmode="decimal"]')
  await expect(priceInputs.first()).toBeVisible({ timeout: 5_000 })
  await priceInputs.first().fill(price)
}
