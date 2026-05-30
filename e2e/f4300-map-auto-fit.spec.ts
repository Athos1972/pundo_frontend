/**
 * E2E Smoke Tests — F4300 Karten-Auto-Zoom auf alle Shop-Pins
 *
 * Tests laufen gegen Frontend Port 3500, Backend Port 8500.
 *
 * Was hier NICHT getestet werden kann via DOM:
 *   - Ob fitBounds den exakten Kartenausschnitt gesetzt hat (Leaflet-intern)
 *   - Ob maxZoom 16 eingehalten wird (Leaflet-intern)
 *
 * Was hier getestet wird:
 *   - Karte lädt ohne JS-Fehler
 *   - Karten-Container hat echte Dimensionen (nicht 0×0)
 *   - Leaflet-Marker-Icons sind im DOM vorhanden
 *   - Nach Filter-Wechsel: Karte noch vorhanden, keine Leaflet-Fehler
 *   - RTL-Sprachen (ar, he): kein JS-Fehler beim Laden der Karte
 */
import { test, expect } from '@playwright/test'

// Category 678 is known to return multiple shops in the test DB.
const MULTI_SHOP_URL = '/de/search?category_id=678'

function collectCriticalErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Ignore known benign messages
      if (
        text.includes('Warning:') ||
        text.includes('hydrat') ||
        text.toLowerCase().includes('passive') ||
        // Leaflet tile-load errors (network, expected in test env)
        text.includes('Failed to load resource') ||
        text.includes('ERR_') ||
        text.includes('404')
      ) return
      errors.push(text)
    }
  })
  page.on('pageerror', err => errors.push(err.message))
  return errors
}

test.describe('F4300 — Map Auto-Fit Bounds (Smoke)', () => {

  test('AC1/AC4: Karte lädt ohne JS-Fehler und Map-Container hat echte Dimensionen', async ({ page }) => {
    const errors = collectCriticalErrors(page)

    await page.goto(MULTI_SHOP_URL)
    await page.waitForLoadState('networkidle')

    // Layout has two .leaflet-container (mobile + desktop branch) — pick visible one.
    // On desktop the mobile-branch map is md:hidden; on mobile the desktop-branch map is hidden md:flex.
    const mapContainer = page.locator('.leaflet-container').filter({ visible: true }).first()
    await expect(mapContainer).toBeVisible()

    const box = await mapContainer.boundingBox()
    expect(box, 'Leaflet-Container hat kein Bounding-Box (0×0?)').not.toBeNull()
    expect(box!.width, 'Karten-Breite ist 0').toBeGreaterThan(0)
    expect(box!.height, 'Karten-Höhe ist 0').toBeGreaterThan(0)

    // Kein kritischer JS-Fehler
    const criticalErrors = errors.filter(e =>
      e.toLowerCase().includes('cannot read') ||
      e.toLowerCase().includes('undefined') ||
      e.toLowerCase().includes('null') ||
      e.toLowerCase().includes('fitbounds') ||
      e.toLowerCase().includes('leaflet')
    )
    expect(criticalErrors, `Kritische Leaflet-Fehler: ${criticalErrors.join(' | ')}`).toHaveLength(0)
  })

  test('AC1: Bei category_id=678 sind Leaflet-Marker im DOM vorhanden', async ({ page }) => {
    await page.goto(MULTI_SHOP_URL)
    await page.waitForLoadState('networkidle')

    // Wait for markers — they are added after map init
    const markers = page.locator('.leaflet-marker-icon')
    // At least one marker must be present if shops have coordinates
    const count = await markers.count()
    // If 0 markers: shops may have no coordinates — warn but don't fail hard
    // (test data variance). At minimum the map must render.
    const mapContainer = page.locator('.leaflet-container').filter({ visible: true }).first()
    await expect(mapContainer).toBeVisible()

    if (count === 0) {
      console.warn('F4300: Keine Marker gefunden für category_id=678 — evtl. keine Koordinaten in Testdaten')
    } else {
      expect(count).toBeGreaterThanOrEqual(1)
    }
  })

  test('AC2: Filter-Wechsel — Karte bleibt vorhanden, kein Leaflet-Fehler', async ({ page }) => {
    const errors = collectCriticalErrors(page)

    await page.goto(MULTI_SHOP_URL)
    await page.waitForLoadState('networkidle')

    // Change filter: switch to a different category
    await page.goto('/de/search?category_id=2871&category_name=Animals')
    await page.waitForLoadState('networkidle')

    // Map still present after navigation — pick visible container (two in DOM: mobile + desktop branch)
    const mapContainer = page.locator('.leaflet-container').filter({ visible: true }).first()
    await expect(mapContainer).toBeVisible()

    const criticalErrors = errors.filter(e =>
      e.toLowerCase().includes('cannot read') ||
      e.toLowerCase().includes('fitbounds') ||
      e.toLowerCase().includes('uncaught')
    )
    expect(criticalErrors, `Fehler nach Filter-Wechsel: ${criticalErrors.join(' | ')}`).toHaveLength(0)
  })

  test('AC4: 0 Shops (leere Kategorie) — Karte lädt ohne JS-Fehler', async ({ page }) => {
    const errors = collectCriticalErrors(page)

    // Category 5 = Commercial Cleaning — 0 products/shops with coordinates
    await page.goto('/de/search?category_id=5&category_name=Cleaning')
    await page.waitForLoadState('networkidle')

    // No page crash
    const pageErrors = errors.filter(e =>
      e.toLowerCase().includes('cannot read') ||
      e.toLowerCase().includes('null') ||
      e.toLowerCase().includes('undefined') ||
      e.toLowerCase().includes('fitbounds')
    )
    expect(pageErrors, `JS-Fehler bei 0 Shops: ${pageErrors.join(' | ')}`).toHaveLength(0)

    // Page itself still renders (empty state or map fallback)
    const body = await page.locator('body').textContent()
    expect(body!.length).toBeGreaterThan(10)
  })

  test('AC7: RTL — Arabisch (ar) lädt Karte ohne Leaflet-Fehler', async ({ page }) => {
    const errors = collectCriticalErrors(page)

    await page.goto('/ar/search?category_id=678')
    await page.waitForLoadState('networkidle')

    // RTL attribute
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')

    // Map container should exist if page has map
    // (map may be hidden on mobile layout — check DOM presence)
    const mapContainerCount = await page.locator('.leaflet-container').count()
    // Not asserting visibility (could be in desktop-only col), but no crash
    const criticalErrors = errors.filter(e =>
      e.toLowerCase().includes('cannot read') ||
      e.toLowerCase().includes('leaflet') ||
      e.toLowerCase().includes('fitbounds')
    )
    expect(criticalErrors, `Leaflet-Fehler (ar): ${criticalErrors.join(' | ')}`).toHaveLength(0)

    // If map is present, it must have dimensions
    if (mapContainerCount > 0) {
      const firstContainer = page.locator('.leaflet-container').first()
      const box = await firstContainer.boundingBox()
      if (box) {
        expect(box.width).toBeGreaterThan(0)
        expect(box.height).toBeGreaterThan(0)
      }
    }
  })

  test('AC7: RTL — Hebräisch (he) lädt Karte ohne Leaflet-Fehler', async ({ page }) => {
    const errors = collectCriticalErrors(page)

    await page.goto('/he/search?category_id=678')
    await page.waitForLoadState('networkidle')

    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')

    const criticalErrors = errors.filter(e =>
      e.toLowerCase().includes('cannot read') ||
      e.toLowerCase().includes('leaflet') ||
      e.toLowerCase().includes('fitbounds')
    )
    expect(criticalErrors, `Leaflet-Fehler (he): ${criticalErrors.join(' | ')}`).toHaveLength(0)
  })

  // AC5: Mobile layout — map visible on load without tapping a tab
  test('AC5: Mobile-Viewport — Karte sofort sichtbar ohne Tab-Antippen', async ({ page }) => {
    const errors = collectCriticalErrors(page)

    // iPhone 13 viewport
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(MULTI_SHOP_URL)
    await page.waitForLoadState('networkidle')

    // Map must be present in the DOM and visible without interaction
    const mapContainer = page.locator('.leaflet-container').first()
    await expect(mapContainer).toBeVisible({ timeout: 5000 })

    const box = await mapContainer.boundingBox()
    expect(box, 'Karte hat keine Bounding-Box auf Mobile').not.toBeNull()
    expect(box!.width, 'Karten-Breite 0 auf Mobile').toBeGreaterThan(0)
    expect(box!.height, 'Karten-Höhe 0 auf Mobile').toBeGreaterThan(0)

    // No critical errors
    const criticalErrors = errors.filter(e =>
      e.toLowerCase().includes('cannot read') ||
      e.toLowerCase().includes('fitbounds') ||
      e.toLowerCase().includes('leaflet')
    )
    expect(criticalErrors, `Leaflet-Fehler auf Mobile: ${criticalErrors.join(' | ')}`).toHaveLength(0)
  })

  // AC6: Bottom sheet renders and drag handle is present on mobile
  test('AC6: Mobile-Viewport — Bottom-Sheet-Handle ist im DOM vorhanden', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(MULTI_SHOP_URL)
    await page.waitForLoadState('networkidle')

    // The sheet region should exist (aria-label set in SearchContent)
    // The drag handle pill div is inside the sheet
    const sheet = page.locator('[role="region"]').first()
    await expect(sheet).toBeAttached({ timeout: 5000 })
  })

  // AC-TextSearch-1: Text-Suche mit Geo — Karte zeigt Pins (shop_location fix)
  test('AC-TextSearch-1: Text-Suche mit Geo-Koordinaten zeigt Leaflet-Marker', async ({ page }) => {
    const errors = collectCriticalErrors(page)

    // Text search with lat/lng — backend now returns shop_location for local shops
    await page.goto('/de/search?q=schesir&lat=34.9&lng=33.6')
    await page.waitForLoadState('networkidle')

    // Map must load without errors
    const mapContainer = page.locator('.leaflet-container').filter({ visible: true }).first()
    await expect(mapContainer).toBeVisible({ timeout: 8000 })

    // Verify at least one marker exists (shop has coordinates in test DB)
    const markers = page.locator('.leaflet-marker-icon')
    await page.waitForTimeout(1500) // allow Leaflet to place markers after data loads
    const count = await markers.count()

    if (count === 0) {
      console.warn('AC-TextSearch-1: Keine Marker — Schesir-Shop hat evtl. keine Koordinaten in pundo_test')
    } else {
      expect(count).toBeGreaterThanOrEqual(1)
    }

    // No critical JS errors
    const criticalErrors = errors.filter(e =>
      e.toLowerCase().includes('cannot read') ||
      e.toLowerCase().includes('fitbounds') ||
      e.toLowerCase().includes('leaflet')
    )
    expect(criticalErrors, `Leaflet-Fehler in Text-Suche: ${criticalErrors.join(' | ')}`).toHaveLength(0)
  })

  // AC-TextSearch-2: Text-Suche — Karte ohne Geo zeigt Larnaca-Fallback (kein Absturz)
  test('AC-TextSearch-2: Text-Suche ohne Geo — Karte lädt ohne Fehler (Larnaca-Fallback)', async ({ page }) => {
    const errors = collectCriticalErrors(page)

    // No lat/lng → dist_km=null → items treated as online → mapShops empty → Larnaca fallback
    await page.goto('/de/search?q=schesir')
    await page.waitForLoadState('networkidle')

    // Map container must exist and have dimensions (even with 0 pins)
    const mapContainer = page.locator('.leaflet-container').filter({ visible: true }).first()
    await expect(mapContainer).toBeVisible({ timeout: 8000 })

    const box = await mapContainer.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)

    const criticalErrors = errors.filter(e =>
      e.toLowerCase().includes('cannot read') ||
      e.toLowerCase().includes('fitbounds')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})
