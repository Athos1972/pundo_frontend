import { test, expect } from '@playwright/test'
import { waitForPageHydrated } from './journeys/_helpers/hydration'

test.describe('F2360 — Kuratierte Homepage-Kategorien', () => {

  test('AC4: Startseite zeigt genau 4 Chips + +N Button', async ({ page }) => {
    await page.goto('/en')
    await waitForPageHydrated(page)
    // Kategorie-Links (nicht der +N Button)
    // :visible — waehrend des Streamings liegt kurz eine versteckte Kopie im DOM (docs/e2e-testing.md)
    const catLinks = page.locator('a[href*="category_id="]:visible')
    await expect(catLinks).toHaveCount(4) // VISIBLE_MAX = 4
    // +N Button (button, kein Link)
    const expandBtn = page.locator('button:visible').filter({ hasText: /^\+\d+$/ })
    await expect(expandBtn).toBeVisible()
  })

  test('AC5+6: +N Button klappt alle Chips auf, Weniger anzeigen klappt zurück', async ({ page }) => {
    await page.goto('/en')
    await waitForPageHydrated(page)
    // Initial: 4 Links
    const catLinks = page.locator('a[href*="category_id="]:visible')
    await expect(catLinks).toHaveCount(4)
    // +N klicken
    const expandBtn = page.locator('button:visible').filter({ hasText: /^\+\d+$/ })
    await expandBtn.click()
    // Jetzt mehr als 4
    const expanded = await catLinks.count()
    expect(expanded).toBeGreaterThan(4)
    // "Show less" / "Weniger anzeigen" Button sichtbar (i18n — suche per Text)
    const collapseBtn = page.locator('button:visible').filter({ hasText: /show less|weniger|εμφάνιση|показать|עرض|הצג פחות/i })
    await expect(collapseBtn).toBeVisible()
    await collapseBtn.click()
    // Zurück auf 4
    await expect(catLinks).toHaveCount(4)
  })

  // Seit 39e4ef0 (2026-06-05) trägt der Chip-Link nur noch category_id; den Namen lädt die
  // Suchseite selbst über die API (SearchContent → getCategories({ ids })). Unit-Test:
  // src/tests/CategoryChips.test.tsx "includes only category_id in link href (no category_name)".
  test('AC7: Chip-Link enthält category_id (ohne category_name)', async ({ page }) => {
    await page.goto('/en')
    await waitForPageHydrated(page)
    const firstLink = page.locator('a[href*="category_id="]:visible').first()
    const href = await firstLink.getAttribute('href')
    expect(href).toMatch(/^\/en\/search\?category_id=\d+$/)
    expect(href).not.toContain('category_name=')
  })

  test('AC1: Steuerfile-IDs werden geladen (nicht only_with_products Fallback)', async ({ page }) => {
    // Steuerfile enthält spezifische IDs — prüfe dass mind. 1 aus dem File kommt
    // Featured IDs aus dem File: 2988 = Apparel, 3228 = Arts, etc.
    await page.goto('/en')
    await waitForPageHydrated(page)
    const links = page.locator('a[href*="category_id="]:visible')
    const hrefs = await links.evaluateAll(els => els.map(e => e.getAttribute('href')))
    const ids = hrefs.map(h => {
      const m = h?.match(/category_id=(\d+)/)
      return m ? Number(m[1]) : null
    }).filter(Boolean)
    // Mindestens eine ID aus dem Steuerfile (2988, 3228, 3728, etc.)
    const knownFeaturedIds = [2988, 3228, 3728, 3815, 4039, 4143, 8458]
    expect(ids.some(id => knownFeaturedIds.includes(id as number))).toBe(true)
  })

  test('AC3: Nicht-existente IDs im Steuerfile crashen nicht', async ({ page }) => {
    // Die App sollte auch rendern wenn eine ID fehlt; kein White Screen
    // Status aus page.goto() auslesen — kein separater page.request.get() nötig (ECONNREFUSED-anfällig)
    const response = await page.goto('/en')
    await waitForPageHydrated(page)
    // Kein 5xx Error
    expect(response?.status() ?? 200).toBeLessThan(500)
    // Suchleiste vorhanden = Seite hat geladen
    await expect(page.locator('input[type="search"], [placeholder*="Find"], [placeholder*="Produkt"]').first()).toBeVisible()
  })

})
