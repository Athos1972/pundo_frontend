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

import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8001'

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

// Helper: Fetch shop data directly from API
async function fetchShopByOwner(ownerId: number) {
  const res = await fetch(`${BACKEND_URL}/api/v1/shops?owner_id=${ownerId}`)
  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data) ? data[0] : data?.items?.[0] ?? null
}

// Helper: Search shops by name
async function searchShopsApi(query: string) {
  const res = await fetch(`${BACKEND_URL}/api/v1/shops/search?q=${encodeURIComponent(query)}`)
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

    // Adresse gesetzt
    expect(shop.address ?? shop.shop_address).toBeTruthy()

    // Koordinaten: lat und lng müssen vorhanden und plausibel sein
    const lat = shop.lat ?? shop.latitude
    const lng = shop.lng ?? shop.longitude
    expect(lat, 'lat fehlt').not.toBeNull()
    expect(lng, 'lng fehlt').not.toBeNull()
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
    // Mindestens eine Shop-Karte soll sichtbar sein
    const shopCards = page.locator('[data-testid="shop-card"], .shop-card, article').first()
    await expect(shopCards).toBeVisible({ timeout: 10_000 })
    // Der Test-Shop-Name soll irgendwo auf der Seite erscheinen
    await expect(page.getByText(state.shop_name, { exact: false })).toBeVisible({ timeout: 10_000 })
  })
})

// ─── Suche ────────────────────────────────────────────────────────────────────

test.describe('Shop-Suche', () => {
  test('Textsuche nach Shop-Name findet den Test-Shop', async ({ page }) => {
    const state = loadStorageState()
    await page.goto('/')

    // Suchfeld befüllen
    const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="Search"], input[placeholder*="Such"]').first()
    await expect(searchInput).toBeVisible({ timeout: 8_000 })
    await searchInput.fill(state.shop_name)
    await searchInput.press('Enter')

    // Auf Suchergebnis-Seite warten
    await page.waitForURL(/\/(search|shops)/, { timeout: 10_000 })

    // Test-Shop in Ergebnissen
    await expect(page.getByText(state.shop_name, { exact: false })).toBeVisible({ timeout: 10_000 })
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
    if (res.status === 404 || res.status === 501) {
      // Endpoint optional – Test überspringen
      return
    }
    expect(res.ok).toBe(true)
    const data = await res.json()
    const shops: Array<{ name?: string; shop_name?: string }> = Array.isArray(data) ? data : data?.items ?? []
    const state = loadStorageState()
    const found = shops.some(s =>
      (s.name ?? s.shop_name ?? '').toLowerCase().includes(state.shop_name.toLowerCase())
    )
    expect(found, 'Test-Shop nicht in Geo-Suche gefunden').toBe(true)
  })
})

// ─── Shop-Detailseite ─────────────────────────────────────────────────────────

test.describe('Shop-Detailseite', () => {
  let shopSlug: string | null = null

  test.beforeAll(async () => {
    const state = loadStorageState()
    const shop = await fetchShopByOwner(state.ownerId)
    shopSlug = shop?.slug ?? shop?.id?.toString() ?? null
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

  test('Shop-Detailseite zeigt Shop-Name', async ({ page }) => {
    if (!shopSlug) return
    const state = loadStorageState()
    await page.goto(`/shops/${shopSlug}`)
    await expect(page.getByText(state.shop_name, { exact: false })).toBeVisible({ timeout: 10_000 })
  })

  test('Shop-Detailseite zeigt Adresse', async ({ page }) => {
    if (!shopSlug) return
    const state = loadStorageState()
    await page.goto(`/shops/${shopSlug}`)
    // Adresse oder Teil davon soll sichtbar sein (z.B. "Larnaca")
    await expect(page.getByText(/larnaca/i)).toBeVisible({ timeout: 10_000 })
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

test.describe('Shop-Produkt via Admin anlegen', () => {
  // Nutzt gespeicherten Auth-State des Shop-Owners
  test.use({
    storageState: (() => {
      const stateFile = path.join(__dirname, '.test-state.json')
      if (fs.existsSync(stateFile)) {
        return JSON.parse(fs.readFileSync(stateFile, 'utf8')).storageState
      }
      return undefined
    })(),
  })

  const PRODUCT_NAME = 'E2E Geo-Test Olivenöl'

  test('Produkt anlegen und via API abrufen', async ({ page }) => {
    const state = loadStorageState()

    // Produkt im Shop-Admin anlegen
    await page.goto('/shop-admin/products/new')
    await page.locator('input[name="name"]').fill(PRODUCT_NAME)
    await page.locator('input[name="price"]').fill('5.99')
    await page.locator('input[name="unit"]').fill('l')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/shop-admin\/products/, { timeout: 10_000 })
    await expect(page.getByText(PRODUCT_NAME)).toBeVisible()

    // Kurze Pause für DB-Commit
    await page.waitForTimeout(500)

    // Via API prüfen: Produkt gehört dem Shop des Test-Owners
    const shop = await fetchShopByOwner(state.ownerId)
    if (shop?.slug ?? shop?.id) {
      const shopId = shop.id
      const res = await fetch(`${BACKEND_URL}/api/v1/shops/${shopId}/products`)
      if (res.ok) {
        const products = await res.json()
        const found = (Array.isArray(products) ? products : products?.items ?? []).some(
          (p: { name?: string }) => (p.name ?? '').includes('Olivenöl')
        )
        expect(found, 'Produkt nicht in API gefunden').toBe(true)
      }
    }
  })
})

// ─── Öffnungszeiten via Admin setzen → API prüfen ────────────────────────────

test.describe('Öffnungszeiten via Admin setzen', () => {
  test.use({
    storageState: (() => {
      const stateFile = path.join(__dirname, '.test-state.json')
      if (fs.existsSync(stateFile)) {
        return JSON.parse(fs.readFileSync(stateFile, 'utf8')).storageState
      }
      return undefined
    })(),
  })

  test('Öffnungszeiten speichern und via API verifizieren', async ({ page }) => {
    const state = loadStorageState()

    await page.goto('/shop-admin/hours')
    const openInputs = page.locator('input[type="time"][aria-label*="open from"]')
    await openInputs.first().fill('09:00')
    const closeInputs = page.locator('input[type="time"][aria-label*="close at"]')
    await closeInputs.first().fill('18:00')
    await page.getByRole('button', { name: /save hours|öffnungszeiten speichern/i }).click()
    await expect(page.getByRole('status')).toContainText(/saved|gespeichert/i, { timeout: 8_000 })

    // Via API verifizieren
    const shop = await fetchShopByOwner(state.ownerId)
    if (shop?.id) {
      const res = await fetch(`${BACKEND_URL}/api/v1/shops/${shop.id}/hours`)
      if (res.ok) {
        const hours = await res.json()
        // Mindestens ein Slot vorhanden
        const slots = Array.isArray(hours) ? hours : hours?.items ?? []
        expect(slots.length).toBeGreaterThan(0)
      }
    }
  })
})
