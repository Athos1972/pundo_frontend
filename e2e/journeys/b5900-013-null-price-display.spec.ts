/**
 * B5900-013 — Kundenseiten zeigen nie "null/None/NaN EUR"
 *
 * Läuft ausschließlich gegen Test-Instanz 3500 / 8500. Kein DB-Reset.
 * Legt eigene Fixtures an (3 Items im E2E-Test-Shop: fixed / on_request / free) und setzt per psql
 * NUR das eigene fixed-Offer auf den Altdaten-Zustand (price_tiers = []). Braucht DATABASE_URL_TEST + psql,
 * sonst skip. Aufräumen: eigene Offers archivieren/löschen, eigene Listings löschen (Items bleiben).
 */
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5900-013] Safety: NEVER use production ports!')
}

const STATE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.test-state.json'), 'utf8')) as {
  email: string; password: string; shopId: number; shopSlug: string
}
test.describe.configure({ mode: 'serial' })

const DB = (process.env.DATABASE_URL_TEST ?? '').replace('+psycopg', '')
const HAVE_DB = DB.includes('pundo_test')
function psql(sql: string): string {
  return execFileSync('psql', [DB, '-Atc', sql], { encoding: 'utf8' }).trim()
}

const TS = Date.now()
const PREFIX = `E2E-B5900-013-${TS}`
const KINDS = ['fixed', 'onreq', 'free'] as const
type Kind = (typeof KINDS)[number]
const created: Record<Kind, { itemId: number; slug: string; listingId: number; offerId: number }> =
  {} as never
let token = ''
const BAD = /\b(null|undefined|NaN|None)\b\s*(EUR|€)?/

const headers = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
async function api(method: string, p: string, body?: unknown) {
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner${p}`, {
    method, headers: headers(), body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  return { status: r.status, json: text ? JSON.parse(text) : null }
}

test.beforeAll(async () => {
  test.skip(!HAVE_DB, 'DATABASE_URL_TEST (pundo_test) + psql nötig')
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: STATE.email, password: STATE.password }),
  })
  token = (r.headers.get('set-cookie') ?? '').match(/shop_owner_token=([^;]+)/)?.[1] ?? ''
  expect(token, 'Login fehlgeschlagen').not.toBe('')
  const categoryId = Number(psql('select category_id from items where category_id is not null limit 1'))

  for (const kind of KINDS) {
    const item = await api('POST', '/items', {
      name: `${PREFIX}-${kind}`, name_lang: 'en', category_id: categoryId, confirmed: true,
    })
    expect(item.status, JSON.stringify(item.json)).toBe(201)
    const listing = await api('POST', '/shop-listings', { item_id: item.json.id })
    const listingId = (listing.json.id ?? listing.json.shop_listing_id) as number
    expect(listingId, JSON.stringify(listing.json)).toBeTruthy()
    const offerBody =
      kind === 'fixed'
        ? { shop_listing_id: listingId, price_type: 'fixed', currency: 'EUR',
            price_tiers: [{ unit: 'piece', steps: [{ min_quantity: 1, price: '4.00', currency: 'EUR' }] }] }
        : { shop_listing_id: listingId, price_type: kind === 'free' ? 'free' : 'on_request', currency: 'EUR', price_tiers: [] }
    const offer = await api('POST', '/offers', offerBody)
    expect(offer.status, JSON.stringify(offer.json)).toBe(201)
    created[kind] = { itemId: item.json.id, slug: item.json.slug, listingId, offerId: offer.json.id }
  }
  // Nur das EIGENE fixed-Offer in den defekten Altdaten-Zustand versetzen
  psql(`update offers set price_tiers='[]'::jsonb where id=${created.fixed.offerId} and price_type='fixed'`)
})

test.afterAll(async () => {
  for (const kind of KINDS) {
    const c = created[kind]
    if (!c) continue
    await api('PATCH', `/offers/${c.offerId}`, { archived: true }).catch(() => {})
    await api('DELETE', `/offers/${c.offerId}`).catch(() => {})
    await api('DELETE', `/shop-listings/${c.listingId}`).catch(() => {})
  }
})

test('Shop-Seite (en): No price listed / Price on request / Free, nie "null EUR"', async ({ page }) => {
  await page.goto(`${FRONTEND_URL}/en/shops/${STATE.shopSlug}`, { waitUntil: 'domcontentloaded' })
  const main = page.locator('body')
  await expect(main.getByText(`${PREFIX}-fixed`).first()).toBeAttached()
  await expect(main.getByText('No price listed').first()).toBeVisible()
  await expect(main.getByText('Price on request').first()).toBeVisible()
  expect(await main.innerText()).not.toMatch(BAD)
})

test('Suche (en): gleiche Assertions auf clientseitigen ProductCards', async ({ page }) => {
  await page.goto(`${FRONTEND_URL}/en/search?q=${encodeURIComponent(PREFIX)}`, { waitUntil: 'domcontentloaded' })
  const main = page.locator('body')
  await expect(main.getByText(`${PREFIX}-fixed`).locator('visible=true').first()).toBeVisible({ timeout: 20_000 })
  await expect(main.getByText('No price listed').locator('visible=true').first()).toBeVisible()
  expect(await main.innerText()).not.toMatch(BAD)
})

test('Produktdetail: Label sichtbar, JSON-LD ohne ungültigen Preis', async ({ page }) => {
  await page.goto(`${FRONTEND_URL}/en/products/${created.fixed.slug}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('body').getByText('No price listed').first()).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(BAD)
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n')
  expect(ld).not.toMatch(/"price":\s*(null|"None"|"")/)
})

for (const [lang, label, rtl] of [
  ['de', 'Kein Preis angegeben', false],
  ['ar', 'السعر غير محدد', true],
  ['he', 'המחיר לא צוין', true],
] as const) {
  test(`Suche (${lang}): lokalisiertes Label${rtl ? ', RTL' : ''}`, async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/${lang}/search?q=${encodeURIComponent(PREFIX)}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body').getByText(label).locator('visible=true').first()).toBeVisible({ timeout: 20_000 })
    if (rtl) await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    expect(await page.locator('body').innerText()).not.toMatch(BAD)
  })
}
