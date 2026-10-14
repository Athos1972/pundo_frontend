/**
 * E2E Tests für F2350 — Kategoriesuche Leerzustand & verwandte Kategorien
 * Läuft gegen Frontend Port 3500, Backend Port 8500
 *
 * Testdaten: pundo_test wird regelmäßig aus Prod gesynct, Kategorie-IDs und Produktzahlen driften
 * (z. B. war 2871 früher "Animals & Pet Supplies", Kategorie 5 hatte früher 0 Produkte). Die
 * benötigten Kategorien werden deshalb in beforeAll über die Backend-API (8500) ermittelt:
 *   - withProducts:  Kategorie mit Produkten
 *   - emptyRelated:  0 Produkte, related-with-products nicht leer
 *   - emptyAlone:    0 Produkte, related-with-products leer
 *
 * Layout: die Suchseite rendert die Ergebnisliste zweimal (Mobile-Bottom-Sheet `md:hidden` +
 * Desktop-Panel `hidden md:flex`). Text-Locator daher immer mit `.filter({ visible: true })`.
 */
import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'
import { tCommon } from '../src/lib/i18n/common'
import { waitForPageHydrated } from './journeys/_helpers/hydration'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
if (BACKEND_URL.includes(':8000')) throw new Error('Safety: F2350-Spec darf nicht gegen Port 8000 laufen')

type Cat = { id: number; name: string | null; child_count: number }
type Picked = { id: number; name: string }

const data: { withProducts?: Picked; emptyRelated?: Picked & { related: string[] }; emptyAlone?: Picked } = {}

async function getJson<T>(api: APIRequestContext, path: string): Promise<T> {
  const res = await api.get(`${BACKEND_URL}/api/v1${path}`, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok()) throw new Error(`GET ${path} -> ${res.status()}`)
  return res.json() as Promise<T>
}

async function productTotal(api: APIRequestContext, id: number): Promise<number> {
  return (await getJson<{ total: number }>(api, `/products?category_id=${id}&limit=1`)).total
}

test.beforeAll(async () => {
  const api = await pwRequest.newContext()
  try {
    const withProducts = await getJson<{ items: Cat[] }>(api, '/categories?only_with_products=true&limit=50')
    for (const c of withProducts.items) {
      if (c.name && (await productTotal(api, c.id)) > 0) { data.withProducts = { id: c.id, name: c.name }; break }
    }

    const top = [
      ...(await getJson<{ items: Cat[] }>(api, '/categories?limit=100')).items,
      ...(await getJson<{ items: Cat[] }>(api, '/categories?limit=100&taxonomy_type=google')).items,
    ]
    const candidates = [...top]
    for (const c of top) {
      if (c.child_count > 0) candidates.push(...(await getJson<{ items: Cat[] }>(api, `/categories?parent_id=${c.id}&limit=100`)).items)
    }
    for (const c of candidates) {
      if (data.emptyRelated && data.emptyAlone) break
      if (!c.name || (await productTotal(api, c.id)) > 0) continue
      const related = (await getJson<{ items: Cat[] }>(api, `/categories/${c.id}/related-with-products?limit=6`)).items
      if (related.length > 0 && !data.emptyRelated) {
        data.emptyRelated = { id: c.id, name: c.name, related: related.map(r => r.name ?? '').filter(Boolean) }
      } else if (related.length === 0 && !data.emptyAlone) {
        data.emptyAlone = { id: c.id, name: c.name }
      }
    }
  } finally {
    await api.dispose()
  }
  console.log('[f2350] Testkategorien:', JSON.stringify({
    withProducts: data.withProducts, emptyRelated: data.emptyRelated?.id, emptyAlone: data.emptyAlone?.id,
  }))
})

function need<T>(value: T | undefined, what: string): T {
  if (!value) throw new Error(`[f2350] pundo_test enthält keine ${what} — Testdaten prüfen (sync_prod_to_test.sh)`)
  return value
}

const searchUrl = (lang: string, id: number) => `/${lang}/search?category_id=${id}`

test.describe('F2350 — Kategorie-Modus (Happy Path)', () => {
  test('AC1: Kategorie mit Produkten zeigt Produkte und Kategorienamen als Überschrift', async ({ page }) => {
    const cat = need(data.withProducts, 'Kategorie mit Produkten')
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    // Navigate via category_id only (wie CategoryChips es tut; Name lädt die Seite selbst)
    await page.goto(searchUrl('en', cat.id))
    await waitForPageHydrated(page)

    // AC1a: Kategoriename als sichtbare Überschrift (h1 ist sr-only/SEO, sichtbar ist das h2 der Liste)
    const heading = page.locator('h2').filter({ hasText: cat.name }).filter({ visible: true })
    await expect(heading).toBeVisible()

    // AC1b: Produkte werden angezeigt
    const productLinks = page.locator('a[href*="/products/"]').filter({ visible: true })
    await expect(productLinks.first()).toBeVisible()
    expect(await productLinks.count()).toBeGreaterThan(0)

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
    await waitForPageHydrated(page)

    // No CategoryEmptyState should appear
    await expect(page.getByText(tCommon('en').category_empty_intro)).toHaveCount(0)

    // Kein sichtbarer Kategorie-Titel im Textmodus (h1 ist sr-only = "Search")
    await expect(page.locator('h1:not(.sr-only)')).toHaveCount(0)
  })
})

test.describe('F2350 — Kategorie Leerzustand (Empty State)', () => {
  test('AC2: Leere Kategorie zeigt NICHT den generischen no_results-Text', async ({ page }) => {
    const cat = need(data.emptyAlone ?? data.emptyRelated, 'leere Kategorie')
    await page.goto(searchUrl('en', cat.id))
    await expect(page.getByText(tCommon('en').category_empty_intro).filter({ visible: true })).toBeVisible()
    // Text-Modus-Leerzustand ist ein <p>; die sr-only Live-Region (role=status) sagt "No results found." immer an
    await expect(page.locator('p', { hasText: 'No results found.' })).toHaveCount(0)
  })

  test('AC2: Leere Kategorie zeigt category_empty_intro Text', async ({ page }) => {
    const cat = need(data.emptyAlone ?? data.emptyRelated, 'leere Kategorie')
    await page.goto(searchUrl('en', cat.id))
    await expect(page.getByText('Currently no products in this category.').filter({ visible: true })).toBeVisible()
  })

  test('AC3: Leere Kategorie MIT verwandten Kategorien zeigt bis zu 6 Vorschlags-Links', async ({ page }) => {
    const cat = need(data.emptyRelated, 'leere Kategorie mit verwandten Kategorien')
    await page.goto(searchUrl('en', cat.id))

    // AC3a: intro text visible (wait up to 8s for async useEffect)
    await expect(page.getByText('Currently no products in this category.').filter({ visible: true })).toBeVisible({ timeout: 8000 })

    // AC3b: suggestions label visible — wait for async getRelatedCategories useEffect
    await expect(page.getByText('Here are some suggestions:').filter({ visible: true })).toBeVisible({ timeout: 8000 })

    // AC3c: 1..6 Vorschlags-Links im sichtbaren Empty-State, Namen aus der API
    const state = page.getByTestId('category-empty-state').filter({ visible: true })
    const links = state.locator('a[href*="category_id="]')
    const linkCount = await links.count()
    expect(linkCount, 'Keine Vorschlags-Links gefunden').toBeGreaterThan(0)
    expect(linkCount, 'Mehr als 6 Links (max AC-spec)').toBeLessThanOrEqual(6)
    await expect(links.first()).toContainText(cat.related[0])

    // AC3d: Fallback "Browse all categories" should NOT be shown when suggestions exist
    await expect(page.getByText('Browse all categories').filter({ visible: true })).toHaveCount(0)
  })

  test('AC3+AC4: Klick auf Vorschlags-Link navigiert zur Kategoriesuche', async ({ page }) => {
    const cat = need(data.emptyRelated, 'leere Kategorie mit verwandten Kategorien')
    await page.goto(searchUrl('en', cat.id))

    await expect(page.getByText('Here are some suggestions:').filter({ visible: true })).toBeVisible({ timeout: 8000 })

    const firstSuggestion = page.getByTestId('category-empty-state').filter({ visible: true })
      .locator('a[href*="category_id="]').first()
    await expect(firstSuggestion).toBeVisible({ timeout: 5000 })
    const href = await firstSuggestion.getAttribute('href')
    expect(href).toMatch(/^\/en\/search\?category_id=\d+$/)

    await firstSuggestion.click()
    // AC4: Navigation zur Kategoriesuche der vorgeschlagenen Kategorie
    await expect(page).toHaveURL(new RegExp(`${href!.replace('?', '\\?')}$`))
  })

  test('AC5: Leere Kategorie OHNE verwandte Kategorien zeigt Fallback-Link', async ({ page }) => {
    const cat = need(data.emptyAlone, 'leere Kategorie ohne verwandte Kategorien')
    await page.goto(searchUrl('en', cat.id))

    await expect(page.getByText('Currently no products in this category.').filter({ visible: true })).toBeVisible()
    // Keine verwandten Kategorien → Fallback-Link "Browse all categories" (→ Startseite)
    const browseAll = page.getByRole('link', { name: 'Browse all categories' }).filter({ visible: true })
    await expect(browseAll).toBeVisible()
    await expect(browseAll).toHaveAttribute('href', '/en')
    await expect(page.getByText('Here are some suggestions:')).toHaveCount(0)
  })

  test('AC6: Ungültige category_id crasht nicht', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/en/search?category_id=99999999')
    await waitForPageHydrated(page)

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
    const cat = need(data.emptyAlone ?? data.emptyRelated, 'leere Kategorie')
    await page.goto(searchUrl('de', cat.id))

    await expect(page.getByText('In dieser Kategorie sind noch keine Produkte verfügbar.').filter({ visible: true })).toBeVisible()
  })

  for (const lang of ['ar', 'he'] as const) {
    test(`AC7: ${lang === 'ar' ? 'Arabische' : 'Hebräische'} Sprache (${lang}) — RTL-Layout (dir=rtl)`, async ({ page }) => {
      const cat = need(data.emptyAlone ?? data.emptyRelated, 'leere Kategorie')
      await page.goto(searchUrl(lang, cat.id))
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    })
  }

  test('AC7: Englische Sprache (en) — LTR Layout', async ({ page }) => {
    const cat = need(data.emptyAlone ?? data.emptyRelated, 'leere Kategorie')
    await page.goto(searchUrl('en', cat.id))

    const dir = await page.locator('html').getAttribute('dir')
    // EN is LTR — dir should be 'ltr' or null (default)
    expect(dir === null || dir === 'ltr', `Unerwartetes dir="${dir}" für EN`).toBe(true)
  })

  test('AC7: Arabische Sprache zeigt arabischen Text für empty state', async ({ page }) => {
    const cat = need(data.emptyAlone ?? data.emptyRelated, 'leere Kategorie')
    await page.goto(searchUrl('ar', cat.id))

    await expect(page.getByText('لا توجد منتجات في هذه الفئة حالياً.').filter({ visible: true })).toBeVisible()
  })
})

test.describe('F2350 — CategoryChips href', () => {
  // Seit 39e4ef0 (2026-06-05) enthält der Chip-Link nur category_id; der Name wird auf der
  // Suchseite über die API geladen (Unit-Test: src/tests/CategoryChips.test.tsx).
  test('AC4: CategoryChip-Links verlinken auf /{lang}/search?category_id=<id> (ohne category_name)', async ({ page }) => {
    await page.goto('/en')

    const chipLinks = page.locator('a[href*="category_id"]')
    await expect(chipLinks.first()).toBeAttached()
    const firstHref = await chipLinks.first().getAttribute('href')
    expect(firstHref).toMatch(/^\/en\/search\?category_id=\d+$/)
    expect(firstHref, `Chip-href mit veraltetem category_name: ${firstHref}`).not.toContain('category_name=')
  })
})
