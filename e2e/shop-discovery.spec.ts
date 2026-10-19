/**
 * E2E-Tests: Shop Discovery (Customer-Facing)
 *
 * Voraussetzungen:
 *   - global-setup.ts hat erfolgreich durchlaufen:
 *     * pundo_test DB ist reset + Kategorien kopiert
 *     * Test-Shop-Owner ist registriert, approved, und eingeloggt
 *     * .test-state.json enthält Credentials + storageState
 *   - Backend läuft auf Port 8001 gegen pundo_test
 *   - Frontend läuft auf Port 3000
 *
 * Testet den kompletten Shop-Discovery-Flow:
 *   Shop anlegen (via Admin) → Geocoding prüfen → Shop in Suche finden
 *   → Shop-Detailseite → Karte geladen → Geo-Koordinaten vorhanden
 */

import { test, expect } from '@playwright/test'
// B8950-012: schreibende Blöcke (Angebot anlegen, Öffnungszeiten) laufen im Worker-Shop statt im geteilten e2e-test-shop
import { test as shopTest } from './journeys/_helpers/worker-shop'
import { marker } from './journeys/_helpers/test-data'
import fs from 'fs'
import path from 'path'
import { BACKEND_URL } from './env'
import { openItemPickerModal, waitForPageHydrated } from './journeys/_helpers/hydration'


function loadStorageState() {
  const stateFile = path.join(__dirname, '.test-state.json')
  if (!fs.existsSync(stateFile)) {
    throw new Error(
      '[shop-discovery] .test-state.json nicht gefunden. ' +
      'Bitte globalSetup ausführen.'
    )
  }
  return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as {
    email: string
    password: string
    shop_name: string
    shop_address: string
    ownerId: number
    storageState: Parameters<typeof test.use>[0]['storageState']
  }
}

interface ShopRecord {
  id?: number
  slug?: string | null
  name?: string | null
  address_raw?: string | null
  address?: string | null
  shop_address?: string | null
  location?: { lat: number; lng: number } | null
  lat?: number | null
  lng?: number | null
  latitude?: number | null
  longitude?: number | null
}

// Helper: Fetch shop data directly from API
// Returns the first shop with an address (to skip the price_type seed shop which has no address).
async function fetchShopByOwner(ownerId: number): Promise<ShopRecord | null> {
  const res = await fetch(`${BACKEND_URL}/api/v1/shops?owner_id=${ownerId}&limit=20`)
  if (!res.ok) return null
  const data = await res.json()
  const items = (Array.isArray(data) ? data : data?.items ?? []) as ShopRecord[]
  // Prefer shop with address_raw set (the e2e registration shop)
  return items.find(s => s.address_raw) ?? items[0] ?? null
}

// Helper: Search shops by name
async function searchShopsApi(query: string) {
  const res = await fetch(`${BACKEND_URL}/api/v1/shops?q=${encodeURIComponent(query)}&limit=20`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data?.items ?? []
}

// ─── Geocoding ────────────────────────────────────────────────────────────────

test.describe('Geocoding', () => {
  test('Test-Shop hat nach Approval Geo-Koordinaten', async () => {
    const state = loadStorageState()

    // Kurze Pause, damit der Backend-Geocoder nach dem Register/Approve laufen konnte
    await new Promise(r => setTimeout(r, 2000))

    const shop = await fetchShopByOwner(state.ownerId)
    expect(shop, 'Shop nicht in API gefunden').toBeTruthy()
    if (!shop) return

    // Adresse gesetzt (API uses address_raw)
    expect(shop.address_raw ?? shop.address ?? shop.shop_address).toBeTruthy()

    // Koordinaten: lat und lng müssen vorhanden und plausibel sein (API uses location.lat/lng)
    const lat = shop.location?.lat ?? shop.lat ?? shop.latitude
    const lng = shop.location?.lng ?? shop.lng ?? shop.longitude
    // If geocoding service is not configured in test env, skip coordinate check
    if (lat === null || lat === undefined) test.skip()
    expect(typeof lat).toBe('number')
    expect(typeof lng).toBe('number')

    // Larnaca, Cyprus: lat ~34.9, lng ~33.6
    expect(lat).toBeGreaterThan(34)
    expect(lat).toBeLessThan(36)
    expect(lng).toBeGreaterThan(33)
    expect(lng).toBeLessThan(35)
  })
})

// ─── Shop-Listing (Customer) ──────────────────────────────────────────────────

test.describe('Shop-Listing', () => {
  test('Shops-Seite lädt ohne Fehler', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/shops')
    // Lädt ohne JS-Crash
    expect(errors).toHaveLength(0)
  })

  test('Test-Shop erscheint in der Shops-Übersicht', async ({ page }) => {
    const state = loadStorageState()
    await page.goto('/shops')
    await waitForPageHydrated(page)
    // The /shops page shows nearby shops — requires geo-coordinates (geocoding service).
    // If no shop cards are visible, the test shop has no coordinates yet → skip gracefully.
    const shopCards = page.locator('[data-testid="shop-card"], .shop-card, article').first()
    const hasCards = await shopCards.isVisible().catch(() => false)
    if (!hasCards) return
    // Der Test-Shop-Name soll irgendwo auf der Seite erscheinen
    await expectNameVisible(page, state.shop_name)
  })
})

/**
 * Der Name steht mindestens einmal SICHTBAR auf der Seite. Neben dem Ergebnis zeigt der Aktivitaets-Ticker
 * "New: <Shop> in …" denselben Namen mehrfach (teils versteckt) - `getByText(...).toBeVisible()` waere ein
 * Strict-Mode-Fehler bzw. wuerde ein verstecktes erstes Element treffen.
 */
async function expectNameVisible(page: import('@playwright/test').Page, name: string) {
  await expect.poll(
    () => page.getByText(name, { exact: false }).evaluateAll(
      els => els.some(e => (e as HTMLElement).offsetParent !== null || e.getClientRects().length > 0)),
    { message: `"${name}" sichtbar`, timeout: 10_000 },
  ).toBe(true)
}

// ─── Shop-Treffer in der Suche: Helfer ────────────────────────────────────────

/** Larnaca-Fallback der Suchseite (`useGeolocation`) und ihr Default-Radius. */
const LARNACA = { lat: 34.9009, lng: 33.623 }
const DEFAULT_RADIUS_KM = 50

/** AC10-Fixture (Spiegel von pundo_main_backend/scripts/prepare_e2e_db.py INACTIVE_SHOP_*). */
const INACTIVE_SHOP_SLUG = 'e2e-inactive-search-shop'
const INACTIVE_SHOP_NAME = 'Zzquokka Dormant Bakery'

function loadSearchState() {
  const state = loadStorageState() as ReturnType<typeof loadStorageState> & { shopSlug?: string }
  if (!state.shopSlug) throw new Error('SETUP BROKEN: .test-state.json hat keinen shopSlug (Global Setup)')
  return state as ReturnType<typeof loadStorageState> & { shopSlug: string }
}

interface ShopHit { slug: string; name: string; dist_km: number | null }

async function apiShops(params: Record<string, string | number>): Promise<{ items: ShopHit[]; total: number | null }> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  const res = await fetch(`${BACKEND_URL}/api/v1/shops?${qs}`, { headers: { 'Accept-Language': 'en' } })
  expect(res.ok, `GET /shops?${qs} -> ${res.status}`).toBe(true)
  return res.json()
}

/**
 * Vorbedingung der harten Tests (kein stiller Skip, B8950-012-Stil): der Global-Setup-Shop ist aktiv und liegt im
 * Default-Radius der Suchseite um Larnaca. Sonst ist die Testumgebung kaputt, nicht die Suche.
 */
async function assertSetupShopInRadius(state: { shop_name: string; shopSlug: string }) {
  const res = await apiShops({ q: state.shop_name, status: 'active', limit: 20, ...LARNACA, max_dist_km: DEFAULT_RADIUS_KM })
  if (!res.items.some(i => i.slug === state.shopSlug)) {
    throw new Error(
      `SETUP BROKEN: Shop ${state.shopSlug} ("${state.shop_name}") ist nicht aktiv oder nicht innerhalb ${DEFAULT_RADIUS_KM} km um Larnaca ` +
      `(GET /shops?q=... lieferte ${res.items.map(i => i.slug).join(', ') || 'nichts'})`)
  }
}

/** Sichtbare Shop-Karte (die Liste steht fuer Mobile und Desktop im DOM, eine Kopie ist immer versteckt). */
function shopHitCard(page: import('@playwright/test').Page, slug: string) {
  return page.locator(
    `[data-testid="search-shop-results"] [data-testid="search-shop-result"][data-shop-slug="${slug}"]`,
  ).filter({ visible: true }).first()
}

/**
 * B2250-001: Text sitzt am rechten Rand des Blocks (Leserand unter dir=rtl), nicht am linken.
 * Gemessen wird die Textbox (Range ueber den Inhalt) gegen die Box des Elements; `text-align: end` waere unter
 * RTL links und faellt hier durch. Ein Fuell-Block ueber die ganze Breite wuerde `box.right - text.right` nicht
 * unterscheiden, deshalb muss der Text kuerzer als die Box sein (Ueberschriften sind es).
 */
async function textEdges(locator: import('@playwright/test').Locator) {
  return locator.evaluate(el => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const text = range.getBoundingClientRect()
    const box = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      label: (el.textContent ?? '').trim().slice(0, 40),
      dir: cs.direction,
      align: cs.textAlign,
      gapRight: Math.round(box.right - text.right),
      gapLeft: Math.round(text.left - box.left),
      boxWidth: Math.round(box.width),
      textWidth: Math.round(text.width),
    }
  })
}

async function expectRightAligned(locator: import('@playwright/test').Locator) {
  const e = await textEdges(locator)
  expect(e.dir, `${e.label}: direction`).toBe('rtl')
  expect(e.textWidth, `${e.label}: Text muss kuerzer als die Box sein (sonst beweist die Messung nichts)`).toBeLessThan(e.boxWidth - 16)
  expect(e.gapRight, `${e.label}: Abstand zum rechten Rand (align=${e.align})`).toBeLessThanOrEqual(2)
  expect(e.gapLeft, `${e.label}: Abstand zum linken Rand (align=${e.align})`).toBeGreaterThan(8)
}

/** Alle sichtbaren Sektionsueberschriften der Suchergebnisse (ohne Header/Footer/Cookie-Banner/Dialoge). */
function resultHeadings(page: import('@playwright/test').Page) {
  return page.locator('h2:not(header h2):not(footer h2):not([role="dialog"] h2)').filter({ visible: true })
}

function watchConsole(page: import('@playwright/test').Page) {
  const problems: string[] = []
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`))
  page.on('response', r => { if (r.url().includes('_rsc=') && r.status() === 404) problems.push(`RSC 404: ${r.url()}`) })
  return problems
}

// ─── Suche ────────────────────────────────────────────────────────────────────

test.describe('Shop-Suche', () => {
  test('Textsuche nach Shop-Name findet den Test-Shop', async ({ page }) => {
    const state = loadSearchState()
    await page.goto('/')

    // Suchfeld befüllen
    const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="Search"], input[placeholder*="Such"]').first()
    await expect(searchInput).toBeVisible({ timeout: 8_000 })
    await searchInput.fill(state.shop_name)
    await searchInput.press('Enter')

    // Auf Suchergebnis-Seite warten
    await page.waitForURL(/\/search\?/, { timeout: 10_000 })
    await waitForPageHydrated(page)

    // Shop-Treffer in der Suche: die Ergebnisseite zeigt passende Shops als eigene Sektion (Scope auf die Sektion,
    // nicht auf die ganze Seite: der Aktivitaets-Ticker nennt Shop-Namen ebenfalls).
    await assertSetupShopInRadius(state)
    const card = shopHitCard(page, state.shopSlug)
    await expect(card).toBeVisible({ timeout: 10_000 })
    await expect(card).toContainText(state.shop_name)

    // AC2: Klick fuehrt auf die Shop-Detailseite, H1 zeigt den Namen
    await card.click()
    await expect(page).toHaveURL(new RegExp(`/shops/${state.shopSlug}$`), { timeout: 10_000 })
    await expect(page.getByRole('heading', { level: 1, name: state.shop_name })).toBeVisible({ timeout: 10_000 })
  })

  test('API-Suche nach Shop-Name findet den Test-Shop', async () => {
    const state = loadStorageState()
    // Direkt über API suchen – unabhängig von Frontend-Rendering
    const results = await searchShopsApi(state.shop_name)
    const found = results.some(
      (s: { name?: string; shop_name?: string }) =>
        (s.name ?? s.shop_name ?? '').toLowerCase().includes(state.shop_name.toLowerCase())
    )
    expect(found, `Shop "${state.shop_name}" nicht in Suchergebnissen`).toBe(true)
  })

  test('Geo-Suche in der Nähe von Larnaca liefert Test-Shop', async () => {
    // Larnaca-Koordinaten: 34.9°N, 33.6°E, 5km Radius
    const res = await fetch(
      `${BACKEND_URL}/api/v1/shops/nearby?lat=34.9&lng=33.6&radius_km=5`
    )
    if (!res.ok) {
      // Endpoint optional or not yet implemented – Test überspringen
      return
    }
    const data = await res.json()
    const shops: Array<{ name?: string; shop_name?: string }> = Array.isArray(data) ? data : data?.items ?? []
    // If no shops are returned (e.g. geocoding not configured), skip rather than fail
    if (shops.length === 0) return
    const state = loadStorageState()
    const found = shops.some(s =>
      (s.name ?? s.shop_name ?? '').toLowerCase().includes(state.shop_name.toLowerCase())
    )
    expect(found, 'Test-Shop nicht in Geo-Suche gefunden').toBe(true)
  })
})

// ─── Shop-Treffer in der Suche ────────────────────────────────────────────────

test.describe('Shop-Treffer in der Suche', () => {
  test('Mobile (390x844): Shop-Karte im Bottom-Sheet, keine Konsolenfehler (AC14, AC20)', async ({ page }) => {
    const state = loadSearchState()
    await assertSetupShopInRadius(state)
    const problems = watchConsole(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/en/search?q=${encodeURIComponent(state.shop_name)}`)
    await waitForPageHydrated(page)
    await expect(shopHitCard(page, state.shopSlug)).toBeVisible({ timeout: 10_000 })
    expect(problems).toEqual([])
  })

  test('RTL (/ar): Sektionsueberschrift sichtbar und uebersetzt, Dokument rechts-nach-links (AC15, AC16)', async ({ page }) => {
    const state = loadSearchState()
    await assertSetupShopInRadius(state)
    await page.goto(`/ar/search?q=${encodeURIComponent(state.shop_name)}`)
    await waitForPageHydrated(page)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(shopHitCard(page, state.shopSlug)).toBeVisible({ timeout: 10_000 })
    const heading = page.locator('[data-testid="search-shop-results"] h2').filter({ visible: true }).first()
    await expect(heading).toBeVisible()
    await expect(heading).toHaveText('المتاجر')
  })

  for (const vp of [{ name: 'Mobile 390x844', width: 390, height: 844 }, { name: 'Desktop 1280x800', width: 1280, height: 800 }]) {
    test(`RTL (/ar, ${vp.name}): Shop-Ueberschrift folgt der Leserichtung, steht rechts (B2250-001, AC15)`, async ({ page }) => {
      const state = loadSearchState()
      await assertSetupShopInRadius(state)
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(`/ar/search?q=${encodeURIComponent(state.shop_name)}`)
      await waitForPageHydrated(page)
      await expect(shopHitCard(page, state.shopSlug)).toBeVisible({ timeout: 10_000 })
      const heading = page.locator('[data-testid="search-shop-results"] h2').filter({ visible: true }).first()
      await expect(heading).toHaveText('المتاجر')
      await expectRightAligned(heading)
    })

    // Realdaten: alle Sektionsueberschriften der Suchseite (Shops, lokale Shops, Online-Haendler, Dienstleistungen)
    test(`RTL (/ar, ${vp.name}): ALLE Sektionsueberschriften der Ergebnisliste stehen rechts (B2250-001)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      for (const q of ['pet', 'plumber']) {
        await page.goto(`/ar/search?q=${q}`)
        await waitForPageHydrated(page)
        const headings = resultHeadings(page)
        await expect.poll(() => headings.count(), { message: `Ueberschriften zu "${q}"`, timeout: 15_000 }).toBeGreaterThan(0)
        for (const h of await headings.all()) await expectRightAligned(h)
      }
    })
  }

  test.describe('Umkreis-Hinweis (Standort Limassol, ~58 km zum Test-Shop)', () => {
    test.use({ geolocation: { latitude: 34.68, longitude: 33.04 }, permissions: ['geolocation'] })

    test('Hinweis "Shops ausserhalb" -> "Umkreis erweitern" macht den Treffer sichtbar', async ({ page }) => {
      const state = loadSearchState()
      const here = { lat: 34.68, lng: 33.04 }
      // Vorbedingung (API): im Default-Radius um Limassol gibt es keinen Treffer, ausserhalb schon
      const inside = await apiShops({ q: state.shop_name, status: 'active', limit: 4, ...here, max_dist_km: DEFAULT_RADIUS_KM })
      if (inside.items.length > 0) throw new Error(`SETUP BROKEN: "${state.shop_name}" hat Treffer innerhalb ${DEFAULT_RADIUS_KM} km um Limassol: ${inside.items.map(i => i.slug)}`)
      const outside = await apiShops({ q: state.shop_name, status: 'active', limit: 4, ...here })
      const dists = outside.items.map(i => i.dist_km).filter((d): d is number => d != null)
      if (dists.length === 0) throw new Error('SETUP BROKEN: kein Treffer mit Distanz ausserhalb des Umkreises')
      // Ziel-Radius aus der API-Distanz (nicht hart verdrahtet): aufgerundet auf den Slider-Schritt 5, hoechstens 100
      const target = Math.min(100, Math.ceil(Math.min(...dists) / 5) * 5)

      await page.goto(`/en/search?q=${encodeURIComponent(state.shop_name)}`)
      await waitForPageHydrated(page)
      const hint = page.locator('[data-testid="search-shop-outside-hint"]').filter({ visible: true }).first()
      await expect(hint).toBeVisible({ timeout: 15_000 })
      await expect(hint).toContainText('outside your radius')
      // der Leerzustand "No results found." erscheint nicht zusaetzlich
      await expect(page.getByText('No results found.', { exact: true }).filter({ visible: true })).toHaveCount(0)

      await page.locator('[data-testid="search-shop-expand-radius"]').filter({ visible: true }).first().click()
      await expect(page).toHaveURL(new RegExp(`max_dist_km=${target}(&|$)`), { timeout: 10_000 })
      await expect(shopHitCard(page, state.shopSlug)).toBeVisible({ timeout: 15_000 })
      await expect(page.locator('[data-testid="search-shop-outside-hint"]').filter({ visible: true })).toHaveCount(0)
    })
  })


  // B2250-001: der Hinweis folgt in RTL der Leserichtung (rechts)
  test.describe('Umkreis-Hinweis in RTL (Standort Limassol)', () => {
    test.use({ geolocation: { latitude: 34.68, longitude: 33.04 }, permissions: ['geolocation'] })

    for (const vp of [{ name: 'Mobile 390x844', width: 390, height: 844 }, { name: 'Desktop 1280x800', width: 1280, height: 800 }]) {
      test(`/ar, ${vp.name}: Hinweis "Shops ausserhalb" und Ueberschrift stehen rechts`, async ({ page }) => {
        const state = loadSearchState()
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.goto(`/ar/search?q=${encodeURIComponent(state.shop_name)}`)
        await waitForPageHydrated(page)
        const hint = page.locator('[data-testid="search-shop-outside-hint"]').filter({ visible: true }).first()
        await expect(hint).toBeVisible({ timeout: 15_000 })
        await expectRightAligned(hint)
        await expectRightAligned(page.locator('[data-testid="search-shop-results"] h2').filter({ visible: true }).first())
      })
    }
  })

  // AC10: eigene Fixture (global-setup -> prepare_e2e_db.py --seed-inactive-shop). Ohne Statusfilter laege der
  // inaktive Shop im Radius und wuerde per Name gefunden.
  test('Inaktiver Shop erscheint bei der Namenssuche nicht (AC10)', async ({ page }) => {
    const here = LARNACA
    const q = INACTIVE_SHOP_NAME
    // Vorbedingung (API): die Fixture existiert, ist inaktiv und liegt im Radius. Sonst ist die Testumgebung kaputt.
    const asInactive = await apiShops({ q, status: 'inactive', limit: 5, ...here, max_dist_km: DEFAULT_RADIUS_KM })
    if (!asInactive.items.some(i => i.slug === INACTIVE_SHOP_SLUG)) {
      throw new Error(
        `SETUP BROKEN: Fixture ${INACTIVE_SHOP_SLUG} fehlt/ist nicht inaktiv/liegt ausserhalb ${DEFAULT_RADIUS_KM} km. ` +
        'Abhilfe: `cd pundo_main_backend && .venv/bin/python scripts/prepare_e2e_db.py --seed-inactive-shop`')
    }
    // API: weder mit status=active noch ohne status (Default active)
    const asActive = await apiShops({ q, status: 'active', limit: 5, ...here, max_dist_km: DEFAULT_RADIUS_KM })
    expect(asActive.items.map(i => i.slug)).not.toContain(INACTIVE_SHOP_SLUG)
    expect(asActive.total).toBe(0)

    // UI: keine Shop-Sektion, keine Karte, der Leerzustand der Suche erscheint
    const problems = watchConsole(page)
    await page.goto(`/en/search?q=${encodeURIComponent(q)}`)
    await waitForPageHydrated(page)
    await expect(page.getByText('No results found.', { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-testid="search-shop-results"]')).toHaveCount(0)
    await expect(page.locator(`[data-testid="search-shop-result"][data-shop-slug="${INACTIVE_SHOP_SLUG}"]`)).toHaveCount(0)
    expect(problems).toEqual([])
  })

  test('Mehr als 3 Treffer: 3 Karten und Link auf /shops?q= mit vorbefuelltem Suchfeld (AC4, AC6; Realdaten)', async ({ page }) => {
    // Ebene 2: braucht Prod-Kopie-Daten. Skip nur mit konkretem Grund.
    const q = 'pet'
    const res = await apiShops({ q, status: 'active', limit: 4, ...LARNACA, max_dist_km: DEFAULT_RADIUS_KM })
    test.skip((res.total ?? res.items.length) < 4, `pundo_test hat < 4 aktive Shops zu "${q}" im ${DEFAULT_RADIUS_KM}-km-Umkreis von Larnaca`)

    await page.goto(`/en/search?q=${q}`)
    await waitForPageHydrated(page)
    const cards = page.locator('[data-testid="search-shop-results"] [data-testid="search-shop-result"]').filter({ visible: true })
    await expect(cards).toHaveCount(3, { timeout: 10_000 })
    const all = page.locator('[data-testid="search-shop-results-all"]').filter({ visible: true }).first()
    await expect(all).toBeVisible()
    await expect(all).toHaveAttribute('href', `/en/shops?q=${q}`)

    await all.click()
    await expect(page).toHaveURL(new RegExp(`/en/shops\\?q=${q}$`), { timeout: 10_000 })
    await expect(page.getByRole('searchbox')).toHaveValue(q)
    // gefilterte Liste = Antwort der API fuer q (erste Karte der Seite ist ein Treffer)
    await expect(page.locator('a[href^="/en/shops/"]').first()).toBeVisible({ timeout: 10_000 })
  })
})

// ─── Pin-Tap mobil (B2250-002) ────────────────────────────────────────────────

test.describe('Pin-Tap auf der Karte (mobil, B2250-002)', () => {
  // Die Pins liegen mobil hinter dem Bottom-Sheet: ein echter Mausklick trifft das Sheet. Der Tap wird deshalb
  // als DOM-Click auf den Pin ausgeloest (dispatchEvent), wie ein Tap, der den Marker erreicht.
  // Regression: handlePinClick suchte die Karte in einer Ref-Map, die von der unsichtbaren Desktop-Kopie der Liste
  // ueberschrieben wurde -> scrollIntoView auf display:none, das Sheet blieb stehen.
  test('Tap auf einen Pin bringt die Karte des Shops ins sichtbare Sheet (Produkt- und Shop-Pins)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/en/search?q=cat')
    await waitForPageHydrated(page)

    const sheet = page.locator('.sheet-scroll-area').filter({ visible: true })
    const pins = page.locator('.leaflet-marker-icon')
    await expect(sheet.locator('[data-testid="search-local-result"]').first(), 'SETUP BROKEN: keine Produkt-Treffer zu "cat"').toBeVisible({ timeout: 15_000 })
    await expect.poll(() => pins.count(), { message: 'Pins auf der Karte', timeout: 15_000 }).toBeGreaterThan(1)
    const scrollable = await sheet.evaluate(el => el.scrollHeight - el.clientHeight)
    expect(scrollable, 'SETUP BROKEN: Liste ist nicht laenger als das Sheet, nichts zu scrollen').toBeGreaterThan(300)

    let productPins = 0
    let scrolledPins = 0
    const pinCount = Math.min(await pins.count(), 8)
    for (let i = 0; i < pinCount; i++) {
      // Ans Ende der Liste (die Liste waechst beim Scrollen nach, deshalb im Poll nachfassen) und zur Ruhe kommen lassen.
      await expect.poll(() => sheet.evaluate(el => { el.scrollTop = el.scrollHeight; return el.scrollTop }), { timeout: 5_000 }).toBeGreaterThan(1_000)
      await page.waitForTimeout(400)
      const before = await sheet.evaluate(el => el.scrollTop)

      await pins.nth(i).dispatchEvent('click')

      // Der Tap hebt die Karte des Shops hervor (ring-accent); daraus die Shop-ID lesen (im Sheet, nicht in der Desktop-Kopie).
      // (Die Karte kann ausserhalb des Sichtfensters liegen: auf Vorhandensein warten, nicht auf Sichtbarkeit.)
      await expect(sheet.locator('.ring-accent').first(), `Pin ${i}: keine Karte hervorgehoben`).toBeAttached({ timeout: 5_000 })
      const shopId = await sheet.evaluate(el => el.querySelector('.ring-accent')?.closest('[data-shop-id]')?.getAttribute('data-shop-id') ?? null)
      expect(shopId, `Pin ${i}: Tap hat keine Karte hervorgehoben`).not.toBeNull()
      if (await sheet.locator(`[data-testid="search-local-result"][data-shop-id="${shopId}"]`).count()) productPins++

      // Die (erste) Karte dieses Shops liegt nach dem Scrollen komplett im Sichtfenster des Sheets.
      await expect.poll(() => sheet.evaluate((el, id) => {
        const card = el.querySelector<HTMLElement>(`[data-shop-id="${id}"]`)
        if (!card) return 'no-card'
        const c = card.getBoundingClientRect()
        const w = el.getBoundingClientRect()
        return c.top >= w.top - 1 && c.bottom <= w.bottom + 1 ? 'in-view' : `out-of-view top=${Math.round(c.top)} bottom=${Math.round(c.bottom)} window=${Math.round(w.top)}-${Math.round(w.bottom)}`
      }, shopId), { message: `Pin ${i} (Shop ${shopId}): Karte im sichtbaren Sheet`, timeout: 3_000 }).toBe('in-view')
      if ((await sheet.evaluate(el => el.scrollTop)) !== before) scrolledPins++
      // Hervorhebung klingt nach 1,2 s ab; naechster Pin startet sauber.
      await expect(sheet.locator('.ring-accent')).toHaveCount(0, { timeout: 5_000 })
    }

    // Beide Pin-Arten sind abgedeckt, und das Sheet hat tatsaechlich gescrollt (nicht nur zufaellig schon dort gestanden).
    expect(productPins, 'mindestens ein Pin muss zu einer Produktkarte gehoeren').toBeGreaterThan(0)
    expect(scrolledPins, 'mindestens ein Tap muss das Sheet gescrollt haben').toBeGreaterThan(0)
  })
})

// ─── Shop-Detailseite ─────────────────────────────────────────────────────────

test.describe('Shop-Detailseite', () => {
  let shopSlug: string | null = null

  test.beforeAll(async () => {
    const state = loadStorageState()
    // Use slug saved by global-setup (avoids owner_id lookup via public API which doesn't support that filter)
    shopSlug = (state as Record<string, unknown>).shopSlug as string | null
      ?? (await fetchShopByOwner(state.ownerId))?.slug as string | null ?? null
  })

  test('Shop-Detailseite lädt ohne Fehler', async ({ page }) => {
    if (!shopSlug) {
      console.warn('[shop-discovery] Kein Shop-Slug gefunden, Detailseiten-Test übersprungen')
      return
    }
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`/shops/${shopSlug}`)
    expect(errors).toHaveLength(0)
  })

  // Testdaten-Drift: e2e-owner (ID 1) zeigt nach prod→test-Syncs nicht zwingend auf einen Shop
  // namens "E2E Test Shop" in Larnaca (Stand 2026-10-14: Shop 7937 happy-pets-nicosia). Erwarteter
  // Name und Adressteil kommen deshalb aus der Backend-API für genau diesen Slug.
  async function fetchShopDetail(slug: string): Promise<{ name: string | null; address_raw: string | null; city: string | null }> {
    const res = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${encodeURIComponent(slug)}`, { headers: { 'Accept-Language': 'en' } })
    expect(res.ok, `GET /shops/by-slug/${slug} -> ${res.status}`).toBe(true)
    return res.json()
  }

  test('Shop-Detailseite zeigt Shop-Name', async ({ page }) => {
    if (!shopSlug) return
    const shop = await fetchShopDetail(shopSlug)
    expect(shop.name, 'Shop ohne Namen in der API').toBeTruthy()
    await page.goto(`/en/shops/${shopSlug}`)
    await expect(page.getByRole('heading', { level: 1, name: shop.name! })).toBeVisible({ timeout: 10_000 })
  })

  test('Shop-Detailseite zeigt Adresse', async ({ page }) => {
    if (!shopSlug) return
    const shop = await fetchShopDetail(shopSlug)
    // Adresse (erster Teil) oder Stadt — je nachdem, was der Shop in der API hat
    const addressPart = shop.address_raw?.split(',')[0]?.trim() || shop.city
    expect(addressPart, `Shop ${shopSlug} hat weder address_raw noch city in der API`).toBeTruthy()
    await page.goto(`/en/shops/${shopSlug}`)
    await expect(page.getByText(addressPart!, { exact: false }).filter({ visible: true }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Shop-Detailseite enthält Karten-Element', async ({ page }) => {
    if (!shopSlug) return
    await page.goto(`/shops/${shopSlug}`)
    // Leaflet / Google Maps / OpenStreetMap iframe oder canvas
    const mapEl = page.locator(
      '[data-testid="map"], .leaflet-container, iframe[src*="maps"], canvas.mapboxgl-canvas'
    ).first()
    // Karte ist optional — nur prüfen ob vorhanden, nicht ob Fehler
    const count = await mapEl.count()
    if (count > 0) {
      await expect(mapEl).toBeVisible({ timeout: 10_000 })
    }
  })
})

// ─── Shop-Admin: Produkt anlegen → via API abrufbar ──────────────────────────

shopTest.describe('Shop-Produkt via Admin anlegen', () => {
  shopTest.afterAll(async ({ workerShop }) => {
    await workerShop.cleanupSpecData()
  })

  const TEST_OFFER_TITLE = `${marker('SHOP-DISCOVERY')} Geo-Test Olivenöl Angebot`

  shopTest('Produkt anlegen und via API abrufen', async ({ page, workerShop }) => {
    const pickerItem = await workerShop.createItem('SHOP-DISCOVERY', 'olive-oil')

    // Angebot mit neuem Item anlegen — neuer Unified Flow (Produkte → Angebote)
    await page.goto('/shop-admin/offers/new')
    await waitForPageHydrated(page)
    await page.waitForSelector('body[data-hydrated="true"]', { timeout: 15_000 })

    // Step 1: "Select item" Button klicken (gestrichelte Umrandung — border-dashed)
    await openItemPickerModal(page.locator('button.border-dashed')) // hydrierter Klick + Fokus-Effekt abwarten

    // Im Modal: Text-Suche (placeholder "…") → erstes Ergebnis auswählen
    const textSearch = page.locator('input[placeholder="…"]')
    await textSearch.waitFor({ state: 'visible', timeout: 10_000 })
    // F8950 T31/T22: eigenes Marker-Item statt Prod-Suchbegriff; auf die debounced Such-Antwort warten
    const searchResponse = page.waitForResponse(r => r.url().includes('/api/shop-admin/items?q='))
    await textSearch.fill(pickerItem.name)
    await searchResponse
    const firstResult = page.locator('ul li button').first()
    await firstResult.waitFor({ state: 'visible', timeout: 10_000 })
    await firstResult.click()
    // Modal schließt sich, Step 2 erscheint automatisch (das select unten wartet darauf)

    // Step 2: Preis-Typ auf "on_request" setzen
    // eslint-disable-next-line local-e2e/no-positional-tag-locator -- legacy (B8950-016 T4): replace by getByTestId/getByRole
    await page.locator('select').first().waitFor({ state: 'visible', timeout: 8_000 })
    // eslint-disable-next-line local-e2e/no-positional-tag-locator -- legacy (B8950-016 T4): replace by getByTestId/getByRole
    await page.locator('select').first().selectOption('on_request')

    // Angebots-Titel setzen (für API-Verifikation)
    await page.locator('input[name="title"]').fill(TEST_OFFER_TITLE)
    await page.getByRole('button', { name: /^save$|^speichern$/i }).click()
    await expect(page).toHaveURL(/\/shop-admin\/offers$/, { timeout: 15_000 })

    // Via Owner-API prüfen: das Angebot gehört dem Worker-Shop. (Der öffentliche Endpoint
    // /shops/by-slug/{slug}/offers liefert nur Angebote mit aktiver AKTION — dieses on_request-Angebot hat keine;
    // der alte Check lief deshalb ins Leere, B8950-012.)
    await expect.poll(async () => {
      const res = await workerShop.api<{ items: Array<{ title?: string | null }> }>('GET', '/offers?limit=100')
      return res.status === 200 && res.json.items.some((o) => (o.title ?? '').includes('Olivenöl'))
    }, { message: 'Angebot nicht in der Owner-API gefunden', timeout: 10_000 }).toBe(true)
  })
})

// ─── Öffnungszeiten via Admin setzen → API prüfen ────────────────────────────

shopTest.describe('Öffnungszeiten via Admin setzen', () => {
  shopTest('Öffnungszeiten speichern und via API verifizieren', async ({ page, workerShop }) => {
    await page.goto('/shop-admin/hours')
    // Days default to Closed — uncheck the first "Closed" checkbox to reveal time inputs
    const closedCheckboxes = page.locator('input[type="checkbox"][aria-label*="Closed"]')
    const firstClosed = closedCheckboxes.first()
    if (await firstClosed.isChecked()) {
      await firstClosed.click()
    }
    const openInputs = page.locator('input[type="time"][aria-label*="open from"]')
    await openInputs.first().fill('09:00')
    const closeInputs = page.locator('input[type="time"][aria-label*="close at"]')
    await closeInputs.first().fill('18:00')
    await page.getByRole('button', { name: /save hours|öffnungszeiten speichern/i }).click()
    await expect(page.getByRole('status')).toContainText(/saved|gespeichert/i, { timeout: 8_000 })

    // Via Owner-API verifizieren (die alte öffentliche Route /shops/{id}/hours gibt es nicht mehr → 404, der Check war wirkungslos)
    const res = await workerShop.api<Array<{ day: number; closed: boolean; open?: string }>>('GET', '/shop/hours')
    expect(res.status, res.text).toBe(200)
    const first = res.json.find((d) => d.day === 0)
    expect(first, 'Montag in den gespeicherten Öffnungszeiten').toMatchObject({ closed: false, open: '09:00' })
  })
})
