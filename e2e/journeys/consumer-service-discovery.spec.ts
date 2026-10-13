/**
 * Journey: Endkunden-Dienstleistung — Listing -> Kundensuche (6 Sprachen) -> Anbieterliste (F2970)
 *
 * Nur gegen Test-Instanz 3500 / 8500. Kein DB-Reset. Voraussetzung: das Seed-Skript
 * `scripts/seed_consumer_services.py --apply` wurde auf pundo_test angewendet (px-Knoten,
 * Google-Ortstypen). Keine hartcodierten Kategorie-IDs: IDs kommen aus der Such-API.
 *
 * Fixtures (zur Laufzeit):
 *   - e2e-service-listing   Service-Item "E2E-<RUN>-CSD-Herrenhaarschnitt <ts>" des WORKER-Shops
 *                           (B8950-012: Impersonation, Marker am Namensanfang) in "Herrenfriseur & Barbier" -> Regel (b)
 *   - Google-Ortstyp-Shops  echte importierte Shops (hair_salon, massage ...) -> Regel (c)
 *   Teardown: Listing weg (cleanupSpecData), das Marker-Item loescht der Worker-Teardown per Admin-API.
 *
 * AC15 Spezifische Karte in 6 Sprachen (UI)      AC16 Massage im richtigen Zweig
 * AC17 Listing -> Anbieterliste (UI + API)       AC18 Eltern-Kategorie enthaelt Kinder, jeder Shop 1x
 * AC19 "Reinigung" -> getrennte Karten           AC22 he/ar RTL bei 390 px
 * AC26 Regression bestehender Dienstleistungen   O2 Karte ohne Anbieter -> Onboarding-Hinweis
 * AC21 (naidivse): das Backend kennt keine Brand-Logik fuer die Suche (Architektur §4); gleiche API,
 *      gleiche Karte. Hier als API-Gleichheit ueber zwei Accept-Language-Aufrufe abgesichert.
 */
import { test, expect, type WorkerShop } from './_helpers/worker-shop'
import { marker } from './_helpers/test-data'
import { tAdmin } from '../../src/lib/shop-admin-translations'
import { openItemPickerModal } from './_helpers/hydration'
import { fillNameAndAwaitSuggestions } from './_helpers/category-picker'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[consumer-service-discovery] Safety: NEVER use production ports!')
}

type Lang = 'de' | 'en' | 'el' | 'ru' | 'he' | 'ar'
interface ServiceCard { result_type: 'service'; category_id: number; name: string; provider_count: number; score: number }
interface SearchBody { total: number; items: Array<ServiceCard | { result_type: 'product' }> }

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

async function searchApi(q: string, lang: Lang): Promise<ServiceCard[]> {
  const r = await fetch(`${BACKEND_URL}/api/v1/search?q=${encodeURIComponent(q)}&limit=5`, {
    headers: { 'Accept-Language': lang, 'X-Smoketest': '1' },
  })
  expect(r.status, `search ${q} (${lang})`).toBe(200)
  const body = (await r.json()) as SearchBody
  return body.items.filter((i): i is ServiceCard => i.result_type === 'service')
}

async function shopSlugs(categoryId: number, q?: string): Promise<string[]> {
  const url = `${BACKEND_URL}/api/v1/shops?service_category_id=${categoryId}&limit=100${q ? `&q=${encodeURIComponent(q)}` : ''}`
  const r = await fetch(url, { headers: { 'X-Smoketest': '1' } })
  expect(r.status, url).toBe(200)
  return ((await r.json()) as { items: Array<{ slug: string }> }).items.map((s) => s.slug)
}

let shop: WorkerShop
let hairId = 0
let barberId = 0
let beautyId = 0

test.beforeAll(async ({ workerShop }) => {
  shop = workerShop

  const hair = await searchApi('Friseur', 'de')
  expect(hair[0]?.name, 'Seed nicht angewendet? Erwartet Karte "Friseur & Barbier"').toBe('Friseur & Barbier')
  hairId = hair[0].category_id
  barberId = (await searchApi('Herrenfriseur', 'de'))[0].category_id
  beautyId = (await searchApi('Schönheit', 'de'))[0].category_id
})

test.afterAll(async () => {
  await shop?.cleanupSpecData()
})

// ─── AC15: spezifische Karte in 6 Sprachen (UI) ─────────────────────────────

const AC15: Array<{ lang: Lang; term: string; card: string }> = [
  { lang: 'de', term: 'Friseur', card: 'Friseur & Barbier' },
  { lang: 'en', term: 'hairdresser', card: 'Hairdresser & Barber' },
  { lang: 'en', term: 'barber', card: 'Hairdresser & Barber' },
  { lang: 'el', term: 'κομμωτήριο', card: 'Κομμωτήριο & Κουρείο' },
  { lang: 'ru', term: 'парикмахерская', card: 'Парикмахерская и барбершоп' },
  { lang: 'he', term: 'מספרה', card: 'מספרה וברבר' },
  { lang: 'ar', term: 'حلاق', card: 'صالون حلاقة وتصفيف شعر' },
]
for (const c of AC15) {
  test(`AC15 [${c.lang}] "${c.term}": Friseur-Karte mit Anbietern, davor keine Eltern-Karte`, async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: c.lang, url: FRONTEND_URL }])
    await page.goto(`${FRONTEND_URL}/${c.lang}/search?q=${encodeURIComponent(c.term)}`, { waitUntil: 'domcontentloaded' })
    const card = page.getByRole('button', { name: new RegExp(`^${escapeRe(c.card)} —`) })
    await expect(card.first()).toBeVisible({ timeout: 15_000 })
    // keine Karte "Haare, Make-up & Schoenheit" (alter Elternname) vor der Friseur-Karte
    const labels = await page.getByRole('button').evaluateAll(
      (els) => els.map((e) => e.getAttribute('aria-label') ?? '').filter((l) => l.includes(' — ')),
    )
    expect(labels[0], `erste Service-Karte: ${labels.join(' | ')}`).toContain(c.card)
    expect(labels.slice(0, 1).join()).not.toMatch(/Haare, Make-up|Hair, Makeup|Волосы, макияж/)
    // API: gleiche Karte, Anbieter > 0 (importierte Google-Shops, Regel c)
    const top = (await searchApi(c.term, c.lang))[0]
    expect(top.name).toBe(c.card)
    expect(top.provider_count, `${c.card}: Anbieter`).toBeGreaterThan(0)
  })
}

// ─── AC16: Massage im richtigen Zweig ────────────────────────────────────────

for (const c of [{ lang: 'de' as Lang, term: 'Massage', name: 'Massage' }, { lang: 'ru' as Lang, term: 'массаж', name: 'Массаж' }]) {
  test(`AC16 [${c.lang}] "${c.term}" -> Karte "${c.name}", nicht "Gesundheitsschutz & Vorbeugung"`, async ({ page }) => {
    const cards = await searchApi(c.term, c.lang)
    expect(cards[0].name).toBe(c.name)
    expect(cards.map((x) => x.name).join('|')).not.toMatch(/Gesundheitsschutz|Профилактика и защита здоровья/)
    expect(cards[0].provider_count).toBeGreaterThan(0)
    await page.context().addCookies([{ name: 'app_lang', value: c.lang, url: FRONTEND_URL }])
    await page.goto(`${FRONTEND_URL}/${c.lang}/search?q=${encodeURIComponent(c.term)}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: new RegExp(`^${escapeRe(c.name)} —`) }).first()).toBeVisible({ timeout: 15_000 })
  })
}

// ─── AC17 + AC18: Listing -> Anbieterliste, Teilbaum ─────────────────────────

test('AC17/AC18: Service-Listing "Herrenhaarschnitt" macht den E2E-Shop zum Anbieter (Karte, Liste, Eltern-Karte)', async ({ page }) => {
  // 1) Owner legt die Dienstleistung ueber das Formular an; Vorschlag = Herrenfriseur & Barbier
  await page.context().addCookies([{ name: 'app_lang', value: 'de', url: FRONTEND_URL }])
  await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
  const tr = tAdmin('de')
  await openItemPickerModal(page.getByRole('button', { name: new RegExp(`^\\+ ${escapeRe(tr.item_picker_title)}`) }))
  await page.getByRole('button', { name: new RegExp(`^\\+ ${escapeRe(tr.item_picker_add_new)}`) }).click()
  const form = page.locator('form').filter({ has: page.locator('fieldset legend') })
  await expect(form.getByTestId('category-picker')).toBeVisible()
  await form.locator('input[name="item_type"][value="service"]').check()
  const sug = await fillNameAndAwaitSuggestions(page, form, `${marker('CSD')}-Herrenhaarschnitt ${Date.now()}`)
  await sug.filter({ hasText: 'Herrenfriseur & Barbier' }).first().click()
  await expect(form.getByTestId('category-selected')).toContainText('Herrenfriseur & Barbier')
  const created = page.waitForResponse((r) => r.url().includes('/api/shop-admin/items') && r.request().method() === 'POST')
  await form.locator('button[type="submit"]').click()
  const resp = await created
  const raw = (await resp.json()) as { id?: number; slug?: string; detail?: { code?: string; similar_items?: Array<{ id: number }> } }
  // Items sind nicht loeschbar: ein Rest-Item eines frueheren Laufs blockiert per Fuzzy-Match (409) -> wiederverwenden
  const reused = resp.status() === 409 && raw.detail?.code === 'fuzzy_match' ? raw.detail.similar_items?.[0] : undefined
  expect([201, 409], JSON.stringify(raw)).toContain(resp.status())
  const itemId = (reused ?? raw).id!
  expect(itemId).toBeTruthy()
  if (!reused) shop.tracker.item(itemId, (raw as { slug?: string }).slug)

  // 2) Listing sicherstellen (Item-Anlage legt es an; bei wiederverwendetem Item ggf. nachziehen)
  // Das Formular legt das Listing NACH der Item-Antwort selbst an (zweiter Request im Browser). Erst warten,
  // dann ggf. selbst anlegen: ein paralleles POST aus dem Test löst einen Unique-Konflikt aus, den das Backend
  // als 500 statt 409 meldet (Race, Lauf B8950-012: "Internal Server Error").
  const findListing = async () => {
    const list = await shop.api<{ items?: Array<{ id: number; item_id: number }> }>('GET', '/shop-listings?limit=500')
    return list.json?.items?.find((l) => l.item_id === itemId)
  }
  let listing = await expect.poll(findListing, { timeout: reused ? 2_000 : 10_000, intervals: [250, 500, 1_000] })
    .toBeTruthy().then(() => findListing(), () => undefined)
  if (!listing) {
    const r = await shop.api<{ id: number; item_id: number; detail?: { shop_listing_id?: number } }>('POST', '/shop-listings', { item_id: itemId })
    // 409 listing_exists: die Item-Anlage im Wizard hat das Listing inzwischen selbst angelegt (Race) → verwenden
    expect([200, 201, 409], r.text).toContain(r.status)
    const existing = (r.json as { detail?: { shop_listing_id?: number } })?.detail?.shop_listing_id
    listing = r.status === 409 ? { id: existing as number, item_id: itemId } : r.json
  }
  expect(listing.id).toBeTruthy()

  // 3) API: Anbieterliste der Karte enthaelt den E2E-Shop; Eltern-Karte "Friseur & Barbier" und
  //    "Schoenheit, Wellness & Fitness" zaehlen ihn mit - jeder Shop genau 1x (AC18)
  for (const id of [barberId, hairId, beautyId]) {
    const slugs = await shopSlugs(id, shop.name)
    expect(slugs.filter((s) => s === shop.slug), `category ${id}`).toHaveLength(1)
  }
  const barber = (await searchApi('Herrenfriseur', 'de')).find((c) => c.category_id === barberId)!
  expect(barber.provider_count, 'Karte zaehlt Listing-Shop und Google-Barbershops').toBeGreaterThanOrEqual(1)
  const parent = (await searchApi('Friseur', 'de')).find((c) => c.category_id === hairId)!
  expect(parent.provider_count, 'Eltern-Karte >= Kind-Karte').toBeGreaterThanOrEqual(barber.provider_count)

  // 4) UI: Suche -> Klick auf die Karte -> /de/shops?service=<id> zeigt Anbieter
  await page.goto(`${FRONTEND_URL}/de/search?q=Herrenfriseur`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /^Herrenfriseur & Barbier —/ }).first().click()
  await page.waitForURL(new RegExp(`/de/shops\\?service=${barberId}`), { timeout: 15_000 })
  const shopsRes = await page.waitForResponse((r) => r.url().includes('/api/') && r.url().includes(`service_category_id=${barberId}`), { timeout: 15_000 }).catch(() => null)
  if (shopsRes) expect(shopsRes.status()).toBe(200)
  await expect(page.locator('a[href*="/shops/"]').first()).toBeVisible({ timeout: 15_000 })
})

// ─── AC19: mehrdeutiger Begriff ──────────────────────────────────────────────

test('AC19: "Reinigung" zeigt getrennte Karten fuer Haushaltshilfe, Waescherei und Gebaeudereinigung', async () => {
  const names = (await searchApi('Reinigung', 'de')).map((c) => c.name)
  expect(names, names.join(' | ')).toContain('Haushaltshilfe & Putzhilfe')
  expect(names).toContain('Wäscherei & Reinigung')
  expect(names).toContain('Reinigungsdienste')
  expect(new Set(names).size).toBe(names.length)
  // Waescherei / Reinigungsdienste haben Vorrang: die Haushaltshilfe (schwaches Synonym) ist nie Top-1
  expect(names[0]).not.toBe('Haushaltshilfe & Putzhilfe')
})

// ─── Mehrdeutige Produktwoerter: Waxing nie Top-1 (Fix F2970) ────────────────

for (const c of [
  { lang: 'el' as Lang, term: 'κερί' }, { lang: 'en' as Lang, term: 'wax' }, { lang: 'de' as Lang, term: 'Wachs' },
  { lang: 'ru' as Lang, term: 'воск' }, { lang: 'ar' as Lang, term: 'شمع' }, { lang: 'he' as Lang, term: 'שעווה' },
]) {
  test(`Mehrdeutiges Wort [${c.lang}] "${c.term}": keine Waxing-Karte als Top-1`, async () => {
    const names = (await searchApi(c.term, c.lang)).map((x) => x.name)
    expect(names[0] ?? '', names.join(' | ')).not.toMatch(/Waxing|Αποτρίχωση|Hair Removal|Haarentfernung|Восковая|שעווה|واكس|Beauty/i)
  })
}

// ─── AC22: RTL bei 390 px ────────────────────────────────────────────────────

for (const c of [{ lang: 'he' as Lang, term: 'מספרה', card: 'מספרה וברבר' }, { lang: 'ar' as Lang, term: 'حلاق', card: 'صالون حلاقة وتصفيف شعر' }]) {
  test(`AC22 [${c.lang}]: Karte laeuft rechts-nach-links, kein horizontaler Scroll bei 390 px`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.context().addCookies([{ name: 'app_lang', value: c.lang, url: FRONTEND_URL }])
    await page.goto(`${FRONTEND_URL}/${c.lang}/search?q=${encodeURIComponent(c.term)}`, { waitUntil: 'domcontentloaded' })
    const card = page.getByRole('button', { name: new RegExp(`^${escapeRe(c.card)} —`) }).first()
    await expect(card).toBeAttached({ timeout: 15_000 })
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    expect(overflow, 'horizontaler Scroll').toBe(true)
    // Textausrichtung der Karte folgt der Leserichtung (start/end-Klassen)
    const align = await card.evaluate((el) => getComputedStyle(el).textAlign)
    expect(['right', 'start', 'end']).toContain(align)
  })
}

// ─── O2: Karte ohne Anbieter -> Onboarding-Hinweis ───────────────────────────

test('O2: Karte mit 0 Anbietern zeigt den Anbieter-Hinweis mit Link auf das Onboarding (ohne Sprachpraefix)', async ({ page }) => {
  // Kind-Karten ohne Anbieter ermitteln (Laufzeit, keine feste ID)
  const cards = await searchApi('Friseur', 'de')
  const empty = cards.find((c) => c.provider_count === 0)
  test.skip(!empty, 'keine Karte ohne Anbieter in den Treffern (alle Kind-Knoten haben Listings)')
  await page.context().addCookies([{ name: 'app_lang', value: 'de', url: FRONTEND_URL }])
  await page.goto(`${FRONTEND_URL}/de/search?q=Friseur`, { waitUntil: 'domcontentloaded' })
  // the result list is rendered for the mobile sheet and the desktop panel: only count visible hints
  const hints = page.locator('[data-testid="service-provider-hint"]:visible')
  await expect(hints.first()).toBeVisible({ timeout: 15_000 })
  const withProviders = cards.filter((c) => c.provider_count > 0).length
  expect(await hints.count(), 'Hinweis nur bei Karten ohne Anbieter').toBe(cards.filter((c) => c.provider_count === 0).length)
  expect(withProviders).toBeGreaterThan(0)
  const link = hints.first().getByRole('link', { name: 'Kostenlos eintragen' })
  expect(await link.getAttribute('href')).toBe('/shop-admin/onboarding')
  await link.click()
  await page.waitForURL(/\/shop-admin\/onboarding/, { timeout: 15_000 })
})

// ─── AC26 + AC21: Regression, Brand-Gleichheit ───────────────────────────────

test('AC26: bisherige Dienstleistungs-Suchen liefern dieselben Top-Treffer wie vor F2970', async () => {
  const expected: Array<[string, Lang, string]> = [
    ['plumber', 'en', 'Plumbing Installation & Repair'],
    ['electrician', 'en', 'Electrical Installation & Repair'],
    ['locksmith', 'en', 'Locksmith Services'],
    ['Klempner', 'de', 'Installateur & Rohrreparaturen'],
    ['Schlüsseldienst', 'de', 'Schlüsseldienst'],
    ['photographer', 'en', 'Photography Services'],
  ]
  for (const [term, lang, name] of expected) {
    const cards = await searchApi(term, lang)
    expect(cards[0]?.name, `${term} (${lang})`).toBe(name)
  }
  // Produktsuche bleibt Produktsuche: keine Service-Karte fuer Katzenfutter
  const r = await fetch(`${BACKEND_URL}/api/v1/search?q=Katzenfutter`, { headers: { 'Accept-Language': 'de', 'X-Smoketest': '1' } })
  const body = (await r.json()) as SearchBody
  expect(body.items.filter((i) => i.result_type === 'service')).toHaveLength(0)
})

test('AC21: identische API-Antwort fuer die Marken (kein Brand-Parameter in der Suche)', async () => {
  const a = await searchApi('парикмахерская', 'ru')
  const b = (await (await fetch(`${BACKEND_URL}/api/v1/search?q=${encodeURIComponent('парикмахерская')}&limit=5`, {
    headers: { 'Accept-Language': 'ru', 'X-Smoketest': '1', 'X-Forwarded-Host': 'naidivse.cy' },
  })).json()) as SearchBody
  const bs = b.items.filter((i): i is ServiceCard => i.result_type === 'service')
  expect(bs.map((c) => [c.category_id, c.name, c.provider_count])).toEqual(a.map((c) => [c.category_id, c.name, c.provider_count]))
})
