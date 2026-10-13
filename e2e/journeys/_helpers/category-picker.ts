/**
 * B5900-011 — Playwright helper for the Shop-Admin CategoryPicker.
 * Replaces the old `form select ... selectOption({ index: 1 })` category selection.
 */
import { expect, type Locator, type Page } from '@playwright/test'

export interface PickCategoryOpts {
  /** Search term used when no suggestion shows up (default: 'bread'). */
  query?: string
  /** Set false to skip suggestions and go straight to search. */
  suggestion?: boolean
  /**
   * Spread leftovers over many categories: pick a random search word and a random result.
   * Owners cannot delete items, and the backend fuzzy-block (409) compares names within the same
   * category -> E2E items with near-identical names must not pile up in one category.
   */
  random?: boolean
}

const RANDOM_QUERIES = ['bread', 'cheese', 'shirt', 'lamp', 'cable', 'soap', 'chair', 'paint', 'toy', 'book', 'bag', 'cup']

/**
 * Picks a category in the CategoryPicker inside `scope`.
 * Prefers the first suggestion (1 tap); falls back to search + first option.
 */
export async function pickCategory(page: Page, scope: Page | Locator, opts: PickCategoryOpts = {}): Promise<void> {
  const picker = scope.getByTestId('category-picker')
  await expect(picker).toBeVisible()
  let picked = false
  if (opts.random) {
    await picker.getByTestId('category-search').fill(RANDOM_QUERIES[Math.floor(Math.random() * RANDOM_QUERIES.length)])
    const options = picker.getByTestId('category-option')
    await options.first().waitFor({ state: 'visible', timeout: 8000 })
    await options.nth(Math.floor(Math.random() * (await options.count()))).click()
    picked = true
  } else if (opts.suggestion !== false) {
    const first = picker.getByTestId('category-suggestion').first()
    try {
      await first.waitFor({ state: 'visible', timeout: 4000 })
      await first.click()
      picked = true
    } catch {
      // no suggestion for this name -> fall through to search
    }
  }
  if (!picked) {
    await picker.getByTestId('category-search').fill(opts.query ?? 'bread')
    const option = picker.getByTestId('category-option').first()
    await option.waitFor({ state: 'visible', timeout: 8000 })
    await option.click()
  }
  await expect(scope.getByTestId('category-selected')).toBeVisible()
}

/**
 * Trägt den Artikelnamen ein und wartet auf die Kategorie-Vorschläge (B8950-012).
 *
 * Zwei getrennte Schritte statt einem 8-s-Sichtbarkeits-Timeout: (1) die Antwort von
 * `/api/shop-admin/categories/suggest` (Debounce 400 ms + Proxy + Backend) mit Statusprüfung,
 * (2) erst dann die Sichtbarkeit. Schlägt der Request fehl (Status != 200) oder dauert er > 20 s,
 * nennt die Fehlermeldung Status und Dauer statt "nicht sichtbar" — die UI verschluckt Fetch-Fehler
 * absichtlich (keine Vorschläge), der Test soll die Ursache zeigen.
 */
export async function fillNameAndAwaitSuggestions(page: Page, form: Locator, name: string): Promise<Locator> {
  const started = Date.now()
  const resp = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/shop-admin/categories/suggest', { timeout: 20_000 })
  await form.locator('input[type="text"]').first().fill(name)
  const r = await resp
  expect(r.status(), `suggest antwortete ${r.status()} nach ${Date.now() - started} ms für "${name}"`).toBe(200)
  const sug = form.getByTestId('category-suggestion')
  await expect(sug.first(), `suggest-Antwort OK nach ${Date.now() - started} ms, Vorschlag nicht gerendert`).toBeVisible({ timeout: 5_000 })
  return sug
}
