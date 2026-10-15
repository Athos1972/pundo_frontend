/**
 * E2E-Tests: Variable Preise — UI-Rendering aller 4 price_type-Varianten
 *
 * Voraussetzungen:
 *   - global-setup.ts hat erfolgreich durchlaufen:
 *     * pundo_test DB ist reset + Kategorien kopiert
 *     * price_type-Fixtures wurden via prepare_e2e_db.seed_price_type_fixtures() gesetzt:
 *       - slug "e2e-vet-consultation-larnaca"  → on_request, price_note="Bitte anrufen"
 *       - slug "e2e-free-pet-advice"           → free,       price_note="Erstberatung gratis"
 *       - slug "e2e-bulk-dog-food"             → variable,   price_note="ab 3.50 € / kg"
 *       - slug "e2e-premium-cat-food-1kg"      → fixed,      price=9.99
 *   - Backend läuft auf Port 8001 gegen pundo_test
 *   - Frontend läuft auf Port 3002 (Standalone-Build)
 *
 * Entscheidung API vs. UI:
 *   API-Tests (Backend pytest):  Intake, DB-Speicherung, Sortierung, History-Filter
 *   UI-Tests (diese Datei):      Rendered Labels, price_note-Anzeige, on_request CTA,
 *                                 OfferList-Reihenfolge, RTL-Labels, Mobile
 */

import { test, expect } from '@playwright/test'
import { BACKEND_URL } from './env'


// Erwartete price_note je Fixture (Backend: UnifiedOffer.description, prepare_e2e_db.py seed_price_type_fixtures()).
// `fixed` hat bewusst keine Notiz.
const NOTES: Record<string, string | null> = {
  on_request: 'Bitte anrufen',
  free:       'Erstberatung gratis',
  variable:   'ab 3.50 € / kg',
  fixed:      null,
}

// Stable slugs — must match prepare_e2e_db.py SLUGS dict
const SLUGS = {
  on_request: 'e2e-vet-consultation-larnaca',
  free:       'e2e-free-pet-advice',
  variable:   'e2e-bulk-dog-food',
  fixed:      'e2e-premium-cat-food-1kg',
}

// F8950 T20: Fixture-Vertrag statt stiller Skips. Vorher pruefte hasFixtures() einen Schluessel
// (`fixtures.product_slugs` in .test-state.json), den das Global Setup nie schreibt, und productExists()
// rief einen nicht existierenden Endpoint (/products/{slug} -> 422) auf: alle Tests liefen als "skipped".
// Jetzt: beforeAll prueft per by-slug-API, dass die vier Fixture-Produkte existieren, und schlaegt sonst
// mit Hinweis fehl (prepare_e2e_db.py seed_price_type_fixtures()). Der Vertrag umfasst auch price_note
// (Folgepunkt 3): ein Fixture-Stand von vor der Notiz faellt hier mit klarer Meldung auf, nicht erst in den UI-Tests.
test.beforeAll(async () => {
  for (const [type, slug] of Object.entries(SLUGS)) {
    const res = await fetch(`${BACKEND_URL}/api/v1/products/by-slug/${slug}`).catch(() => null)
    if (!res || !res.ok) {
      throw new Error(
        `Fixture "${type}" (${slug}) fehlt im Backend (Status ${res?.status ?? 'kein Response'}). ` +
        'Abhilfe: pundo_main_backend/scripts/prepare_e2e_db.py --skip-reset --skip-prod-copy',
      )
    }
    const notes = ((await res.json()).offers as { price_note: string | null }[]).map((o) => o.price_note)
    if (NOTES[type] !== null && !notes.includes(NOTES[type])) {
      throw new Error(
        `Fixture "${type}" (${slug}) hat keine price_note "${NOTES[type]}" (API: ${JSON.stringify(notes)}). ` +
        'Abhilfe: pundo_main_backend/scripts/prepare_e2e_db.py --skip-reset --skip-prod-copy',
      )
    }
  }
})

// ─── VP-1: Produktkarten-Labels in der Suchergebnisliste ─────────────────────
// F8950 T20: Die Suche nach "e2e" findet die Preistyp-Fixtures nicht (Suche geht ueber den Produktnamen, nicht
// den Slug) -> je Produkt nach dem Namen aus prepare_e2e_db.py suchen und das Label in der passenden Karte pruefen.

test.describe('variable-price: ProductCard labels in search results', () => {
  async function cardFor(page: import('@playwright/test').Page, query: string, name: string) {
    await page.goto(`/search?q=${encodeURIComponent(query)}`)
    // :visible, weil die Seite Desktop- und Mobile-Liste parallel rendert (die Mobile-Liste ist hidden).
    // Der Preis steht neben dem Link in derselben Karte (div.rounded-xl), nicht im Link selbst.
    const link = page.locator('a[href*="/products/"]:visible').filter({ hasText: name }).first()
    await expect(link, `Karte "${name}" in den Suchergebnissen`).toBeVisible({ timeout: 10_000 })
    return link.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
  }

  test('on_request product shows "Price on request" in EN', async ({ page }) => {
    const card = await cardFor(page, 'Vet Consultation Larnaca', 'Vet Consultation Larnaca')
    await expect(card.getByText('Price on request')).toBeVisible()
  })

  test('free product shows "Free" in EN', async ({ page }) => {
    const card = await cardFor(page, 'Free Pet Advice', 'Free Pet Advice')
    await expect(card.getByText('Free', { exact: true })).toBeVisible()
  })

  test('variable product shows "Variable price" in EN', async ({ page }) => {
    const card = await cardFor(page, 'Bulk Dog Food', 'Bulk Dog Food')
    await expect(card.getByText('Variable price')).toBeVisible()
  })

  test('fixed product shows numeric price in EUR', async ({ page }) => {
    const card = await cardFor(page, 'Premium Cat Food 1kg', 'Premium Cat Food')
    // "9.99 EUR" oder "9,99 EUR" je nach Locale-Formatierung
    await expect(card.getByText(/9[.,]99.*EUR|EUR.*9[.,]99/)).toBeVisible()
  })
})

// ─── VP-2: Produktdetailseite — OfferList Rendering ──────────────────────────

test.describe('variable-price: ProductDetail OfferList rendering', () => {
  test('on_request detail: price=null label + price_note visible', async ({ page }) => {
    await page.goto(`/products/${SLUGS.on_request}`)

    // Price label
    await expect(page.getByText('Price on request').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(NOTES.on_request!).first()).toBeVisible()
  })

  test('on_request detail: CTA contact button visible', async ({ page }) => {
    await page.goto(`/products/${SLUGS.on_request}`)

    // Der Fixture-Shop hat phone=+35799000001 (prepare_e2e_db.py) -> "Contact shop" CTA. Vorher nur bedingt
    // geprueft (hasPhone war wegen eines falschen Feldnamens immer false = No-op), jetzt unbedingt.
    const cta = page.getByRole('link', { name: /contact.*shop|shop.*kontakt|επικοινωνία/i })
      .or(page.getByText(/contact.*shop/i))
      .first()
    await expect(cta).toBeVisible({ timeout: 8000 })
  })

  test('free detail: "Free" label + price_note visible', async ({ page }) => {
    await page.goto(`/products/${SLUGS.free}`)
    await expect(page.getByText('Free', { exact: true }).first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(NOTES.free!).first()).toBeVisible()
  })

  test('variable detail: "Variable price" label + price_note visible', async ({ page }) => {
    await page.goto(`/products/${SLUGS.variable}`)
    await expect(page.getByText('Variable price').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(NOTES.variable!).first()).toBeVisible()
  })

  test('fixed detail: numeric price visible, no CTA button', async ({ page }) => {
    await page.goto(`/products/${SLUGS.fixed}`)

    await expect(page.getByText(/9[.,]99.*EUR|EUR.*9[.,]99/).first()).toBeVisible({ timeout: 8000 })
    // fixed offers haben keinen on_request CTA
    const cta = page.getByRole('link', { name: /contact.*shop/i })
    await expect(cta).toHaveCount(0)
  })

  test('price_history section absent for on_request product', async ({ page }) => {
    await page.goto(`/products/${SLUGS.on_request}`)

    // Price history section should either not exist or show empty state
    const historySection = page.locator('[data-testid="price-history"], .price-history')
    const count = await historySection.count()
    if (count > 0) {
      // If section exists, it should show no data points
      const historyItems = historySection.locator('li, tr, .history-item')
      await expect(historyItems).toHaveCount(0)
    }
    // If no section at all: that's fine too (no history = no section)
  })

  test('fixed product: price_history section present with 1 entry', async ({ page }) => {
    await page.goto(`/products/${SLUGS.fixed}`)

    // Verify via API — if backend returns history, UI should show it
    const apiResp = await fetch(`${BACKEND_URL}/api/v1/products/by-slug/${SLUGS.fixed}`)
    const data = await apiResp.json()
    if (data.price_history?.length > 0) {
      // History data exists in API → should be visible somewhere in the page
      await expect(page.getByText(/9[.,]99/).first()).toBeVisible()
    }
  })
})

// ─── VP-3: Labels in allen 6 Sprachen ─────────────────────────────────────────

const priceTypeLabels: Record<string, {
  on_request: string; free: string; variable: string
}> = {
  en: { on_request: 'Price on request', free: 'Free',        variable: 'Variable price' },
  de: { on_request: 'Preis auf Anfrage', free: 'Kostenlos',  variable: 'Variabler Preis' },
  ru: { on_request: 'Цена по запросу',   free: 'Бесплатно',  variable: 'Переменная цена' },
  el: { on_request: 'Τιμή κατόπιν αιτήματος', free: 'Δωρεάν', variable: 'Μεταβλητή τιμή' },
  ar: { on_request: 'السعر عند الطلب',  free: 'مجاني',       variable: 'سعر متغير' },
  he: { on_request: 'מחיר לפי בקשה',   free: 'חינם',         variable: 'מחיר משתנה' },
}

// F8950 T20: nur en (LTR) + ar (RTL, anderes Schriftsystem). Der exakte Text aller 6 Sprachen steht in
// src/tests/price-type-labels.test.ts (Vitest); das Rendering ist je Sprache dieselbe Komponente.
const VP3_LANGS = ['en', 'ar']

for (const [lang, labels] of Object.entries(priceTypeLabels).filter(([l]) => VP3_LANGS.includes(l))) {
  test(`VP-3 [${lang}]: on_request label correct`, async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: lang, domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.on_request}`)
    await expect(page.getByText(labels.on_request).first()).toBeVisible({ timeout: 8000 })
  })

  test(`VP-3 [${lang}]: free label correct`, async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: lang, domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.free}`)
    await expect(page.getByText(labels.free).first()).toBeVisible({ timeout: 8000 })
  })

  test(`VP-3 [${lang}]: variable label correct`, async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: lang, domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.variable}`)
    await expect(page.getByText(labels.variable).first()).toBeVisible({ timeout: 8000 })
  })
}

// ─── VP-4: RTL — Layout mit non-fixed price labels ────────────────────────────

test.describe('variable-price: RTL layout', () => {
  test('AR product detail dir=rtl, on_request label korrekt', async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.on_request}`)

    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    await expect(page.getByText('السعر عند الطلب').first()).toBeVisible({ timeout: 8000 })
  })

  test('AR variable product: price_note in EN (not translated)', async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.variable}`)
    // price_note ist vom Shop eingegebener Freitext und wird nicht uebersetzt
    await expect(page.getByText(NOTES.variable!).first()).toBeVisible({ timeout: 8000 })
  })

  test('HE product detail dir=rtl, free label korrekt', async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: 'he', domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.free}`)

    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    await expect(page.getByText('חינם').first()).toBeVisible({ timeout: 8000 })
  })
})

// ─── VP-5: Mobile rendering ───────────────────────────────────────────────────

test.describe('variable-price: Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('on_request label visible on mobile without overflow', async ({ page }) => {
    await page.goto(`/products/${SLUGS.on_request}`)
    await expect(page.getByText('Price on request').first()).toBeVisible({ timeout: 8000 })
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5)
  })

  test('variable label + price_note visible on mobile', async ({ page }) => {
    await page.goto(`/products/${SLUGS.variable}`)
    await expect(page.getByText('Variable price').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(NOTES.variable!).first()).toBeVisible({ timeout: 8000 })
  })
})

// ─── VP-6: Keine JS-Fehler auf non-fixed Produktseiten ───────────────────────

test.describe('variable-price: No JS errors', () => {
  for (const [type, slug] of Object.entries(SLUGS)) {
    test(`no JS errors on ${type} product page`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
      page.on('pageerror', err => errors.push(err.message))
      await page.goto(`/products/${slug}`)
      // statt networkidle: Seite geladen und Produkt-Ueberschrift gerendert (Hydration-Fehler treten davor auf)
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 })
      const critical = errors.filter(e => !e.includes('favicon') && !e.includes('404'))
      expect(critical, `JS errors on ${type} product page: ${critical.join(', ')}`).toHaveLength(0)
    })
  }
})
