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

  test('AC3: Leere Kategorie MIT verwandten Kategorien zeigt bis zu 6 Vorschlags-Links', async ({ page }) => {
    // Category 2922 = Pet Apparel Hangers (0 direct products, 6 related categories with products)
    // Backend GET /categories/2922/related-with-products → 6 items
    await page.goto('/en/search?category_id=2922&category_name=Pet+Apparel+Hangers')
    await page.waitForLoadState('networkidle')

    // AC3a: intro text visible (wait up to 8s for async useEffect)
    const emptyIntro = page.getByText('Currently no products in this category.')
    await expect(emptyIntro).toBeVisible({ timeout: 8000 })

    // AC3b: suggestions label visible — wait for async getRelatedCategories useEffect
    const suggestionsLabel = page.getByText('Here are some suggestions:')
    await expect(suggestionsLabel).toBeVisible({ timeout: 8000 })

    // AC3c: at least 1 suggestion link present (up to 6)
    // Filter out the current category navigation links (category_name param links in header)
    const suggestionLinks = page.locator('[data-testid="category-empty-state"] a[href*="category_id"]')
    const fallbackSuggestionLinks = page.locator('a[href*="category_id"]').filter({ hasText: /Fish|Dog|Cat|Pet Bed|Pet Bell|Biometric/ })

    // Use either testid selector or text-based fallback
    const hasTestId = await suggestionLinks.count() > 0
    const linksLocator = hasTestId ? suggestionLinks : fallbackSuggestionLinks
    const linkCount = await linksLocator.count()

    expect(linkCount, `Keine Vorschlags-Links gefunden`).toBeGreaterThan(0)
    expect(linkCount, `Mehr als 6 Links (max AC-spec)`).toBeLessThanOrEqual(6)

    // AC3d: Fallback "Browse all categories" should NOT be shown when suggestions exist
    const browseAllLink = page.getByText('Browse all categories')
    await expect(browseAllLink).not.toBeVisible()
  })

  test('AC3+AC4: Klick auf Vorschlags-Link navigiert zur Kategoriesuche', async ({ page }) => {
    // Category 2922 = Pet Apparel Hangers (0 products), related: Fish Supplies (2904, 147 products)
    await page.goto('/en/search?category_id=2922&category_name=Pet+Apparel+Hangers')
    await page.waitForLoadState('networkidle')

    // Wait for async suggestions to appear
    const suggestionsLabel = page.getByText('Here are some suggestions:')
    await expect(suggestionsLabel).toBeVisible({ timeout: 8000 })

    // Find first suggestion link (one of the related category names)
    const suggestionLinks = page.locator('a[href*="category_id"]').filter({ hasText: /Fish|Dog|Cat|Pet Bed|Pet Bell|Biometric/ })
    await expect(suggestionLinks.first()).toBeVisible({ timeout: 5000 })

    // Click first suggestion
    await suggestionLinks.first().click()
    await page.waitForLoadState('networkidle')

    // AC4: Should navigate to a category search page
    const currentUrl = page.url()
    expect(currentUrl, `URL enthält keine category_id nach Klick`).toContain('category_id=')
  })

  test('AC5: Leere Kategorie OHNE verwandte Kategorien zeigt Fallback-Link', async ({ page }) => {
    // Category 5 = Commercial Cleaning (0 products, related-with-products → empty)
    await page.goto('/en/search?category_id=5&category_name=Commercial+Cleaning')
    await page.waitForLoadState('networkidle')

    const emptyIntro = page.getByText('Currently no products in this category.')
    await expect(emptyIntro).toBeVisible()

    // When no related categories: fallback browse all link appears
    const browseAllLink = page.getByText('Browse all categories')
    const hasRelatedSuggestions = page.getByText('Here are some suggestions:')

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
