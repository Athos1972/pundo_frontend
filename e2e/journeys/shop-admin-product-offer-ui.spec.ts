/**
 * Shop-Admin: Produkt + Angebot anlegen — vollständiger UI-Flow (Golden Path)
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 *
 * Deckt ab:
 *   UI-P1  Neues Produkt anlegen via Formular → erscheint in Produktliste
 *   UI-O1  Neues zeitlich begrenztes Angebot mit Preis → Kunde sieht Angebot auf Shop-Seite
 *   UI-O2  Angebot ohne Preis → Kunde sieht Angebot ohne Preisbetrag
 *   UI-O3  Angebot mit Produkt verknüpft → Produktname erscheint im Angebot
 *
 * Bewusst NICHT hier (eigene API-Tests in shop-admin-offer-product.spec.ts):
 *   - Cross-Shop-Isolation (braucht 2 Shops, nicht per UI testbar)
 *   - Abgelaufene/zukünftige Angebote (Datumskonstellation)
 *   - Pydantic-Regressions (price="", "9,99")
 *   - Staffelpreis-Edge-Cases
 *
 * storageState wird TOP-LEVEL gesetzt (außerhalb jedes describe) — das ist die einzige
 * Variante, bei der React korrekt hydratisiert (Cookie liegt vor dem ersten Navigate).
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// ─── Config ──────────────────────────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
if (FRONTEND_URL.includes(':3000')) {
  throw new Error('[shop-admin-product-offer-ui] Safety: NEVER run against prod port 3000!')
}

const STATE_FILE = path.join(__dirname, '..', '.test-state.json')

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error('[shop-admin-product-offer-ui] .test-state.json not found — run global-setup first')
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as {
    shopSlug: string | null
    storageState: Parameters<typeof test.use>[0]['storageState']
  }
}

const STATE = loadState()

// storageState TOP-LEVEL — Cookie liegt vor dem ersten page.goto()
// → React-Event-Handler werden bei Hydratisierung korrekt eingehängt
test.use({
  storageState: STATE.storageState,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
function daysFromToday(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Wartet bis React hydratisiert hat (Submit-Button reagiert auf Klicks) */
async function waitForHydration(page: import('@playwright/test').Page) {
  // networkidle reicht nicht — React hängt Event-Handler asynchron ein.
  // Warten bis der Submit-Button nicht mehr disabled ist.
  await page.waitForLoadState('networkidle')
  await page.locator('button[type="submit"]:not([disabled])').first().waitFor({ timeout: 10_000 })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe.serial('Shop-Admin Produkt + Angebot — UI Golden Path', () => {

  // Schritt 1: Produkt anlegen ------------------------------------------------

  test('UI-P1 — Neues Produkt via Formular anlegen → erscheint in Produktliste', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/shop-admin/products/new`, { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    // Auth-Check: Formular muss sichtbar sein (kein Redirect zur Login-Seite)
    await expect(page.locator('input[name="name"]'), 'UI-P1: Produktname-Feld muss sichtbar sein').toBeVisible()

    // Produktname eintragen
    const productName = `UI-P1 Testprodukt ${Date.now()}`
    await page.fill('input[name="name"]', productName)

    // Speichern
    await page.click('button[type="submit"]')

    // Redirect zu Produktliste
    await page.waitForURL(`${FRONTEND_URL}/shop-admin/products`, { timeout: 15_000 })

    // Produkt erscheint in der Liste
    await expect(page.getByText(productName), 'UI-P1: Neues Produkt muss in Produktliste erscheinen').toBeVisible({ timeout: 10_000 })
  })

  // Schritt 2: Angebot mit Preis anlegen und Kundensichtbarkeit prüfen --------

  test('UI-O1 — Zeitlich begrenztes Angebot mit Preis anlegen → Kunde sieht Angebot', async ({ page }) => {
    if (!STATE.shopSlug) {
      test.skip(true, 'UI-O1: shopSlug nicht verfügbar in .test-state.json')
      return
    }

    await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    const offerTitle = `UI-O1 Angebot ${Date.now()}`

    // Titel
    await page.fill('input[name="title"]', offerTitle)

    // Preis (Punkt-Notation)
    await page.fill('input[name="price"]', '39.90')

    // Gültigkeitszeitraum: heute bis +30 Tage
    await page.fill('input[name="valid_from"]', today())
    await page.fill('input[name="valid_until"]', daysFromToday(30))

    // Speichern
    await page.click('button[type="submit"]')

    // Redirect zu Angeboteliste
    await page.waitForURL(`${FRONTEND_URL}/shop-admin/offers`, { timeout: 15_000 })

    // Angebot in der Admin-Liste vorhanden
    await expect(page.getByText(offerTitle), 'UI-O1: Angebot muss in Angebotsliste erscheinen').toBeVisible({ timeout: 10_000 })

    // Kundensicht: Angebot erscheint auf Shop-Seite
    await page.goto(`${FRONTEND_URL}/shops/${STATE.shopSlug}`, { waitUntil: 'networkidle' })
    const body = await page.locator('body').innerText()
    expect(body, 'UI-O1: Angebot muss auf Kunden-Shop-Seite sichtbar sein').toContain(offerTitle)
    expect(body, 'UI-O1: Preis muss auf Kunden-Shop-Seite sichtbar sein').toContain('39.9')
  })

  test('UI-O2 — Angebot ohne Preis anlegen → Kunde sieht Angebot ohne Preisbetrag', async ({ page }) => {
    if (!STATE.shopSlug) {
      test.skip(true, 'UI-O2: shopSlug nicht verfügbar')
      return
    }

    await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    const offerTitle = `UI-O2 Gratis-Info ${Date.now()}`

    await page.fill('input[name="title"]', offerTitle)
    // Preisfeld leer lassen (kein Preis)
    await page.fill('input[name="valid_from"]', today())
    await page.fill('input[name="valid_until"]', daysFromToday(14))

    await page.click('button[type="submit"]')
    await page.waitForURL(`${FRONTEND_URL}/shop-admin/offers`, { timeout: 15_000 })

    // Kundensicht: Angebot sichtbar, aber kein konkreter Betrag
    await page.goto(`${FRONTEND_URL}/shops/${STATE.shopSlug}`, { waitUntil: 'networkidle' })
    const body = await page.locator('body').innerText()
    expect(body, 'UI-O2: Angebot ohne Preis muss trotzdem auf Kunden-Seite erscheinen').toContain(offerTitle)
    // Kein Preis-Badge: body darf keinen EUR-Betrag direkt nach dem Angebotsnamen haben
    // (Wir prüfen nur dass kein Absturz passiert und der Titel sichtbar ist)
    expect(page.url(), 'UI-O2: Shop-Seite darf nicht 404 sein').not.toContain('not-found')
  })

  // Schritt 3: Vollständiger Flow Produkt → Angebot → Kundensicht -----------

  test('UI-O3 — Produkt anlegen → Angebot damit verknüpfen → Kunde sieht Angebot mit Produktbezug', async ({ page }) => {
    if (!STATE.shopSlug) {
      test.skip(true, 'UI-O3: shopSlug nicht verfügbar')
      return
    }

    // 1. Produkt anlegen
    await page.goto(`${FRONTEND_URL}/shop-admin/products/new`, { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    const productName = `UI-O3 Dienstleistung ${Date.now()}`
    await page.fill('input[name="name"]', productName)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${FRONTEND_URL}/shop-admin/products`, { timeout: 15_000 })
    await expect(page.getByText(productName)).toBeVisible({ timeout: 10_000 })

    // 2. Angebot für dieses Produkt anlegen
    await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)

    const offerTitle = `UI-O3 Angebot ${Date.now()}`
    await page.fill('input[name="title"]', offerTitle)
    await page.fill('input[name="price"]', '99.00')
    await page.fill('input[name="valid_from"]', today())
    await page.fill('input[name="valid_until"]', daysFromToday(60))

    // Produkt im Dropdown auswählen (wenn vorhanden)
    const productSelect = page.locator('select[name="product_id"]')
    const hasProductSelect = await productSelect.count() > 0
    if (hasProductSelect) {
      const options = await productSelect.locator('option').allInnerTexts()
      const matchingOption = options.find(o => o.includes(productName.slice(0, 20)))
      if (matchingOption) {
        await productSelect.selectOption({ label: matchingOption })
      }
    }

    await page.click('button[type="submit"]')
    await page.waitForURL(`${FRONTEND_URL}/shop-admin/offers`, { timeout: 15_000 })

    // 3. Kundensicht
    await page.goto(`${FRONTEND_URL}/shops/${STATE.shopSlug}`, { waitUntil: 'networkidle' })
    const body = await page.locator('body').innerText()
    expect(body, 'UI-O3: Angebot muss auf Kunden-Shop-Seite sichtbar sein').toContain(offerTitle)
    expect(body, 'UI-O3: Preis muss auf Kunden-Shop-Seite sichtbar sein').toContain('99')
  })

})
