/**
 * B5900-001 — Produktanlage hängt bei Mengeneinheiten
 * Minimale Verifikation: API + Page-Load + PriceTierEditor-Dropdown
 */

import { test, expect } from './_helpers/worker-shop'
import { BASE_URL as FRONTEND_URL, BACKEND_URL } from '../env'


if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5900-001] Safety: NEVER use production ports!')
}

// B8950-012: läuft im Worker-Shop (storageState aus der Fixture) mit eigenem Marker-Item
// statt eines echten Prod-Items; keine stillen Skips.
test.afterAll(async ({ workerShop }) => {
  await workerShop.cleanupSpecData()
})

// ─── AC-1: API liefert Einheiten ─────────────────────────────────────────────

test('AC-1 API: price-units endpoint liefert Daten', async () => {
  const res = await fetch(`${BACKEND_URL}/api/v1/price-units`, { signal: AbortSignal.timeout(5000) })
  expect(res.ok).toBe(true)
  const units = await res.json() as Array<{ code: string; label: string }>
  expect(units.length).toBeGreaterThan(0)
  console.log(`AC-1 PASS: ${units.length} price units (${units.map(u => u.code).slice(0, 3).join(', ')}...)`)
})

// ─── AC-2: Seite lädt, Select hat Optionen ───────────────────────────────────

test('AC-2 UI: Neue Offer-Seite lädt, PriceTierEditor hat Einheiten-Optionen', async ({ page, workerShop }) => {
  // Short timeouts — fail fast if something is broken
  page.setDefaultTimeout(20_000)

  // Eigenes Marker-Item + Listing + Offer via Owner-API (Impersonation-Token des Worker-Shops)
  const { listingId } = await workerShop.createItem('B5900-001', 'units', { listing: true })
  const ofR = await workerShop.api<{ id?: number }>('POST', '/offers', {
    shop_listing_id: listingId, price_type: 'on_request', price_tiers: [],
  })
  expect(ofR.status, ofR.text).toBe(201)
  const offerId = ofR.json.id as number

  console.log(`[AC-2] Offer ${offerId} erstellt, navigiere zu Edit-Seite...`)

  // Edit-Seite navigieren
  await page.goto(`${FRONTEND_URL}/shop-admin/offers/${offerId}/edit`, { waitUntil: 'domcontentloaded' })
  console.log('[AC-2] Page loaded')

  // Auf Form warten
  const form = page.locator('form')
  await expect(form).toBeVisible({ timeout: 15_000 })
  console.log('[AC-2] Form sichtbar')

  // Price-Type auf fixed setzen
  const priceTypeSelect = page.locator('select').first()
  await expect(priceTypeSelect).toBeVisible({ timeout: 5_000 })
  await priceTypeSelect.selectOption('fixed')

  // "Add pricing unit" Button klicken
  const addTierBtn = page.getByRole('button', { name: /add pricing unit|preiseinheit hinzufügen/i }).first()
  await expect(addTierBtn).toBeVisible({ timeout: 5_000 })
  await addTierBtn.click()
  await expect.poll(() => page.locator('select').count(), { message: 'Preiseinheit-Select erscheint' }).toBeGreaterThanOrEqual(2)

  // Unit-Dropdown prüfen
  const allSelects = page.locator('select')
  const count = await allSelects.count()
  expect(count).toBeGreaterThanOrEqual(2)
  const unitSelect = allSelects.last()
  const optCount = await unitSelect.evaluate((el: HTMLSelectElement) => el.options.length)
  expect(optCount, `Unit-Dropdown hat nur ${optCount} Option(en)`).toBeGreaterThan(2)
  console.log(`AC-2 PASS: Unit-Dropdown hat ${optCount} Optionen`)
})
