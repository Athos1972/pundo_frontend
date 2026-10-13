/**
 * B5900-011 — Shop-Admin: Kategorie-Auswahl beim Artikel-Anlegen
 *
 * Nur gegen Test-Instanz 3500 / 8500. Kein DB-Reset.
 * Items sind global und vom Owner nicht löschbar -> AK5 legt ein Item mit eindeutigem Namen
 * `E2E-B5900-011-<timestamp>` an; am Ende wird nur das Listing des Test-Shops entfernt (Item bleibt).
 *
 * Fixtures (zur Laufzeit): keine; die Tests nutzen die synchronisierte Google-/UNSPSC-Taxonomie
 * in pundo_test (4608 "Breads & Buns" unter 4605 "Bakery"/"Backwaren").
 *
 * AK1 Vorschlag in <=1 Interaktion (EN/DE/EL), AK2 Typfilter, AK3 keine Dubletten/Fixtures,
 * AK4 RTL (he) + Griechisch (el), AK5 Eltern-Kategorie findet das Item, AK6 Mobile 390x844.
 */
import { test, expect, type Page, type Response } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { tAdmin } from '../../src/lib/shop-admin-translations'
import { pickCategory } from './_helpers/category-picker'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5900-011] Safety: NEVER use production ports!')
}

const STATE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.test-state.json'), 'utf8')) as {
  email: string
  password: string
  storageState: { cookies: unknown[]; origins: unknown[] }
}
test.use({ storageState: STATE.storageState as Parameters<typeof test.use>[0]['storageState'] })

type Lang = 'en' | 'de' | 'el' | 'he'
const E2E_FIXTURE_IDS = [8458, 8459, 8460, 8461, 8462]

interface Picked { id: number; taxonomy_type: string; name: string; path_names: string[] }

/** Opens the create-item form in the offer wizard (UI language via cookie). */
async function openCreateForm(page: Page, lang: Lang) {
  await page.context().addCookies([{ name: 'app_lang', value: lang, url: FRONTEND_URL }])
  await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
  const tr = tAdmin(lang)
  await page.getByRole('button', { name: new RegExp(`^\\+ ${escapeRe(tr.item_picker_title)}`) }).click()
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

let token = ''
let createdItemId = 0
let createdSlug = ''

test.beforeAll(async () => {
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: STATE.email, password: STATE.password }),
  })
  token = (r.headers.get('set-cookie') ?? '').match(/shop_owner_token=([^;]+)/)?.[1] ?? ''
  expect(token, 'Login fehlgeschlagen').not.toBe('')
})

test.afterAll(async () => {
  if (!createdItemId) return
  const auth = { Authorization: `Bearer ${token}` }
  const l = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings?limit=500`, { headers: auth })
    .then((r) => r.json()).catch(() => null) as { items?: Array<{ id: number; item_id: number }> } | null
  const listing = l?.items?.find((x) => x.item_id === createdItemId)
  if (listing) await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings/${listing.id}`, { method: 'DELETE', headers: auth }).catch(() => {})
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
    await form.locator('input[type="text"]').first().fill(c.name)
    const sug = form.getByTestId('category-suggestion')
    await expect(sug.first()).toBeVisible({ timeout: 8000 })
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
  await form.locator('input[type="text"]').first().fill('Ψωμί προζυμιού 750 γρ')
  const first = form.getByTestId('category-suggestion').first()
  await expect(first).toBeVisible({ timeout: 8000 })
  await expect(first).toContainText(/[Ͱ-Ͽἀ-῿]/)
  const sugText = (await form.getByTestId('category-suggestion').filter({ hasText: /ψωμάκια/ }).first().textContent()) ?? ''
  expect(sugText).toMatch(/Τρόφιμα|Αρτοποιείο/)
})

// ─── AK5 ─────────────────────────────────────────────────────────────────────

test('AK5: Item in "Brot & Broetchen" erscheint unter der Eltern-Kategorie Backwaren (4605)', async ({ page }) => {
  const form = await openCreateForm(page, 'en')
  const uniq = String(Date.now()) // digits only: no extra letter tokens for the suggestion heuristic
  const name = `Sourdough bread E2E-B5900-011-${uniq}`
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
  createdItemId = reused ? 0 : item.id // only clean up a listing we created ourselves
  createdSlug = item.slug
  expect(item.category_id, 'Vorschlag sollte Breads & Buns (4608) liefern').toBe(4608)

  const r = await fetch(`${BACKEND_URL}/api/v1/products?category_id=4605&q=${encodeURIComponent('E2E-B5900-011')}&limit=100`)
  const list = (await r.json()) as { items: Array<{ slug: string }> }
  const slugs = list.items.map((i) => i.slug)
  // Eltern-Kategorie 4605 enthaelt Items aus dem ganzen Teilbaum (rekursiver CTE im Backend)
  expect(slugs, `slug ${createdSlug} fehlt unter 4605`).toContain(createdSlug)
})

// ─── AK6 ─────────────────────────────────────────────────────────────────────

test('AK6: Mobile 390x844 -> kein horizontaler Scroll, Touch-Ziele >= 44px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const form = await openCreateForm(page, 'en')
  await form.locator('input[type="text"]').first().fill('Sourdough bread 750 g')
  await expect(form.getByTestId('category-suggestion').first()).toBeVisible({ timeout: 8000 })
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
