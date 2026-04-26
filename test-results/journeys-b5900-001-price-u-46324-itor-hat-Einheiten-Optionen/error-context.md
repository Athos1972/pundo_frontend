# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys/b5900-001-price-units.spec.ts >> AC-2 UI: Neue Offer-Seite lädt, PriceTierEditor hat Einheiten-Optionen
- Location: e2e/journeys/b5900-001-price-units.spec.ts:40:5

# Error details

```
Error: Login fehlgeschlagen

expect(received).not.toBe(expected) // Object.is equality

Expected: not ""
```

# Test source

```ts
  1   | /**
  2   |  * B5900-001 — Produktanlage hängt bei Mengeneinheiten
  3   |  * Minimale Verifikation: API + Page-Load + PriceTierEditor-Dropdown
  4   |  */
  5   | 
  6   | import { test, expect } from '@playwright/test'
  7   | import fs from 'fs'
  8   | import path from 'path'
  9   | 
  10  | const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
  11  | const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
  12  | 
  13  | if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  14  |   throw new Error('[b5900-001] Safety: NEVER use production ports!')
  15  | }
  16  | 
  17  | interface TestState {
  18  |   email: string
  19  |   password: string
  20  |   storageState: { cookies: unknown[]; origins: unknown[] }
  21  | }
  22  | const STATE: TestState = JSON.parse(
  23  |   fs.readFileSync(path.join(__dirname, '..', '.test-state.json'), 'utf8')
  24  | )
  25  | 
  26  | test.use({ storageState: STATE.storageState as Parameters<typeof test.use>[0]['storageState'] })
  27  | 
  28  | // ─── AC-1: API liefert Einheiten ─────────────────────────────────────────────
  29  | 
  30  | test('AC-1 API: price-units endpoint liefert Daten', async () => {
  31  |   const res = await fetch(`${BACKEND_URL}/api/v1/price-units`, { signal: AbortSignal.timeout(5000) })
  32  |   expect(res.ok).toBe(true)
  33  |   const units = await res.json() as Array<{ code: string; label: string }>
  34  |   expect(units.length).toBeGreaterThan(0)
  35  |   console.log(`AC-1 PASS: ${units.length} price units (${units.map(u => u.code).slice(0, 3).join(', ')}...)`)
  36  | })
  37  | 
  38  | // ─── AC-2: Seite lädt, Select hat Optionen ───────────────────────────────────
  39  | 
  40  | test('AC-2 UI: Neue Offer-Seite lädt, PriceTierEditor hat Einheiten-Optionen', async ({ page }) => {
  41  |   // Short timeouts — fail fast if something is broken
  42  |   page.setDefaultTimeout(20_000)
  43  | 
  44  |   // Direkte API-Route für Offer-Erstellung nutzen, dann Edit-Seite öffnen
  45  |   const token = await (async () => {
  46  |     const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
  47  |       method: 'POST',
  48  |       headers: { 'Content-Type': 'application/json' },
  49  |       body: JSON.stringify({ email: STATE.email, password: STATE.password }),
  50  |     })
  51  |     const h = r.headers.get('set-cookie') ?? ''
  52  |     return h.match(/shop_owner_token=([^;]+)/)?.[1] ?? ''
  53  |   })()
  54  | 
> 55  |   expect(token, 'Login fehlgeschlagen').not.toBe('')
      |                                             ^ Error: Login fehlgeschlagen
  56  | 
  57  |   // ShopListing + Offer via API
  58  |   const slR = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings`, {
  59  |     method: 'POST',
  60  |     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  61  |     body: JSON.stringify({ item_id: 1 }),
  62  |   })
  63  |   const slBody = await slR.json() as { id?: number; shop_listing_id?: number; detail?: { shop_listing_id?: number } }
  64  |   const shopListingId = slBody.id ?? slBody.shop_listing_id ?? slBody.detail?.shop_listing_id
  65  | 
  66  |   if (!shopListingId) { test.skip(true, 'ShopListing not available'); return }
  67  | 
  68  |   const ofR = await fetch(`${BACKEND_URL}/api/v1/shop-owner/offers`, {
  69  |     method: 'POST',
  70  |     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  71  |     body: JSON.stringify({ shop_listing_id: shopListingId, price_type: 'on_request', price_tiers: [] }),
  72  |   })
  73  |   const ofBody = await ofR.json() as { id?: number }
  74  |   const offerId = ofBody.id
  75  |   if (!offerId) { test.skip(true, 'Offer could not be created'); return }
  76  | 
  77  |   console.log(`[AC-2] Offer ${offerId} erstellt, navigiere zu Edit-Seite...`)
  78  | 
  79  |   // Edit-Seite navigieren
  80  |   await page.goto(`${FRONTEND_URL}/shop-admin/offers/${offerId}/edit`, { waitUntil: 'domcontentloaded' })
  81  |   console.log('[AC-2] Page loaded')
  82  | 
  83  |   // Auf Form warten
  84  |   const form = page.locator('form')
  85  |   await expect(form).toBeVisible({ timeout: 15_000 })
  86  |   console.log('[AC-2] Form sichtbar')
  87  | 
  88  |   // Price-Type auf fixed setzen
  89  |   const priceTypeSelect = page.locator('select').first()
  90  |   await expect(priceTypeSelect).toBeVisible({ timeout: 5_000 })
  91  |   await priceTypeSelect.selectOption('fixed')
  92  |   await page.waitForTimeout(300)
  93  | 
  94  |   // "Add pricing unit" Button klicken
  95  |   const addTierBtn = page.getByRole('button', { name: /add pricing unit|preiseinheit hinzufügen/i }).first()
  96  |   await expect(addTierBtn).toBeVisible({ timeout: 5_000 })
  97  |   await addTierBtn.click()
  98  |   await page.waitForTimeout(400)
  99  | 
  100 |   // Unit-Dropdown prüfen
  101 |   const allSelects = page.locator('select')
  102 |   const count = await allSelects.count()
  103 |   expect(count).toBeGreaterThanOrEqual(2)
  104 |   const unitSelect = allSelects.last()
  105 |   const optCount = await unitSelect.evaluate((el: HTMLSelectElement) => el.options.length)
  106 |   expect(optCount, `Unit-Dropdown hat nur ${optCount} Option(en)`).toBeGreaterThan(2)
  107 |   console.log(`AC-2 PASS: Unit-Dropdown hat ${optCount} Optionen`)
  108 | 
  109 |   // Cleanup
  110 |   await fetch(`${BACKEND_URL}/api/v1/shop-owner/offers/${offerId}`, {
  111 |     method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  112 |   }).catch(() => {})
  113 | })
  114 | 
```