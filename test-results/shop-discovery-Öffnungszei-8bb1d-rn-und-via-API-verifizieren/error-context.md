# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shop-discovery.spec.ts >> Öffnungszeiten via Admin setzen >> Öffnungszeiten speichern und via API verifizieren
- Location: e2e/shop-discovery.spec.ts:292:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://127.0.0.1:3500/shop-admin/hours", waiting until "load"

```

# Test source

```ts
  195 |     if (!shopSlug) return
  196 |     const state = loadStorageState()
  197 |     await page.goto(`/shops/${shopSlug}`)
  198 |     await expect(page.getByText(state.shop_name, { exact: false }).first()).toBeVisible({ timeout: 10_000 })
  199 |   })
  200 | 
  201 |   test('Shop-Detailseite zeigt Adresse', async ({ page }) => {
  202 |     if (!shopSlug) return
  203 |     const state = loadStorageState()
  204 |     await page.goto(`/shops/${shopSlug}`)
  205 |     // Adresse oder Teil davon soll sichtbar sein (z.B. "Larnaca") — use .first() to avoid strict-mode violation
  206 |     await expect(page.getByText(/larnaca/i).first()).toBeVisible({ timeout: 10_000 })
  207 |   })
  208 | 
  209 |   test('Shop-Detailseite enthält Karten-Element', async ({ page }) => {
  210 |     if (!shopSlug) return
  211 |     await page.goto(`/shops/${shopSlug}`)
  212 |     // Leaflet / Google Maps / OpenStreetMap iframe oder canvas
  213 |     const mapEl = page.locator(
  214 |       '[data-testid="map"], .leaflet-container, iframe[src*="maps"], canvas.mapboxgl-canvas'
  215 |     ).first()
  216 |     // Karte ist optional — nur prüfen ob vorhanden, nicht ob Fehler
  217 |     const count = await mapEl.count()
  218 |     if (count > 0) {
  219 |       await expect(mapEl).toBeVisible({ timeout: 10_000 })
  220 |     }
  221 |   })
  222 | })
  223 | 
  224 | // ─── Shop-Admin: Produkt anlegen → via API abrufbar ──────────────────────────
  225 | 
  226 | test.describe('Shop-Produkt via Admin anlegen', () => {
  227 |   // Nutzt gespeicherten Auth-State des Shop-Owners
  228 |   test.use({
  229 |     storageState: (() => {
  230 |       const stateFile = path.join(__dirname, '.test-state.json')
  231 |       if (fs.existsSync(stateFile)) {
  232 |         return JSON.parse(fs.readFileSync(stateFile, 'utf8')).storageState
  233 |       }
  234 |       return undefined
  235 |     })(),
  236 |   })
  237 | 
  238 |   const PRODUCT_NAME = 'E2E Geo-Test Olivenöl'
  239 | 
  240 |   test('Produkt anlegen und via API abrufen', async ({ page }) => {
  241 |     const state = loadStorageState()
  242 | 
  243 |     // Produkt im Shop-Admin anlegen
  244 |     await page.goto('/shop-admin/products/new')
  245 |     await page.waitForLoadState('networkidle')
  246 |     await page.locator('input[name="name"]').fill(PRODUCT_NAME)
  247 |     // Select first available category (required by backend)
  248 |     const categorySelect = page.locator('select[name="category_id"]')
  249 |     if (await categorySelect.isVisible()) {
  250 |       const opts = await categorySelect.locator('option').count()
  251 |       if (opts > 1) await categorySelect.selectOption({ index: 1 })
  252 |     }
  253 |     await page.locator('input[name="price"]').fill('5.99')
  254 |     await page.locator('input[name="unit"]').fill('l')
  255 |     await page.locator('button[type="submit"]').click()
  256 |     // Use $ anchor to distinguish /shop-admin/products from /shop-admin/products/new
  257 |     await expect(page).toHaveURL(/\/shop-admin\/products$/, { timeout: 10_000 })
  258 |     await expect(page.getByText(PRODUCT_NAME)).toBeVisible()
  259 | 
  260 |     // Kurze Pause für DB-Commit
  261 |     await page.waitForTimeout(500)
  262 | 
  263 |     // Via API prüfen: Produkt gehört dem Shop des Test-Owners
  264 |     const shop = await fetchShopByOwner(state.ownerId)
  265 |     if (shop?.slug ?? shop?.id) {
  266 |       const shopId = shop.id
  267 |       const res = await fetch(`${BACKEND_URL}/api/v1/shops/${shopId}/products`)
  268 |       if (res.ok) {
  269 |         const products = await res.json()
  270 |         const found = (Array.isArray(products) ? products : products?.items ?? []).some(
  271 |           (p: { name?: string }) => (p.name ?? '').includes('Olivenöl')
  272 |         )
  273 |         expect(found, 'Produkt nicht in API gefunden').toBe(true)
  274 |       }
  275 |     }
  276 |   })
  277 | })
  278 | 
  279 | // ─── Öffnungszeiten via Admin setzen → API prüfen ────────────────────────────
  280 | 
  281 | test.describe('Öffnungszeiten via Admin setzen', () => {
  282 |   test.use({
  283 |     storageState: (() => {
  284 |       const stateFile = path.join(__dirname, '.test-state.json')
  285 |       if (fs.existsSync(stateFile)) {
  286 |         return JSON.parse(fs.readFileSync(stateFile, 'utf8')).storageState
  287 |       }
  288 |       return undefined
  289 |     })(),
  290 |   })
  291 | 
  292 |   test('Öffnungszeiten speichern und via API verifizieren', async ({ page }) => {
  293 |     const state = loadStorageState()
  294 | 
> 295 |     await page.goto('/shop-admin/hours')
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  296 |     // Days default to Closed — uncheck the first "Closed" checkbox to reveal time inputs
  297 |     const closedCheckboxes = page.locator('input[type="checkbox"][aria-label*="Closed"]')
  298 |     const firstClosed = closedCheckboxes.first()
  299 |     if (await firstClosed.isChecked()) {
  300 |       await firstClosed.click()
  301 |     }
  302 |     const openInputs = page.locator('input[type="time"][aria-label*="open from"]')
  303 |     await openInputs.first().fill('09:00')
  304 |     const closeInputs = page.locator('input[type="time"][aria-label*="close at"]')
  305 |     await closeInputs.first().fill('18:00')
  306 |     await page.getByRole('button', { name: /save hours|öffnungszeiten speichern/i }).click()
  307 |     await expect(page.getByRole('status')).toContainText(/saved|gespeichert/i, { timeout: 8_000 })
  308 | 
  309 |     // Via API verifizieren
  310 |     const shop = await fetchShopByOwner(state.ownerId)
  311 |     if (shop?.id) {
  312 |       const res = await fetch(`${BACKEND_URL}/api/v1/shops/${shop.id}/hours`)
  313 |       if (res.ok) {
  314 |         const hours = await res.json()
  315 |         // Mindestens ein Slot vorhanden
  316 |         const slots = Array.isArray(hours) ? hours : hours?.items ?? []
  317 |         expect(slots.length).toBeGreaterThan(0)
  318 |       }
  319 |     }
  320 |   })
  321 | })
  322 | 
```