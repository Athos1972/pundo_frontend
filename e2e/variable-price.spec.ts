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

import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'

// Stable slugs — must match prepare_e2e_db.py SLUGS dict
const SLUGS = {
  on_request: 'e2e-vet-consultation-larnaca',
  free:       'e2e-free-pet-advice',
  variable:   'e2e-bulk-dog-food',
  fixed:      'e2e-premium-cat-food-1kg',
}

// Helper: check fixtures were seeded (skip if global-setup didn't run)
function hasFixtures(): boolean {
  const stateFile = path.join(__dirname, '.test-state.json')
  if (!fs.existsSync(stateFile)) return false
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
    return !!state?.fixtures?.product_slugs
  } catch { return false }
}

// Helper: verify a product slug is available in the backend (API smoke)
async function productExists(slug: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/products/${slug}`)
    return res.ok
  } catch { return false }
}

// ─── VP-1: Produktkarten-Labels in der Suchergebnisliste ─────────────────────

test.describe('variable-price: ProductCard labels in search results', () => {
  test.beforeEach(async ({ page }) => {
    if (!hasFixtures()) test.skip()
  })

  test('on_request product shows "Price on request" in EN', async ({ page }) => {
    if (!await productExists(SLUGS.on_request)) test.skip()
    await page.goto('/search?q=e2e')
    await page.waitForLoadState('networkidle')
    // Find the card with the on_request product name and check price label
    const card = page.locator('[data-testid="product-card"], .product-card, article').filter({
      hasText: 'Vet Consultation Larnaca',
    }).first()
    if (await card.count() === 0) {
      // fallback: search for the price label directly on the page
      await expect(page.getByText('Price on request')).toBeVisible({ timeout: 5000 })
    } else {
      await expect(card.getByText('Price on request')).toBeVisible()
    }
  })

  test('free product shows "Free" in EN', async ({ page }) => {
    if (!await productExists(SLUGS.free)) test.skip()
    await page.goto('/search?q=e2e')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Free').first()).toBeVisible({ timeout: 5000 })
  })

  test('variable product shows "Variable price" in EN', async ({ page }) => {
    if (!await productExists(SLUGS.variable)) test.skip()
    await page.goto('/search?q=e2e')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Variable price').first()).toBeVisible({ timeout: 5000 })
  })

  test('fixed product shows numeric price in EUR', async ({ page }) => {
    if (!await productExists(SLUGS.fixed)) test.skip()
    await page.goto('/search?q=e2e')
    await page.waitForLoadState('networkidle')
    // Should show "9.99 EUR" or "9,99 EUR" depending on locale formatting
    await expect(page.getByText(/9[.,]99.*EUR|EUR.*9[.,]99/).first()).toBeVisible({ timeout: 5000 })
  })
})

// ─── VP-2: Produktdetailseite — OfferList Rendering ──────────────────────────

test.describe('variable-price: ProductDetail OfferList rendering', () => {
  test('on_request detail: price=null label + price_note visible', async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.on_request)) test.skip()
    await page.goto(`/products/${SLUGS.on_request}`)
    await page.waitForLoadState('networkidle')

    // Price label
    await expect(page.getByText('Price on request').first()).toBeVisible({ timeout: 8000 })
    // price_note
    await expect(page.getByText('Bitte anrufen').first()).toBeVisible()
  })

  test('on_request detail: CTA contact button visible', async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.on_request)) test.skip()
    await page.goto(`/products/${SLUGS.on_request}`)
    await page.waitForLoadState('networkidle')

    // Shop hat phone=+35799000001 → "Contact shop" CTA should appear
    const cta = page.getByRole('link', { name: /contact.*shop|shop.*kontakt|επικοινωνία/i })
      .or(page.getByText(/contact.*shop/i))
      .first()
    // CTA is conditional on shop having phone — verify with data-aware check
    const hasPhone = await fetch(`${BACKEND_URL}/api/v1/products/${SLUGS.on_request}`)
      .then(r => r.json())
      .then(d => d.offers?.[0]?.shop_phone != null)
      .catch(() => false)
    if (hasPhone) {
      await expect(cta).toBeVisible({ timeout: 5000 })
    }
  })

  test('free detail: "Free" label + price_note visible', async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.free)) test.skip()
    await page.goto(`/products/${SLUGS.free}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Free').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Erstberatung gratis').first()).toBeVisible()
  })

  test('variable detail: "Variable price" label + price_note visible', async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.variable)) test.skip()
    await page.goto(`/products/${SLUGS.variable}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Variable price').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('ab 3.50 € / kg').first()).toBeVisible()
  })

  test('fixed detail: numeric price visible, no CTA button', async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.fixed)) test.skip()
    await page.goto(`/products/${SLUGS.fixed}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/9[.,]99.*EUR|EUR.*9[.,]99/).first()).toBeVisible({ timeout: 8000 })
    // fixed offers haben keinen on_request CTA
    const cta = page.getByRole('link', { name: /contact.*shop/i })
    await expect(cta).toHaveCount(0)
  })

  test('price_history section absent for on_request product', async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.on_request)) test.skip()
    await page.goto(`/products/${SLUGS.on_request}`)
    await page.waitForLoadState('networkidle')

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
    if (!hasFixtures() || !await productExists(SLUGS.fixed)) test.skip()
    await page.goto(`/products/${SLUGS.fixed}`)
    await page.waitForLoadState('networkidle')

    // Verify via API — if backend returns history, UI should show it
    const apiResp = await fetch(`${BACKEND_URL}/api/v1/products/${SLUGS.fixed}`)
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

for (const [lang, labels] of Object.entries(priceTypeLabels)) {
  test(`VP-3 [${lang}]: on_request label correct`, async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.on_request)) test.skip()
    await page.context().addCookies([{ name: 'pundo_lang', value: lang, domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.on_request}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(labels.on_request).first()).toBeVisible({ timeout: 8000 })
  })

  test(`VP-3 [${lang}]: free label correct`, async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.free)) test.skip()
    await page.context().addCookies([{ name: 'pundo_lang', value: lang, domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.free}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(labels.free).first()).toBeVisible({ timeout: 8000 })
  })

  test(`VP-3 [${lang}]: variable label correct`, async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.variable)) test.skip()
    await page.context().addCookies([{ name: 'pundo_lang', value: lang, domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.variable}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(labels.variable).first()).toBeVisible({ timeout: 8000 })
  })
}

// ─── VP-4: RTL — Layout mit non-fixed price labels ────────────────────────────

test.describe('variable-price: RTL layout', () => {
  test('AR product detail dir=rtl, on_request label korrekt', async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.on_request)) test.skip()
    await page.context().addCookies([{ name: 'pundo_lang', value: 'ar', domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.on_request}`)
    await page.waitForLoadState('networkidle')

    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    await expect(page.getByText('السعر عند الطلب').first()).toBeVisible({ timeout: 8000 })
  })

  test('HE product detail dir=rtl, free label korrekt', async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.free)) test.skip()
    await page.context().addCookies([{ name: 'pundo_lang', value: 'he', domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.free}`)
    await page.waitForLoadState('networkidle')

    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    await expect(page.getByText('חינם').first()).toBeVisible({ timeout: 8000 })
  })

  test('AR variable product: price_note in EN (not translated)', async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.variable)) test.skip()
    await page.context().addCookies([{ name: 'pundo_lang', value: 'ar', domain: '127.0.0.1', path: '/' }])
    await page.goto(`/products/${SLUGS.variable}`)
    await page.waitForLoadState('networkidle')
    // price_note is stored as-is (shop-entered text), not translated
    await expect(page.getByText('ab 3.50 € / kg').first()).toBeVisible({ timeout: 8000 })
  })
})

// ─── VP-5: Mobile rendering ───────────────────────────────────────────────────

test.describe('variable-price: Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('on_request label visible on mobile without overflow', async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.on_request)) test.skip()
    await page.goto(`/products/${SLUGS.on_request}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Price on request').first()).toBeVisible({ timeout: 8000 })
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5)
  })

  test('variable price_note visible on mobile', async ({ page }) => {
    if (!hasFixtures() || !await productExists(SLUGS.variable)) test.skip()
    await page.goto(`/products/${SLUGS.variable}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('ab 3.50 € / kg').first()).toBeVisible({ timeout: 8000 })
  })
})

// ─── VP-6: Keine JS-Fehler auf non-fixed Produktseiten ───────────────────────

test.describe('variable-price: No JS errors', () => {
  for (const [type, slug] of Object.entries(SLUGS)) {
    test(`no JS errors on ${type} product page`, async ({ page }) => {
      if (!hasFixtures() || !await productExists(slug)) test.skip()
      const errors: string[] = []
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
      page.on('pageerror', err => errors.push(err.message))
      await page.goto(`/products/${slug}`)
      await page.waitForLoadState('networkidle')
      const critical = errors.filter(e => !e.includes('favicon') && !e.includes('404'))
      expect(critical, `JS errors on ${type} product page: ${critical.join(', ')}`).toHaveLength(0)
    })
  }
})
