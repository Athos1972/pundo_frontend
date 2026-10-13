/**
 * Journey: Staffelpreise & Einheiten in der Kundensicht (F5200)
 * Runbook: e2e/journeys/customer-offer-price-tiers.md
 *
 * Spec: 2026-10-13-staffelpreise-kundensicht (AK1–AK16)
 *
 * Läuft ausschließlich gegen Test-Instanz 3500 / 8500. Kein DB-Reset.
 * Legt eigene Fixtures im Worker-Shop an (Marker E2E-<RUN>-F5200-…) und ändert nur das eigene Offer.
 * Hinweis: Jede Preisänderung per PATCH archiviert das Offer und legt ein neues an (Preishistorie),
 * deshalb wird die aktuelle Offer-ID mitgeführt.
 * Aufräumen: workerShop.cleanupSpecData() (Offers archivieren, Listings löschen).
 */
import { test, expect, type WorkerShop } from './_helpers/worker-shop'
import { rand4 } from './_helpers/test-data'
import type { Page } from '@playwright/test'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[F5200] Safety: NEVER use production ports!')
}

test.describe.configure({ mode: 'serial' })

const BAD = /\b(null|undefined|NaN|None)\b/

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)

const step = (min: number, max: number | null, price: string) => ({
  min_quantity: min, max_quantity: max, price, currency: 'EUR',
})
const NO_PROMO = { promo_price_type: null, promo_price_tiers: [], promo_valid_from: null, promo_valid_until: null }
const promo = (tiers: unknown[]) => ({
  promo_price_type: 'fixed', promo_price_tiers: tiers, promo_valid_from: day(-1), promo_valid_until: day(6),
})
const BREAD_TIERS = [{ unit: 'per_piece', steps: [step(1, 5, '4.50'), step(6, null, '4.00')] }]

let shop: WorkerShop
let item: { id: number; slug: string }
let legacyItem: { id: number; slug: string }
let offerId: number
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untypisierte Backend-JSON-Antworten
const api = (method: string, p: string, body?: unknown) => shop.api<any>(method, p, body)

/** Preisänderung: PATCH archiviert + legt neues Offer an → neue ID merken. */
async function setOffer(body: Record<string, unknown>) {
  const res = await api('PATCH', `/offers/${offerId}`, body)
  expect(res.status, JSON.stringify(res.json)).toBe(200)
  offerId = res.json.id
}

/** Zeile des Test-Shops in der OfferList. */
const offerRow = (page: Page) => page.locator('div.py-3').filter({ has: page.locator(`a[href*="/shops/${shop.slug}"]`) }).first()

async function goProduct(page: Page, lang: string, slug = item.slug) {
  await page.goto(`${FRONTEND_URL}/${lang}/products/${slug}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator(`a[href*="/shops/${shop.slug}"]`).first()).toBeVisible()
}

async function jsonLdOffers(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  const product = blocks.map((b) => JSON.parse(b)).find((d) => d['@type'] === 'Product')
  return (product?.offers ?? []) as Array<Record<string, unknown>>
}

async function hideOverlays(page: Page) {
  await page.addStyleTag({ content: '[role=dialog],div.fixed{display:none!important}' })
}

const shopCard = (page: Page, slug: string) =>
  page.locator('main div.relative').filter({ has: page.locator(`a[href*="/products/${slug}"]`) }).locator('visible=true').first()

test.beforeAll(async ({ workerShop }) => {
  shop = workerShop
  const mk = async (label: string) => {
    const it = await shop.createItem('F5200', `${label}-${rand4()}`, { listing: true })
    return { id: it.id, slug: it.slug, listingId: it.listingId as number }
  }
  const main = await mk('bread')
  item = main
  const offer = await api('POST', '/offers', {
    shop_listing_id: main.listingId, price_type: 'fixed', currency: 'EUR', price_tiers: BREAD_TIERS,
  })
  expect(offer.status, JSON.stringify(offer.json)).toBe(201)
  offerId = offer.json.id

  // Legacy/gecrawlt-Optik: Einheit "piece" (kein price_units-Code) → unit_label = null
  const legacy = await mk('legacy')
  legacyItem = legacy
  const lo = await api('POST', '/offers', {
    shop_listing_id: legacy.listingId, price_type: 'fixed', currency: 'EUR',
    price_tiers: [{ unit: 'piece', steps: [step(1, null, '3.00')] }],
  })
  expect(lo.status, JSON.stringify(lo.json)).toBe(201)
})

test.afterAll(async () => {
  await shop?.cleanupSpecData()
})

test('S1 (AK1, AK16): Produktseite de ohne Aktion: Hauptpreis, Suffix, eine Staffelzeile, kein Badge', async ({ page, request }) => {
  await goProduct(page, 'de')
  const row = offerRow(page)
  await expect(row.locator('p.font-bold').first()).toHaveText('4.50 EUR')
  await expect(row.getByText('/ Stück', { exact: true }).first()).toBeVisible()
  const tiers = row.locator('ul[aria-label="Mengenpreise"] li')
  await expect(tiers).toHaveCount(1)
  await expect(tiers.first()).toHaveText('ab 6: 4.00 EUR / Stück')
  await expect(row.locator('s')).toHaveCount(0)
  await expect(row.getByText('Aktion bis')).toHaveCount(0)
  expect(await row.innerText()).not.toMatch(BAD)

  // AK16: API additiv, promo_price_tiers null ohne Aktion, price unverändert
  const res = await request.get(`${BACKEND_URL}/api/v1/products/by-slug/${item.slug}`, { headers: { 'Accept-Language': 'de' } })
  const o = (await res.json()).offers.find((x: { shop_slug: string }) => x.shop_slug === shop.slug)
  expect(o.price).toBe('4.50')
  expect(o.standard_price).toBe('4.50')
  expect(o.promo_price).toBeNull()
  expect(o.promo_price_tiers).toBeNull()
  expect(o.price_tiers[0].unit_label).toBe('Stück')
})

test('S2 (AK4, O1): Shop-Seite ohne Aktion hat keinen Aktionsblock; JSON-LD priceSpecification mit eligibleQuantity', async ({ page }) => {
  await page.goto(`${FRONTEND_URL}/de/shops/${shop.slug}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('h2').filter({ hasText: 'Aktuelle Angebote' })).toHaveCount(0)

  await goProduct(page, 'de')
  const offers = await jsonLdOffers(page)
  const mine = offers.find((o) => (o.seller as { name?: string })?.name === shop.name) ?? offers[0]
  expect(mine.price).toBe('4.50')
  const specs = mine.priceSpecification as Array<Record<string, any>> // eslint-disable-line @typescript-eslint/no-explicit-any
  expect(specs).toHaveLength(2)
  expect(specs[0].eligibleQuantity).toMatchObject({ minValue: 1, maxValue: 5, unitCode: 'H87', unitText: 'Stück' })
  expect(specs[1].eligibleQuantity).toMatchObject({ minValue: 6, unitCode: 'H87' })
  expect(specs[1].price).toBe('4.00')
})

test('S3 (AK2, AK3, O1): aktive Aktion ersetzt Staffel; Produktseite + ShopOfferCard + JSON-LD validThrough', async ({ page }) => {
  await setOffer({ ...promo([{ unit: 'per_piece', steps: [step(1, null, '3.90')] }]) })
  await goProduct(page, 'de')
  const row = offerRow(page)
  await expect(row.locator('p.font-bold').first()).toHaveText('3.90 EUR')
  await expect(row.getByText('/ Stück', { exact: true }).first()).toBeVisible()
  await expect(row.locator('s')).toHaveText('4.50 EUR')
  await expect(row.getByText(/Aktion bis/)).toBeVisible()
  await expect(row.getByText(/ab 6/)).toHaveCount(0)
  await expect(row.locator('ul[aria-label]')).toHaveCount(0)

  const offers = await jsonLdOffers(page)
  const mine = offers.find((o) => (o.seller as { name?: string })?.name === shop.name) ?? offers[0]
  expect(mine.price).toBe('3.90')
  expect(mine.priceValidUntil).toBe(day(6))
  const specs = mine.priceSpecification as Array<Record<string, any>> // eslint-disable-line @typescript-eslint/no-explicit-any
  expect(specs[0]).toMatchObject({ price: '3.90', validFrom: day(-1), validThrough: day(6) })

  await page.goto(`${FRONTEND_URL}/de/shops/${shop.slug}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('h2').filter({ hasText: 'Aktuelle Angebote' }).locator('visible=true').first()).toBeVisible()
  const card = shopCard(page, item.slug)
  const text = await card.innerText()
  expect(text).toContain('3.90 EUR')
  expect(text).toContain('/ Stück')
  expect(text).toMatch(/Aktion bis/)
  expect(text).not.toMatch(/ab 6|4\.00/)
  await expect(card.locator('s')).toHaveText('4.50 EUR')
})

test('S4 (AK5, AK8): Promo mit eigener Staffel; Karte bleibt kompakt (1 Zeile + "+ weitere Preise") bei 390 px', async ({ page }) => {
  await setOffer({ ...promo([{ unit: 'per_piece', steps: [step(1, 5, '3.90'), step(6, null, '3.50')] }]) })
  await goProduct(page, 'de')
  await expect(offerRow(page).locator('ul[aria-label="Mengenpreise"] li')).toHaveText(['ab 6: 3.50 EUR / Stück'])

  await page.goto(`${FRONTEND_URL}/de/shops/${shop.slug}`, { waitUntil: 'domcontentloaded' })
  await expect(shopCard(page, item.slug)).toContainText('ab 6: 3.50 EUR / Stück')
  await expect(shopCard(page, item.slug)).not.toContainText('weitere Preise')

  // Baseline: Kartenhöhe bei 390 px mit Aktion, aber OHNE Zusatzzeile (Marker-Itemname umbricht, daher relativ messen)
  await setOffer({ ...promo([{ unit: 'per_piece', steps: [step(1, null, '3.90')] }]) })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${FRONTEND_URL}/de/shops/${shop.slug}`, { waitUntil: 'domcontentloaded' })
  await hideOverlays(page)
  await expect(shopCard(page, item.slug)).toContainText('3.90 EUR')
  const baseHeight = (await shopCard(page, item.slug).boundingBox())!.height

  // 2 Einheiten + 3 Steps → eine Zusatzzeile + "+ weitere Preise"
  await setOffer({ ...promo([
    { unit: 'per_hour', steps: [step(1, null, '40.00')] },
    { unit: 'per_m2', steps: [step(1, null, '25.00'), step(50, null, '22.00')] },
  ]) })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${FRONTEND_URL}/de/shops/${shop.slug}`, { waitUntil: 'domcontentloaded' })
  await hideOverlays(page)
  const card = shopCard(page, item.slug)
  await expect(card).toContainText('40.00 EUR')
  await expect(card).toContainText('/ Stunde')
  await expect(card).toContainText('25.00 EUR / m²')
  await expect(card).toContainText('+ weitere Preise')
  await expect(card).not.toContainText('22.00')
  const box = await card.boundingBox()
  // Demo-Fixture (kurzer Name) misst 122 px; hier: höchstens eine zusätzliche Textzeile (~20 px) gegenüber der Baseline
  expect(box!.height - baseHeight).toBeLessThanOrEqual(20)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBe(0)
  expect(await card.innerText()).not.toMatch(BAD)
})

test('S5 (AK6, AK7, AK10, AK11, AK12): mehrere Einheiten, Einklappen ab >3 Zeilen, custom/fixed/Mindestmenge', async ({ page }) => {
  // AK6
  await setOffer({ ...NO_PROMO, price_tiers: [
    { unit: 'per_hour', steps: [step(1, null, '45.00')] },
    { unit: 'per_m2', steps: [step(1, null, '30.00'), step(50, null, '26.00')] },
  ] })
  await goProduct(page, 'de')
  let row = offerRow(page)
  await expect(row.locator('p.font-bold').first()).toHaveText('45.00 EUR')
  await expect(row.getByText('/ Stunde', { exact: true })).toBeVisible()
  await expect(row.locator('ul[aria-label="Mengenpreise"] li')).toHaveText(['30.00 EUR / m²', 'ab 50: 26.00 EUR / m²'])

  // AK7 + AK10 custom: 5 Zeilen → 3 sichtbar + "Alle Preise (5)"
  await setOffer({ price_tiers: [
    { unit: 'per_hour', steps: [step(1, null, '45.00')] },
    { unit: 'per_m2', steps: [step(1, 9, '30.00'), step(10, 49, '28.00'), step(50, null, '26.00')] },
    { unit: 'custom', unit_label_custom: 'Laib', steps: [step(1, null, '7.00'), step(3, null, '6.00')] },
  ] })
  await goProduct(page, 'de')
  row = offerRow(page)
  const summary = row.getByText('Alle Preise (5)')
  await expect(summary).toBeVisible()
  const visible = row.locator('ul[aria-label="Mengenpreise"] > li:visible')
  await expect(visible).toHaveCount(4) // 3 Zeilen + <details>
  await expect(row.getByText('7.00 EUR / Laib')).toBeHidden()
  await summary.click()
  await expect(row.getByText('7.00 EUR / Laib')).toBeVisible()
  await expect(row.getByText('ab 3: 6.00 EUR / Laib')).toBeVisible()
  expect(await row.innerText()).not.toMatch(BAD)

  // AK10 fixed: kein Suffix
  await setOffer({ price_tiers: [{ unit: 'fixed', steps: [step(1, null, '25.00')] }] })
  await goProduct(page, 'de')
  row = offerRow(page)
  await expect(row.locator('p.font-bold').first()).toHaveText('25.00 EUR')
  expect((await row.innerText()).includes('/ ')).toBe(false)
  await expect(row.locator('ul[aria-label]')).toHaveCount(0)

  // AK11 Mindestmenge
  await setOffer({ price_tiers: [{ unit: 'per_piece', steps: [step(3, null, '4.50')] }] })
  await goProduct(page, 'de')
  row = offerRow(page)
  await expect(row.locator('p.font-bold').first()).toHaveText('ab 3 · 4.50 EUR')
  await expect(row.getByText('/ Stück', { exact: true })).toBeVisible()
})

test('S6 (AK9): Legacy-/gecrawlte Einheit "piece": kein Suffix, kein Staffelblock, kein JSON-LD priceSpecification', async ({ page }) => {
  await goProduct(page, 'de', legacyItem.slug)
  const row = offerRow(page)
  await expect(row.locator('p.font-bold').first()).toHaveText('3.00 EUR')
  expect((await row.innerText()).includes('/ ')).toBe(false)
  await expect(row.locator('ul[aria-label]')).toHaveCount(0)
  const offers = await jsonLdOffers(page)
  expect(offers.every((o) => !('priceSpecification' in o))).toBe(true)
})

for (const [lang, unit, from, rtl] of [
  ['en', 'Piece', 'from 6', false],
  ['el', 'Τεμάχιο', 'από 6', false],
  ['ru', 'Штука', 'от 6', false],
  ['ar', 'قطعة', 'من 6', true],
  ['he', 'יחידה', 'החל מ-6', true],
] as const) {
  test(`S7 (AK13, AK14, AK15): ${lang} ${rtl ? 'RTL ' : ''}390 px: Einheit + tier_from übersetzt, kein Overflow`, async ({ page }) => {
    await setOffer({ ...NO_PROMO, price_tiers: BREAD_TIERS })
    await page.setViewportSize({ width: 390, height: 844 })
    await goProduct(page, lang)
    const row = offerRow(page)
    await expect(row.locator('p.text-xs', { hasText: `/ ${unit}` }).first()).toBeVisible()
    const tier = row.locator('ul[aria-label] li').first()
    await expect(tier).toContainText(from)
    await expect(tier).toContainText(unit)
    await expect(tier.locator('bdi', { hasText: '4.00 EUR' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('dir', rtl ? 'rtl' : 'ltr')
    await expect(row.locator(`a[href*="/shops/${shop.slug}"]`)).toBeVisible() // Shop-Name bleibt sichtbar
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBe(0)
    expect(await row.innerText()).not.toMatch(BAD)
  })
}
