/**
 * B5900-011 — Shop-Admin: Kategorie-Auswahl beim Artikel-Anlegen
 *
 * Nur gegen Test-Instanz 3500 / 8500. Kein DB-Reset.
 * B8950-012: läuft im WORKER-Shop (Impersonation); AK5 legt ein Item mit Marker am Namensanfang an
 * (`E2E-<RUN>-B5900-011-Sourdough bread <ts>`), merkt es im Tracker und der Worker-Teardown löscht es per Admin-API.
 *
 * Fixtures (zur Laufzeit): keine; die Tests nutzen die synchronisierte Google-/UNSPSC-Taxonomie
 * in pundo_test (4608 "Breads & Buns" unter 4605 "Bakery"/"Backwaren").
 *
 * AK1 Vorschlag in <=1 Interaktion (EN/DE/EL), AK2 Typfilter, AK3 keine Dubletten/Fixtures,
 * AK4 RTL (he) + Griechisch (el), AK5 Eltern-Kategorie findet das Item, AK6 Mobile 390x844.
 */
import { test, expect, type WorkerShop } from './_helpers/worker-shop'
import type { Page, Response } from '@playwright/test'
import { marker } from './_helpers/test-data'
import { tAdmin } from '../../src/lib/shop-admin-translations'
import { fillNameAndAwaitSuggestions, pickCategory } from './_helpers/category-picker'
import { openItemPickerModal } from './_helpers/hydration'
import { BASE_URL as FRONTEND_URL, BACKEND_URL } from '../env'

if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5900-011] Safety: NEVER use production ports!')
}

type Lang = 'en' | 'de' | 'el' | 'ru' | 'he'
const E2E_FIXTURE_IDS = [8458, 8459, 8460, 8461, 8462]

interface Picked { id: number; taxonomy_type: string; name: string; path_names: string[] }

/** Opens the create-item form in the offer wizard (UI language via cookie). */
async function openCreateForm(page: Page, lang: Lang) {
  await page.context().addCookies([{ name: 'app_lang', value: lang, url: FRONTEND_URL }])
  await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
  const tr = tAdmin(lang)
  await openItemPickerModal(page.getByRole('button', { name: new RegExp(`^\\+ ${escapeRe(tr.item_picker_title)}`) }))
  await page.getByRole('button', { name: new RegExp(`^\\+ ${escapeRe(tr.item_picker_add_new)}`) }).click()
  const form = page.locator('form').filter({ has: page.locator('fieldset legend') })
  await expect(form.getByTestId('category-picker')).toBeVisible()
  return form
}
function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function categoriesResponse(page: Page, match: (url: URL) => boolean) {
  return page.waitForResponse((r: Response) => {
    const u = new URL(r.url())
    return u.pathname === '/api/shop-admin/categories' && match(u)
  })
}

let shop: WorkerShop
let createdSlug = ''

test.beforeAll(({ workerShop }) => { shop = workerShop })

test.afterAll(async () => {
  // Listing(s) des Tests entfernen; das Marker-Item löscht der Worker-Teardown (Tracker)
  await shop.cleanupSpecData()
})

// ─── AK1 ─────────────────────────────────────────────────────────────────────

const AK1: Array<{ lang: Lang; name: string; expect: RegExp }> = [
  { lang: 'en', name: 'Sourdough bread 750 g', expect: /Breads & Buns/ },
  { lang: 'en', name: 'Sauerteigbrot 750 g', expect: /Breads & Buns/ },
  { lang: 'de', name: 'Sauerteigbrot 750 g', expect: /Brot/ },
  { lang: 'el', name: 'Ψωμί προζυμιού 750 γρ', expect: /Άρτοι και ψωμάκια/ },
]
for (const c of AK1) {
  test(`AK1 [${c.lang}] "${c.name}": Vorschlag Backwaren, ein Tap waehlt aus`, async ({ page }) => {
    const form = await openCreateForm(page, c.lang)
    // Interaktion 1: Namen eingeben
    const sug = await fillNameAndAwaitSuggestions(page, form, c.name)
    const texts = await sug.allTextContents()
    expect(texts.slice(0, 5).join(' | ')).toMatch(c.expect)
    // Interaktion 2: Tap auf den passenden Vorschlag -> ausgewaehlt
    await sug.filter({ hasText: c.expect }).first().click()
    await expect(form.getByTestId('category-selected')).toContainText(c.expect)
  })
}

// ─── AK2 ─────────────────────────────────────────────────────────────────────

test('AK2: Typ Dienstleistung -> Suche und Browse liefern nur UNSPSC; Produkt -> nur Google', async ({ page }) => {
  const form = await openCreateForm(page, 'en')
  // Produkt (Default): Browse-Wurzeln nur google
  let resp = categoriesResponse(page, (u) => !u.searchParams.has('q') && u.searchParams.get('item_type') === 'product')
  await form.getByTestId('category-browse').click()
  let body = (await (await resp).json()) as { items: Picked[] }
  expect(body.items.length).toBeGreaterThan(5)
  expect(new Set(body.items.map((i) => i.taxonomy_type))).toEqual(new Set(['google']))

  // Wechsel auf Dienstleistung
  await form.locator('input[name="item_type"][value="service"]').check()
  await form.getByTestId('category-picker').getByTestId('category-search').fill('bread')
  resp = categoriesResponse(page, (u) => u.searchParams.get('q') === 'bread' && u.searchParams.get('item_type') === 'service')
  body = (await (await resp).json()) as { items: Picked[] }
  expect(body.items.every((i) => i.taxonomy_type === 'unspsc')).toBe(true)

  const roots = categoriesResponse(page, (u) => !u.searchParams.has('q') && u.searchParams.get('item_type') === 'service')
  await form.getByTestId('category-search').fill('')
  await form.getByTestId('category-browse').click()
  body = (await (await roots).json()) as { items: Picked[] }
  expect(body.items.length).toBeGreaterThan(5)
  expect(new Set(body.items.map((i) => i.taxonomy_type))).toEqual(new Set(['unspsc']))
})

test('AK2b: Typwechsel verwirft eine bereits gewaehlte Kategorie', async ({ page }) => {
  const form = await openCreateForm(page, 'en')
  await pickCategory(page, form, { suggestion: false, query: 'bread' })
  await form.locator('input[name="item_type"][value="service"]').check()
  await expect(form.getByTestId('category-selected')).toHaveCount(0)
  await expect(form.getByTestId('category-search')).toBeVisible()
})

// ─── AK3 ─────────────────────────────────────────────────────────────────────

test('AK3: Browse-Wurzeln ohne Dubletten, ohne E2E-Fixtures, ohne Mature', async ({ page }) => {
  const form = await openCreateForm(page, 'en')
  const resp = categoriesResponse(page, (u) => !u.searchParams.has('q') && u.searchParams.get('item_type') === 'product')
  await form.getByTestId('category-browse').click()
  const { items } = (await (await resp).json()) as { items: Picked[] }
  const names = items.map((i) => i.name.toLowerCase())
  expect(new Set(names).size, `Dubletten: ${names.join(', ')}`).toBe(names.length)
  expect(items.some((i) => E2E_FIXTURE_IDS.includes(i.id))).toBe(false)
  expect(names).not.toContain('food & beverages')
  expect(names).not.toContain('mature')
  // alphabetisch (UI sortiert zusaetzlich per Intl.Collator)
  const rows = await form.getByTestId('category-browse-item').allTextContents()
  const collator = new Intl.Collator('en')
  expect(rows).toEqual([...rows].sort(collator.compare))
})

// ─── AK4 ─────────────────────────────────────────────────────────────────────

test('AK4: he -> dir=rtl und hebraeische Namen; el -> Pfad auf Griechisch', async ({ page }) => {
  let form = await openCreateForm(page, 'he')
  await expect(form.getByTestId('category-picker')).toHaveAttribute('dir', 'rtl')
  const resp = categoriesResponse(page, (u) => !u.searchParams.has('q'))
  await form.getByTestId('category-browse').click()
  const { items } = (await (await resp).json()) as { items: Picked[] }
  expect(items.some((i) => /[֐-׿]/.test(i.name))).toBe(true)
  await expect(form.getByTestId('category-browse-item').first()).toContainText(/[֐-׿]/)

  form = await openCreateForm(page, 'el')
  const sugEl = await fillNameAndAwaitSuggestions(page, form, 'Ψωμί προζυμιού 750 γρ')
  const first = sugEl.first()
  await expect(first).toContainText(/[Ͱ-Ͽἀ-῿]/)
  const sugText = (await form.getByTestId('category-suggestion').filter({ hasText: /ψωμάκια/ }).first().textContent()) ?? ''
  expect(sugText).toMatch(/Τρόφιμα|Αρτοποιείο/)
})

// ─── AK5 ─────────────────────────────────────────────────────────────────────

test('AK5: Item in "Brot & Broetchen" erscheint unter der Eltern-Kategorie Backwaren (4605)', async ({ page }) => {
  const form = await openCreateForm(page, 'en')
  const uniq = String(Date.now()) // digits only: no extra letter tokens for the suggestion heuristic
  const name = `${marker('B5900-011')}-Sourdough bread ${uniq}`
  await form.locator('input[type="text"]').first().fill(name)
  await pickCategory(page, form, { query: 'bread' })
  await expect(form.getByTestId('category-selected')).toContainText('Breads & Buns')
  const created = page.waitForResponse((r) => r.url().includes('/api/shop-admin/items') && r.request().method() === 'POST')
  await form.locator('button[type="submit"]').click()
  const resp = await created
  const raw = (await resp.json()) as {
    id?: number; slug?: string; category_id?: number
    detail?: { code?: string; similar_items?: Array<{ id: number; slug: string; category_id: number }> }
  }
  // Items are not deletable by owners; a leftover item of an earlier run (names differ only in the
  // timestamp) triggers the fuzzy block -> reuse that item (it was created through this same flow).
  const reused = resp.status() === 409 && raw.detail?.code === 'fuzzy_match' ? raw.detail.similar_items?.[0] : undefined
  expect([201, 409], JSON.stringify(raw)).toContain(resp.status())
  const item = (reused ?? raw) as { id: number; slug: string; category_id: number }
  if (!reused) shop.tracker.item(item.id, item.slug) // nur selbst angelegte Items löschen
  createdSlug = item.slug
  expect(item.category_id, 'Vorschlag sollte Breads & Buns (4608) liefern').toBe(4608)

  const r = await fetch(`${BACKEND_URL}/api/v1/products?category_id=4605&q=${encodeURIComponent(marker('B5900-011'))}&limit=100`)
  const list = (await r.json()) as { items: Array<{ slug: string }> }
  const slugs = list.items.map((i) => i.slug)
  // Eltern-Kategorie 4605 enthaelt Items aus dem ganzen Teilbaum (rekursiver CTE im Backend)
  expect(slugs, `slug ${createdSlug} fehlt unter 4605`).toContain(createdSlug)
})

// ─── AK6 ─────────────────────────────────────────────────────────────────────

test('AK6: Mobile 390x844 -> kein horizontaler Scroll, Touch-Ziele >= 44px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const form = await openCreateForm(page, 'en')
  await fillNameAndAwaitSuggestions(page, form, 'Sourdough bread 750 g')
  const browseBtn = await form.getByTestId('category-browse').boundingBox()
  expect(browseBtn!.height, 'category-browse Touch-Ziel').toBeGreaterThanOrEqual(43.5)
  await form.getByTestId('category-browse').click()
  await expect(form.getByTestId('category-browse-item').first()).toBeVisible()

  const picker = form.getByTestId('category-picker')
  const fits = await picker.evaluate((el) => {
    const all = [el, ...Array.from(el.querySelectorAll('*'))] as HTMLElement[]
    return { own: el.scrollWidth <= el.clientWidth, doc: document.documentElement.scrollWidth <= window.innerWidth, overflow: all.filter((n) => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflowX === 'visible' && n.clientWidth > 0 && n.tagName === 'BUTTON').length }
  })
  expect(fits.own, 'Picker scrollt horizontal').toBe(true)
  expect(fits.doc, 'Seite scrollt horizontal').toBe(true)
  expect(fits.overflow).toBe(0)

  for (const tid of ['category-suggestion', 'category-browse-item', 'category-search']) {
    const box = await form.getByTestId(tid).first().boundingBox()
    expect(box, tid).not.toBeNull()
    expect(box!.height, `${tid} Touch-Ziel`).toBeGreaterThanOrEqual(43.5)
  }
})

// ─── F2970: Endkunden-Dienstleistungen im Picker ─────────────────────────────

// AC8: Vorschlag aus dem Artikelnamen; AC6/7: kein Tierpflege-Fehltreffer auf Platz 1
const AK7: Array<{ lang: Lang; name: string; top: RegExp }> = [
  { lang: 'de', name: 'Herrenhaarschnitt', top: /Herrenfriseur & Barbier/ },
  { lang: 'el', name: 'Κούρεμα', top: /Κομμωτήριο & Κουρείο|Παιδικό Κούρεμα|Ανδρικό Κουρείο/ },
  { lang: 'ru', name: 'Тайский массаж 60 мин', top: /Тайский.*массаж/ },
  { lang: 'en', name: 'Babysitting evening', top: /Childcare & Babysitting/ },
  { lang: 'el', name: 'Μανικιούρ ημιμόνιμο', top: /Μανικιούρ/ },
]
for (const c of AK7) {
  test(`AK7 (F2970) [${c.lang}] Dienstleistung "${c.name}": passender Vorschlag in den Top 3`, async ({ page }) => {
    const form = await openCreateForm(page, c.lang)
    await form.locator('input[name="item_type"][value="service"]').check()
    const sug = await fillNameAndAwaitSuggestions(page, form, c.name)
    const texts = (await sug.allTextContents()).slice(0, 3)
    expect(texts.join(' | '), 'Top 3').toMatch(c.top)
    expect(texts[0], 'Platz 1 ist kein Tierpflege-Treffer').not.toMatch(/Tierpflege|Grooming|Груминг|Περιποίηση Κατοικίδιων/)
  })
}

test('AK8 (F2970): Picker-Suche "Friseur" (de) / "hairdresser" (en) -> Friseur-Knoten, nicht Tierpflege', async ({ page }) => {
  for (const [lang, q, re] of [['de', 'Friseur', /Friseur & Barbier/], ['en', 'hairdresser', /Hairdresser & Barber/], ['el', 'κομμωτήριο', /Κομμωτήριο & Κουρείο/]] as Array<[Lang, string, RegExp]>) {
    const form = await openCreateForm(page, lang)
    await form.locator('input[name="item_type"][value="service"]').check()
    const resp = categoriesResponse(page, (u) => u.searchParams.get('q') === q && u.searchParams.get('item_type') === 'service')
    await form.getByTestId('category-search').fill(q)
    const { items } = (await (await resp).json()) as { items: Picked[] }
    expect(items[0].name, `${lang}: Platz 1`).toMatch(re)
    expect(items.slice(0, 3).map((i) => i.name).join('|')).toMatch(re)
    await expect(form.getByTestId('category-option').first()).toContainText(re)
  }
})

test('AK9 (F2970): Browse fuer Dienstleistungen beginnt mit "Haus- & Personendienste"; Friseur in wenigen Taps', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const form = await openCreateForm(page, 'de')
  await form.locator('input[name="item_type"][value="service"]').check()
  await form.getByTestId('category-browse').click()
  const items = form.getByTestId('category-browse-item')
  await expect(items.first()).toBeVisible()
  await expect(items.first()).toContainText('Haus- & Personendienste')
  // Tap 1: Wurzel, Tap 2: Familie, Tap 3: "Friseur & Barbier" oeffnen, dort ist ein Blatt (Herrenfriseur) waehlbar
  await items.first().click()
  await form.getByTestId('category-browse-item').filter({ hasText: 'Schönheit, Wellness & Fitness' }).first().click()
  const friseur = form.getByTestId('category-browse-item').filter({ hasText: /^Friseur & Barbier/ }).first()
  await expect(friseur).toBeVisible()
  await friseur.click()
  await expect(form.getByTestId('category-browse-item').filter({ hasText: 'Herrenfriseur & Barbier' })).toBeVisible()
  await form.getByTestId('category-choose-current').click()
  await expect(form.getByTestId('category-selected')).toContainText('Friseur & Barbier')
  // kein horizontaler Scroll
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
