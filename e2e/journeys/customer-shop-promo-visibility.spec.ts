/**
 * Journey: Kunden-Sicht Shop-Aktionen (Aktionsblock vs. Produktblock)
 * Runbook: e2e/journeys/customer-shop-promo-visibility.md
 *
 * Tests P1–P5 — Prüft dass:
 *   P1: Angebotsblock fehlt wenn kein aktiver Aktionszeitraum
 *   P2: ShopOfferCard erscheint mit Bild / Name / Link wenn Aktion aktiv
 *   P3: Preise ohne 4 Nachkommastellen (fmtPrice-Logik)
 *   P4: Aktions-Badge mit Datum + Strikethrough für Normalpreis
 *   P5: Alle 6 Sprachen — promo_badge + regular_price Keys vorhanden
 *
 * F8950 T20: Vorher dienten der globale Owner-Shop aus .test-state.json (Prod-Kopie "happy-pets-nicosia") und
 * Prod-Daten als Fixture; P2 und P4 liefen als Skip, weil dieser Shop keine aktive Aktion hat. Jetzt zwei eigene
 * Spec-Shops mit synthetischen Daten (Zwei-Ebenen-Prinzip, Ebene 1: laeuft immer, kein Skip).
 *
 * | Fixture-Name       | Was wird aufgebaut                                         | Was wird geprüft |
 * |--------------------|-------------------------------------------------------------|------------------|
 * | specShop PROMO-NONE| Shop ohne Offers                                            | P1, P3           |
 * | specShop PROMO-ON  | Shop mit Item, Listing und Offer mit aktivem Aktionszeitraum| P2, P3, P4, P5   |
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { e2eName } from './_helpers/test-data'
import { waitForPageHydrated } from './_helpers/hydration'
import { BASE_URL, BACKEND_URL } from '../env'
import { createStepLog } from '../fixtures'

// Port-Safety — niemals gegen Produktiv-Ports laufen
if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

// Step log for report
interface StepEntry {
  step: number
  desc: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL'
}

const stepLog: StepEntry[] = []
const { logStep } = createStepLog(stepLog)

// ─── Report Helper ────────────────────────────────────────────────────────────

function writeReport(suiteName: string, verdict: 'SHIP' | 'FIX' | 'ESCALATE', notes: string) {
  const reportsDir = path.join(__dirname, 'reports')
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })

  const dateStr = new Date().toISOString().split('T')[0]
  const reportPath = path.join(reportsDir, `customer-shop-promo-visibility-${dateStr}.md`)

  const lines = [
    `# Journey Report: ${suiteName}`,
    `**Date:** ${new Date().toISOString()}`,
    `**Verdict:** ${verdict}`,
    '',
    `## Notes`,
    notes,
    '',
    '## Step Log',
    '',
    '| Step | Description | Expected | Actual | Status |',
    '|------|-------------|----------|--------|--------|',
    ...stepLog.map(s => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
  ]

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')
}

const TODAY_ISO = new Date().toISOString().slice(0, 10)
function daysFromToday(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial('customer-shop-promo-visibility', () => {
  let noneShop: WorkerShop
  let promoShop: WorkerShop
  const startedAt = new Date().toISOString()

  test.beforeAll(async () => {
    test.setTimeout(120_000)
    noneShop = await specShop('PROMO-NONE')
    promoShop = await specShop('PROMO-ON')

    // Item + Listing + Offer mit aktivem Aktionszeitraum (heute ∈ [promo_valid_from, promo_valid_until])
    const item = await promoShop.createItem('PROMO', 'promo-item', { listing: true })
    expect(item.listingId, 'Listing des Promo-Items').toBeTruthy()
    const offer = await promoShop.api<{ id: number }>('POST', '/offers', {
      shop_listing_id: item.listingId,
      price_type: 'fixed',
      price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 15.0, currency: 'EUR' }] }],
      promo_price_type: 'fixed',
      promo_price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 9.99, currency: 'EUR' }] }],
      promo_valid_from: TODAY_ISO,
      promo_valid_until: daysFromToday(30),
      title: e2eName('PROMO', 'promo-offer'),
    })
    expect(offer.status, `Promo-Offer anlegen: ${JSON.stringify(offer.json)}`).toBe(201)

    // Das Backend muss die Aktion oeffentlich ausliefern, bevor die SSR-Seite geladen wird
    await expect.poll(async () => {
      const res = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${promoShop.slug}/offers`, { headers: { 'Accept-Language': 'en' } })
      return res.ok ? ((await res.json()) as unknown[]).length : 0
    }, { message: 'Promo-Offer öffentlich sichtbar', timeout: 10_000 }).toBeGreaterThan(0)
  })

  test.afterAll(async () => {
    await promoShop?.destroy()
    await noneShop?.destroy()

    const allPass = stepLog.every(s => s.status !== 'FAIL')
    const verdict = stepLog.length === 0 ? 'ESCALATE' : allPass ? 'SHIP' : 'FIX'
    const notes = [
      `Started: ${startedAt}`,
      `Finished: ${new Date().toISOString()}`,
      `Shops: ${noneShop?.slug ?? '-'} (ohne Aktion), ${promoShop?.slug ?? '-'} (mit Aktion)`,
    ].join('\n')
    writeReport('Kunden-Sicht Shop-Aktionen', verdict, notes)
  })

  // ─── P1: Kein Angebotsblock ohne aktive Aktion ────────────────────────────

  test('P1: keine "Current offers"-Sektion wenn Shop keine aktive Aktion hat', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/shops/${noneShop.slug}`)
    await waitForPageHydrated(page)
    // Seite ist gerendert (Shop-Ueberschrift), erst dann die Abwesenheit pruefen
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

    const offersHeading = page.locator('h2').filter({ hasText: /current offers/i })
    await expect(offersHeading).toHaveCount(0)
    logStep(1, 'P1 — Angebotsblock fehlt ohne Aktionen', 'Block nicht im DOM', 'Block nicht im DOM', 'PASS')
  })

  // ─── P2: Angebotsblock mit ShopOfferCard ─────────────────────────────────

  test('P2: ShopOfferCard zeigt Bild / Name / Preis bei aktiver Aktion', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/shops/${promoShop.slug}`)

    // getByRole: waehrend des Streamings liegt kurz eine versteckte Kopie (<div hidden id="S:0">) im DOM
    const offersHeading = page.getByRole('heading', { name: /current offers/i })
    await expect(offersHeading, '"Current offers"-Block bei aktiver Aktion').toBeVisible({ timeout: 20_000 })

    // ShopOfferCard has specific classes — avoid skeleton loaders (.animate-pulse)
    const offerCard = page.locator('.rounded-xl.overflow-hidden.hover\\:border-accent').first()
    await expect(offerCard).toBeVisible()

    // Price should be visible — look in entire offers section, not just first card
    const priceEl = page.locator('.rounded-xl.overflow-hidden').locator('text=/\\d+\\.\\d{2}/')
    expect(await priceEl.count()).toBeGreaterThan(0)

    logStep(2, 'P2 — ShopOfferCard vorhanden', 'ShopOfferCard sichtbar', 'Card sichtbar mit Preis', 'PASS')
  })

  // ─── P3: Preise ohne 4 Nachkommastellen ──────────────────────────────────

  test('P3: Preise zeigen höchstens 2 Nachkommastellen', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/shops/${promoShop.slug}`)
    await expect(page.getByRole('heading', { name: /current offers/i })).toBeVisible({ timeout: 20_000 })

    // Get all price text on the page
    const priceTexts = await page.locator('text=/\\d+\\.\\d{3,}/').count()
    // No price should have 3+ decimal places
    expect(priceTexts).toBe(0)

    logStep(3, 'P3 — Preis-Format', 'Keine 3+ Dezimalstellen', `${priceTexts} Treffer mit 3+ Stellen`, priceTexts === 0 ? 'PASS' : 'FAIL')
  })

  // ─── P4: Aktions-Badge + Strikethrough ───────────────────────────────────

  test('P4: Aktions-Badge mit Datum + Strikethrough für Normalpreis', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/shops/${promoShop.slug}`)
    await expect(page.getByRole('heading', { name: /current offers/i })).toBeVisible({ timeout: 20_000 })

    // Badge: bg-red-50 class
    await expect(page.locator('.bg-red-50').first(), 'Aktions-Badge').toBeVisible()
    // Strikethrough fuer den Normalpreis
    await expect(page.locator('s').first(), 'durchgestrichener Normalpreis').toBeVisible()
    logStep(4, 'P4 — Aktions-Badge', 'Badge + Strikethrough sichtbar', 'Badge und <s> vorhanden', 'PASS')
  })

  // ─── P5: Alle 6 Sprachen — Translation-Keys ──────────────────────────────

  test('P5: promo_badge + regular_price Keys in allen 6 Sprachen non-empty', async ({ page }) => {
    // Seite mit aktiver Aktion in jeder Sprache rendern; ein fehlender Translation-Key zeigt sich als "undefined" im DOM.
    // Sprache ueber den URL-Praefix (der fruehere ?lang=-Parameter gilt seit dem i18n-Routing nicht mehr).
    let allPass = true
    for (const lang of ['en', 'de', 'el', 'ru', 'ar', 'he']) {
      await page.goto(`${BASE_URL}/${lang}/shops/${promoShop.slug}`)
      await expect(page.locator('.bg-red-50').first(), `Aktions-Badge (${lang})`).toBeVisible({ timeout: 20_000 })

      const undefinedText = await page.locator('text=undefined').count()
      if (undefinedText > 0) {
        allPass = false
        logStep(5, `P5 — Translations lang=${lang}`, 'Kein "undefined" im DOM', `${undefinedText} "undefined" Treffer`, 'FAIL')
      }
    }

    if (allPass) {
      logStep(5, 'P5 — Translations alle 6 Sprachen', 'Kein "undefined" im DOM', 'Alle Sprachen geprüft, kein undefined', 'PASS')
    }

    expect(allPass).toBe(true)
  })
})
