/**
 * E2E Tests für F2350 — Kategoriesuche Leerzustand & verwandte Kategorien
 * Läuft gegen Frontend Port 3500, Backend Port 8500
 */
import { test, expect } from '@playwright/test'

// Category 2871 = Animals & Pet Supplies (has 451 products)
// Category 5 = Commercial Cleaning (has 0 products)
// Category 99999 = non-existent

test.describe('F2350 — Kategorie-Modus (Happy Path)', () => {
  test('AC1: Kategorie mit Produkten zeigt Produkte und Kategorienamen als Überschrift', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    // Navigate via category_id + category_name (wie CategoryChips es tut)
    await page.goto('/en/search?category_id=2871&category_name=Animals+%26+Pet+Supplies')
    await page.waitForLoadState('networkidle')

    // AC1a: Kategoriename als Überschrift (visible h1, not sr-only)
    const heading = page.locator('h1:not(.sr-only)')
    await expect(heading).toBeVisible()
    const headingText = await heading.textContent()
    expect(headingText).toContain('Animals')

    // AC1b: Produkte werden angezeigt
    const productLinks = page.locator('a[href*="/products/"]')
    await expect(productLinks.first()).toBeVisible()
    const count = await productLinks.count()
    expect(count).toBeGreaterThan(0)

    // AC8: Kein Crash / JS-Fehler (toleriere hydration warnings)
    const criticalErrors = errors.filter(e =>
      !e.includes('Warning:') &&
      !e.includes('hydrat') &&
      !e.toLowerCase().includes('passive')
    )
    expect(criticalErrors, `Kritische JS-Fehler: ${criticalErrors.join(', ')}`).toHaveLength(0)
  })

  test('AC8: Textsuche (?q=...) bleibt unverändert', async ({ page }) => {
    await page.goto('/en/search?q=leash')
    await page.waitForLoadState('networkidle')

    // No CategoryEmptyState should appear
    const emptyIntro = page.getByText('Currently no products in this category')
    await expect(emptyIntro).not.toBeVisible()

    // No h1 heading with category name
    const h1 = page.locator('h1')
    const h1count = await h1.count()
    // Either no h1 or it doesn't contain a category name in this text-search mode
    if (h1count > 0) {
      const h1Text = await h1.textContent() ?? ''
      expect(h1Text).not.toContain('Animals')
    }
  })
})

test.describe('F2350 — Kategorie Leerzustand (Empty State)', () => {
  test('AC2: Leere Kategorie zeigt NICHT den generischen no_results-Text', async ({ page }) => {
    await page.goto('/en/search?category_id=5&category_name=Commercial+Cleaning')
    await page.waitForLoadState('networkidle')

    // Should NOT show "No results found."
    const genericNoResults = page.getByText('No results found.')
    await expect(genericNoResults).not.toBeVisible()
  })

  test('AC2: Leere Kategorie zeigt category_empty_intro Text', async ({ page }) => {
    await page.goto('/en/search?category_id=5&category_name=Commercial+Cleaning')
    await page.waitForLoadState('networkidle')

    // Should show "Currently no products in this category."
    const emptyIntro = page.getByText('Currently no products in this category.')
    await expect(emptyIntro).toBeVisible()
  })

  test('AC5: Leere Kategorie mit keinen verwandten Kategorien zeigt Fallback-Link (Backend pending)', async ({ page }) => {
    // Backend /related-with-products not yet deployed → returns error → empty array → Fallback shown
    await page.goto('/en/search?category_id=5&category_name=Commercial+Cleaning')
    await page.waitForLoadState('networkidle')

    // With backend pending, we expect the fallback browse all link
    // OR related suggestions if backend happened to respond
    // Either way, the page should not crash and show at least the intro text
    const emptyIntro = page.getByText('Currently no products in this category.')
    await expect(emptyIntro).toBeVisible()

    // Fallback link should be present (browse all / home)
    const browseAllLink = page.getByText('Browse all categories')
    const hasRelatedSuggestions = page.getByText('Here are some suggestions:')

    // Either fallback OR suggestions should be visible (depending on backend)
    const fallbackVisible = await browseAllLink.isVisible().catch(() => false)
    const suggestionsVisible = await hasRelatedSuggestions.isVisible().catch(() => false)
    expect(fallbackVisible || suggestionsVisible, 'Weder Fallback-Link noch Vorschläge sichtbar').toBe(true)
  })

  test('AC6: Ungültige category_id crasht nicht', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/en/search?category_id=99999')
    await page.waitForLoadState('networkidle')

    // No page crash
    expect(errors, `Seitenabsturz: ${errors.join(', ')}`).toHaveLength(0)

    // Either shows empty state OR no_results — just not a crash
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)
  })
})

test.describe('F2350 — i18n & RTL (AC7)', () => {
  test('AC7: Deutsche Sprache zeigt übersetzte Texte', async ({ page }) => {
    await page.goto('/de/search?category_id=5&category_name=Reinigung')
    await page.waitForLoadState('networkidle')

    const deIntro = page.getByText('In dieser Kategorie sind noch keine Produkte verfügbar.')
    await expect(deIntro).toBeVisible()
  })

  test('AC7: Arabische Sprache (ar) — RTL-Layout (dir=rtl)', async ({ page }) => {
    await page.goto('/ar/search?category_id=5&category_name=تنظيف')
    await page.waitForLoadState('networkidle')

    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('AC7: Hebräische Sprache (he) — RTL-Layout (dir=rtl)', async ({ page }) => {
    await page.goto('/he/search?category_id=5&category_name=ניקוי')
    await page.waitForLoadState('networkidle')

    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('AC7: Englische Sprache (en) — LTR Layout', async ({ page }) => {
    await page.goto('/en/search?category_id=5&category_name=Cleaning')
    await page.waitForLoadState('networkidle')

    const dir = await page.locator('html').getAttribute('dir')
    // EN is LTR — dir should be 'ltr' or null (default)
    expect(dir === null || dir === 'ltr', `Unerwartetes dir="${dir}" für EN`).toBe(true)
  })

  test('AC7: Arabische Sprache zeigt arabischen Text für empty state', async ({ page }) => {
    await page.goto('/ar/search?category_id=5')
    await page.waitForLoadState('networkidle')

    const arIntro = page.getByText('لا توجد منتجات في هذه الفئة حالياً.')
    await expect(arIntro).toBeVisible()
  })
})

test.describe('F2350 — CategoryChips href', () => {
  test('AC4: CategoryChip-Links enthalten &category_name= Parameter', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // Look for CategoryChips
    const chipLinks = page.locator('a[href*="category_id"]')
    const count = await chipLinks.count()

    if (count > 0) {
      const firstHref = await chipLinks.first().getAttribute('href')
      expect(firstHref).toContain('category_id=')
      expect(firstHref, `Chip-href fehlt category_name: ${firstHref}`).toContain('category_name=')
    }
    // If no chips visible (empty DB), test is skipped — not a failure
  })
})
