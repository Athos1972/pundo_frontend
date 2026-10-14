/**
 * E2E-Tests: WhatsApp-Button (F5000)
 *
 * Diese Tests prüfen das Frontend-Rendering des WhatsApp-Buttons.
 * Sie benötigen kein laufendes Backend — sie prüfen Seiten die mit
 * Backend-Daten gerendert werden. Ohne Backend werden Backend-abhängige
 * Tests übersprungen.
 *
 * Port: 3500 (Test-Frontend)
 */
import { test, expect } from '@playwright/test'
import { waitForPageHydrated } from './journeys/_helpers/hydration'

// F8950 T17: gestrichen sind die dir-Matrix (RTL-Block) und "Startseite lädt fehlerfrei" (Desktop + Mobile);
// Ersatz: language-smoke.spec.ts (Startseite, 6 Sprachen, dir + JS-Fehler).

// ─── WhatsApp-Button: Startseite / Navigation ────────────────────────────────

test.describe('WhatsApp-Button: Frontend-Grundstruktur', () => {
  test('OfferList-Seite (Produkt-Detail) lädt fehlerfrei', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration') && !err.message.includes('#418')) {
        errors.push(err.message)
      }
    })
    // Suche nach einem Produkt — wenn keine Ergebnisse, Skip
    await page.goto('/search?q=cat')
    await waitForPageHydrated(page)
    expect(errors, `JS-Fehler auf Suchseite: ${errors.join(', ')}`).toHaveLength(0)
  })
})

// ─── WhatsApp-Button: wa.me Link-Format (wenn Shop-Daten vorhanden) ──────────

test.describe('WhatsApp-Button: Link-Format (Backend-abhängig)', () => {
  test.beforeAll(async () => {
    // Prüfe ob Backend läuft — wenn nicht, alle Tests überspringen
    const backendOk = await fetch('http://localhost:8500/api/v1/health')
      .then(() => true)
      .catch(() => false)
    if (!backendOk) {
      console.log('[WhatsApp E2E] Backend nicht erreichbar — Backend-abhängige Tests werden übersprungen')
    }
  })

  test('Shop-Detailseite: WhatsApp-Button hat wa.me-Link wenn whatsapp-Feld gesetzt', async ({ page }) => {
    // Backend prüfen
    const backendOk = await fetch('http://localhost:8500/api/v1/health')
      .then(() => true)
      .catch(() => false)
    if (!backendOk) {
      test.skip()
      return
    }

    // Ersten Shop mit whatsapp-Feld finden (bevorzugt ohne phone, damit tel:-Assertion klar ist)
    const shopsRes = await fetch('http://localhost:8500/api/v1/shops?limit=50')
    if (!shopsRes.ok) { test.skip(); return }
    const shops = await shopsRes.json()
    type ShopItem = { whatsapp_url: string | null; phone: string | null; slug: string }
    const shopWithWaOnly = shops.items?.find((s: ShopItem) => s.whatsapp_url && !s.phone)
    const shopWithWa = shopWithWaOnly ?? shops.items?.find((s: ShopItem) => s.whatsapp_url)
    if (!shopWithWa) {
      console.log('[WhatsApp E2E] Kein Shop mit whatsapp_url in Test-DB — Test übersprungen')
      test.skip()
      return
    }

    await page.goto(`/shops/${shopWithWa.slug}`)

    // WhatsApp-Link muss vorhanden sein
    const waLink = page.locator('a[href*="wa.me"]').first()
    await expect(waLink).toBeVisible()

    const href = await waLink.getAttribute('href')
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/)
    // Kein führendes + in der Nummer
    expect(href).not.toMatch(/wa\.me\/\+/)
    // URL-encoded text enthält irgendeinen Hostnamen (SITE_URL aus .env.local, nicht hardcoded pundo.cy)
    const decodedText = decodeURIComponent(href?.split('?text=')[1] ?? '')
    expect(decodedText).toMatch(/on \S+/)

    // tel:-Link nur versteckt wenn Shop kein phone hat (UI zeigt beide wenn beides gesetzt)
    if (!shopWithWa.phone) {
      const telLink = page.locator('a[href^="tel:"]')
      await expect(telLink).not.toBeVisible()
    }
  })

  test('Shop ohne whatsapp aber mit phone: nur tel:-Link sichtbar', async ({ page }) => {
    const backendOk = await fetch('http://localhost:8500/api/v1/health')
      .then(() => true)
      .catch(() => false)
    if (!backendOk) { test.skip(); return }

    const shopsRes = await fetch('http://localhost:8500/api/v1/shops?limit=50')
    if (!shopsRes.ok) { test.skip(); return }
    const shops = await shopsRes.json()
    const shopWithPhone = shops.items?.find(
      (s: { whatsapp_url: string | null; phone: string | null; slug: string }) =>
        !s.whatsapp_url && s.phone
    )
    if (!shopWithPhone) { test.skip(); return }

    await page.goto(`/shops/${shopWithPhone.slug}`)

    // tel:-Link vorhanden (zuerst: wartet, bis die Seite gerendert ist - sonst waere die Abwesenheit unten trivial)
    const telLink = page.locator('a[href^="tel:"]')
    await expect(telLink.first()).toBeVisible()

    // Kein WhatsApp-Link
    const waLink = page.locator('a[href*="wa.me"]')
    await expect(waLink).not.toBeVisible()
  })

  test('OfferList: on_request-Angebot zeigt tel:-CTA (kein WhatsApp in Offers)', async ({ page }) => {
    // shop_whatsapp existiert nicht in Offer-Responses (Backend-Design). F8950 T22: statt des Prod-Kopie-Produkts
    // `nexus-eazypod-uv-automatic-grey` (fehlte -> stiller Skip) die permanente Preistyp-Fixture
    // (prepare_e2e_db.py seed_price_type_fixtures): on_request-Angebot, Fixture-Shop mit Telefon +35799000001.
    await page.goto('/products/e2e-vet-consultation-larnaca')

    // tel:-CTA ("Contact shop") vorhanden
    await expect(page.locator('a[href^="tel:"]').first()).toBeVisible({ timeout: 10_000 })

    // Kein wa.me-Link in OfferList (Offers haben kein whatsapp-Feld — Backend-Design)
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0)
  })
})

// ─── WhatsApp-Button: Mobile Layout ──────────────────────────────────────────

test.describe('WhatsApp-Button: Mobile (iPhone 14)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Kein horizontaler Scroll auf Mobile', async ({ page }) => {
    await page.goto('/')
    await waitForPageHydrated(page)
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const clientWidth = await page.evaluate(() => document.body.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5) // 5px Toleranz
  })
})
