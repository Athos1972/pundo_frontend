# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shop-discovery.spec.ts >> Shop-Detailseite >> Shop-Detailseite lädt ohne Fehler
- Location: e2e/shop-discovery.spec.ts:183:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://127.0.0.1:3500/shops/e2e-test-shop-larnaca-1", waiting until "load"

```

# Test source

```ts
  90  | 
  91  | // ─── Shop-Listing (Customer) ──────────────────────────────────────────────────
  92  | 
  93  | test.describe('Shop-Listing', () => {
  94  |   test('Shops-Seite lädt ohne Fehler', async ({ page }) => {
  95  |     const errors: string[] = []
  96  |     page.on('pageerror', e => errors.push(e.message))
  97  |     await page.goto('/shops')
  98  |     // Lädt ohne JS-Crash
  99  |     expect(errors).toHaveLength(0)
  100 |   })
  101 | 
  102 |   test('Test-Shop erscheint in der Shops-Übersicht', async ({ page }) => {
  103 |     const state = loadStorageState()
  104 |     await page.goto('/shops')
  105 |     await page.waitForLoadState('networkidle')
  106 |     // The /shops page shows nearby shops — requires geo-coordinates (geocoding service).
  107 |     // If no shop cards are visible, the test shop has no coordinates yet → skip gracefully.
  108 |     const shopCards = page.locator('[data-testid="shop-card"], .shop-card, article').first()
  109 |     const hasCards = await shopCards.isVisible().catch(() => false)
  110 |     if (!hasCards) return
  111 |     // Der Test-Shop-Name soll irgendwo auf der Seite erscheinen
  112 |     await expect(page.getByText(state.shop_name, { exact: false })).toBeVisible({ timeout: 10_000 })
  113 |   })
  114 | })
  115 | 
  116 | // ─── Suche ────────────────────────────────────────────────────────────────────
  117 | 
  118 | test.describe('Shop-Suche', () => {
  119 |   test('Textsuche nach Shop-Name findet den Test-Shop', async ({ page }) => {
  120 |     const state = loadStorageState()
  121 |     await page.goto('/')
  122 | 
  123 |     // Suchfeld befüllen
  124 |     const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="Search"], input[placeholder*="Such"]').first()
  125 |     await expect(searchInput).toBeVisible({ timeout: 8_000 })
  126 |     await searchInput.fill(state.shop_name)
  127 |     await searchInput.press('Enter')
  128 | 
  129 |     // Auf Suchergebnis-Seite warten
  130 |     await page.waitForURL(/\/(search|shops)/, { timeout: 10_000 })
  131 |     await page.waitForLoadState('networkidle')
  132 | 
  133 |     // If shop name not found in results (products indexed by shop name may not exist), skip
  134 |     const found = await page.getByText(state.shop_name, { exact: false }).count()
  135 |     if (found === 0) return
  136 |     await expect(page.getByText(state.shop_name, { exact: false })).toBeVisible()
  137 |   })
  138 | 
  139 |   test('API-Suche nach Shop-Name findet den Test-Shop', async () => {
  140 |     const state = loadStorageState()
  141 |     // Direkt über API suchen – unabhängig von Frontend-Rendering
  142 |     const results = await searchShopsApi(state.shop_name)
  143 |     const found = results.some(
  144 |       (s: { name?: string; shop_name?: string }) =>
  145 |         (s.name ?? s.shop_name ?? '').toLowerCase().includes(state.shop_name.toLowerCase())
  146 |     )
  147 |     expect(found, `Shop "${state.shop_name}" nicht in Suchergebnissen`).toBe(true)
  148 |   })
  149 | 
  150 |   test('Geo-Suche in der Nähe von Larnaca liefert Test-Shop', async () => {
  151 |     // Larnaca-Koordinaten: 34.9°N, 33.6°E, 5km Radius
  152 |     const res = await fetch(
  153 |       `${BACKEND_URL}/api/v1/shops/nearby?lat=34.9&lng=33.6&radius_km=5`
  154 |     )
  155 |     if (!res.ok) {
  156 |       // Endpoint optional or not yet implemented – Test überspringen
  157 |       return
  158 |     }
  159 |     const data = await res.json()
  160 |     const shops: Array<{ name?: string; shop_name?: string }> = Array.isArray(data) ? data : data?.items ?? []
  161 |     // If no shops are returned (e.g. geocoding not configured), skip rather than fail
  162 |     if (shops.length === 0) return
  163 |     const state = loadStorageState()
  164 |     const found = shops.some(s =>
  165 |       (s.name ?? s.shop_name ?? '').toLowerCase().includes(state.shop_name.toLowerCase())
  166 |     )
  167 |     expect(found, 'Test-Shop nicht in Geo-Suche gefunden').toBe(true)
  168 |   })
  169 | })
  170 | 
  171 | // ─── Shop-Detailseite ─────────────────────────────────────────────────────────
  172 | 
  173 | test.describe('Shop-Detailseite', () => {
  174 |   let shopSlug: string | null = null
  175 | 
  176 |   test.beforeAll(async () => {
  177 |     const state = loadStorageState()
  178 |     // Use slug saved by global-setup (avoids owner_id lookup via public API which doesn't support that filter)
  179 |     shopSlug = (state as Record<string, unknown>).shopSlug as string | null
  180 |       ?? (await fetchShopByOwner(state.ownerId))?.slug ?? null
  181 |   })
  182 | 
  183 |   test('Shop-Detailseite lädt ohne Fehler', async ({ page }) => {
  184 |     if (!shopSlug) {
  185 |       console.warn('[shop-discovery] Kein Shop-Slug gefunden, Detailseiten-Test übersprungen')
  186 |       return
  187 |     }
  188 |     const errors: string[] = []
  189 |     page.on('pageerror', e => errors.push(e.message))
> 190 |     await page.goto(`/shops/${shopSlug}`)
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  191 |     expect(errors).toHaveLength(0)
  192 |   })
  193 | 
  194 |   test('Shop-Detailseite zeigt Shop-Name', async ({ page }) => {
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
```