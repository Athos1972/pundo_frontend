/**
 * B5900-001 — Produktanlage hängt bei Mengeneinheiten
 * Minimale Verifikation: API + Page-Load + PriceTierEditor-Dropdown
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'

if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5900-001] Safety: NEVER use production ports!')
}

interface TestState {
  email: string
  password: string
  storageState: { cookies: unknown[]; origins: unknown[] }
}
const STATE: TestState = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '.test-state.json'), 'utf8')
)

test.use({ storageState: STATE.storageState as Parameters<typeof test.use>[0]['storageState'] })

// ─── AC-1: API liefert Einheiten ─────────────────────────────────────────────

test('AC-1 API: price-units endpoint liefert Daten', async () => {
  const res = await fetch(`${BACKEND_URL}/api/v1/price-units`, { signal: AbortSignal.timeout(5000) })
  expect(res.ok).toBe(true)
  const units = await res.json() as Array<{ code: string; label: string }>
  expect(units.length).toBeGreaterThan(0)
  console.log(`AC-1 PASS: ${units.length} price units (${units.map(u => u.code).slice(0, 3).join(', ')}...)`)
})

// ─── AC-2: Seite lädt, Select hat Optionen ───────────────────────────────────

test('AC-2 UI: Neue Offer-Seite lädt, PriceTierEditor hat Einheiten-Optionen', async ({ page }) => {
  // Short timeouts — fail fast if something is broken
  page.setDefaultTimeout(20_000)

  // Direkte API-Route für Offer-Erstellung nutzen, dann Edit-Seite öffnen
  const token = await (async () => {
    const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: STATE.email, password: STATE.password }),
    })
    const h = r.headers.get('set-cookie') ?? ''
    return h.match(/shop_owner_token=([^;]+)/)?.[1] ?? ''
  })()

  expect(token, 'Login fehlgeschlagen').not.toBe('')

  // ShopListing + Offer via API
  const slR = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ item_id: 1 }),
  })
  const slBody = await slR.json() as { id?: number; shop_listing_id?: number; detail?: { shop_listing_id?: number } }
  const shopListingId = slBody.id ?? slBody.shop_listing_id ?? slBody.detail?.shop_listing_id

  if (!shopListingId) { test.skip(true, 'ShopListing not available'); return }

  const ofR = await fetch(`${BACKEND_URL}/api/v1/shop-owner/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ shop_listing_id: shopListingId, price_type: 'on_request', price_tiers: [] }),
  })
  const ofBody = await ofR.json() as { id?: number }
  const offerId = ofBody.id
  if (!offerId) { test.skip(true, 'Offer could not be created'); return }

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
  await page.waitForTimeout(300)

  // "Add pricing unit" Button klicken
  const addTierBtn = page.getByRole('button', { name: /add pricing unit|preiseinheit hinzufügen/i }).first()
  await expect(addTierBtn).toBeVisible({ timeout: 5_000 })
  await addTierBtn.click()
  await page.waitForTimeout(400)

  // Unit-Dropdown prüfen
  const allSelects = page.locator('select')
  const count = await allSelects.count()
  expect(count).toBeGreaterThanOrEqual(2)
  const unitSelect = allSelects.last()
  const optCount = await unitSelect.evaluate((el: HTMLSelectElement) => el.options.length)
  expect(optCount, `Unit-Dropdown hat nur ${optCount} Option(en)`).toBeGreaterThan(2)
  console.log(`AC-2 PASS: Unit-Dropdown hat ${optCount} Optionen`)

  // Cleanup
  await fetch(`${BACKEND_URL}/api/v1/shop-owner/offers/${offerId}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {})
})
