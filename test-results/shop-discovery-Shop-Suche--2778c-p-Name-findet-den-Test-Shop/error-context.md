# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shop-discovery.spec.ts >> Shop-Suche >> Textsuche nach Shop-Name findet den Test-Shop
- Location: e2e/shop-discovery.spec.ts:119:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://127.0.0.1:3500/", waiting until "load"

```

# Test source

```ts
  21  | const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
  22  | 
  23  | function loadStorageState() {
  24  |   const stateFile = path.join(__dirname, '.test-state.json')
  25  |   if (!fs.existsSync(stateFile)) {
  26  |     throw new Error(
  27  |       '[shop-discovery] .test-state.json nicht gefunden. ' +
  28  |       'Bitte globalSetup ausführen.'
  29  |     )
  30  |   }
  31  |   return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as {
  32  |     email: string
  33  |     password: string
  34  |     shop_name: string
  35  |     shop_address: string
  36  |     ownerId: number
  37  |     storageState: Parameters<typeof test.use>[0]['storageState']
  38  |   }
  39  | }
  40  | 
  41  | // Helper: Fetch shop data directly from API
  42  | // Returns the first shop with an address (to skip the price_type seed shop which has no address).
  43  | async function fetchShopByOwner(ownerId: number) {
  44  |   const res = await fetch(`${BACKEND_URL}/api/v1/shops?owner_id=${ownerId}&limit=20`)
  45  |   if (!res.ok) return null
  46  |   const data = await res.json()
  47  |   const items: Array<Record<string, unknown>> = Array.isArray(data) ? data : data?.items ?? []
  48  |   // Prefer shop with address_raw set (the e2e registration shop)
  49  |   return items.find(s => s.address_raw) ?? items[0] ?? null
  50  | }
  51  | 
  52  | // Helper: Search shops by name
  53  | async function searchShopsApi(query: string) {
  54  |   const res = await fetch(`${BACKEND_URL}/api/v1/shops?q=${encodeURIComponent(query)}&limit=20`)
  55  |   if (!res.ok) return []
  56  |   const data = await res.json()
  57  |   return Array.isArray(data) ? data : data?.items ?? []
  58  | }
  59  | 
  60  | // ─── Geocoding ────────────────────────────────────────────────────────────────
  61  | 
  62  | test.describe('Geocoding', () => {
  63  |   test('Test-Shop hat nach Approval Geo-Koordinaten', async () => {
  64  |     const state = loadStorageState()
  65  | 
  66  |     // Kurze Pause, damit der Backend-Geocoder nach dem Register/Approve laufen konnte
  67  |     await new Promise(r => setTimeout(r, 2000))
  68  | 
  69  |     const shop = await fetchShopByOwner(state.ownerId)
  70  |     expect(shop, 'Shop nicht in API gefunden').toBeTruthy()
  71  | 
  72  |     // Adresse gesetzt (API uses address_raw)
  73  |     expect(shop.address_raw ?? shop.address ?? shop.shop_address).toBeTruthy()
  74  | 
  75  |     // Koordinaten: lat und lng müssen vorhanden und plausibel sein (API uses location.lat/lng)
  76  |     const lat = shop.location?.lat ?? shop.lat ?? shop.latitude
  77  |     const lng = shop.location?.lng ?? shop.lng ?? shop.longitude
  78  |     // If geocoding service is not configured in test env, skip coordinate check
  79  |     if (lat === null || lat === undefined) test.skip()
  80  |     expect(typeof lat).toBe('number')
  81  |     expect(typeof lng).toBe('number')
  82  | 
  83  |     // Larnaca, Cyprus: lat ~34.9, lng ~33.6
  84  |     expect(lat).toBeGreaterThan(34)
  85  |     expect(lat).toBeLessThan(36)
  86  |     expect(lng).toBeGreaterThan(33)
  87  |     expect(lng).toBeLessThan(35)
  88  |   })
  89  | })
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
> 121 |     await page.goto('/')
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
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
  190 |     await page.goto(`/shops/${shopSlug}`)
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
```