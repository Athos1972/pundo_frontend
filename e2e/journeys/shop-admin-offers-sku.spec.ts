/* eslint-disable @typescript-eslint/no-explicit-any -- API-Antworten in der Journey bewusst untypisiert */
/**
 * Journey shop-admin-offers — Gruppe "SKU" (F5920 Nachtrag 2026-10-15-sku-admin-und-anlage).
 *
 * SKU-1..4: Shop-Owner erfasst die Artikelnummer beim Anlegen eines Angebots (Produkt, Dienstleistung, vorhandenes
 *           Listing mit SKU, Konflikt -> nichts gespeichert). ADM-1..4: System-Admin sieht und aendert die SKU
 *           (Liste, Bearbeiten, Konflikt, Entfernen). I18N: Owner ar (RTL, SKU bleibt ltr), Admin el.
 *
 * Fixtures (eigener Spec-Shop `offers-sku`, zweiter Shop `offers-sku-b` nur fuer die Gegenprobe "andere Shops"):
 *   - SKU-1/2: per UI angelegte Artikel (Produkt/Dienstleistung) ohne Vorbedingungen
 *   - SKU-3:   Artikel mit Listing + SKU, ohne Angebot
 *   - SKU-4:   Artikel mit Listing ohne SKU, ohne Angebot
 *   - ADM-*:   zwei Artikel mit Listing + Angebot im Spec-Shop (A, B), ein Artikel mit Angebot im zweiten Shop
 *
 * Ports: Frontend 3500, Backend 8500, DB pundo_test. Aufraeumen: Shop-Delete (afterAll).
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { adminApi, e2eName, rand4 } from './_helpers/test-data'
import { apiCreateOffer, selectItemViaModal, setPriceType } from './_helpers/offers-api'
import { openItemPickerModal } from './_helpers/hydration'
import { pickCategory } from './_helpers/category-picker'
import { listListings } from './_helpers/import-flow'
import { BASE_URL, BACKEND_URL } from '../env'
import { createStepLog, ADMIN_STATE } from '../fixtures'
import { tAdmin } from '../../src/lib/shop-admin-translations'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[shop-admin-offers-sku] Safety: NEVER use production ports!')
}

const { entries: stepLog, logStep } = createStepLog()
async function step(id: string, desc: string, fn: () => Promise<void>): Promise<void> {
  try {
    await test.step(`${id} ${desc}`, fn)
    logStep(id, desc, true)
  } catch (e) {
    logStep(id, desc, false)
    throw e
  }
}

const SPEC = 'OFFERS-SKU'
const U = rand4() + rand4()          // eindeutiger Suffix fuer SKUs dieses Laufs
const SKU = {
  product: `N-${U}`, service: `S-${U}`, prepared: `P-${U}`, adm: `ADM-${U}`, a: `A-${U}`,
}

let shop: WorkerShop
let shopB: WorkerShop

interface Seed { itemId: number; name: string; listingId: number; offerId?: number }

test.describe('shop-admin-offers — Gruppe SKU', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ storageState: { cookies: [], origins: [] } })

  let seedA: Seed
  let seedB: Seed
  let seedOther: Seed
  let prepared: Seed
  let free: Seed
  let ar: Seed

  async function seed(s: WorkerShop, label: string, opts: { sku?: string; offer?: boolean } = {}): Promise<Seed> {
    const it = await s.createItem(SPEC, label, { listing: true })
    if (opts.sku) {
      const r = await s.api('PATCH', `/shop-listings/${it.listingId}`, { sku: opts.sku })
      expect(r.status).toBe(200)
    }
    let offerId: number | undefined
    if (opts.offer) {
      const o = await apiCreateOffer(s.ownerToken, it.listingId!, { title: `Offer ${label}` })
      expect(o.status).toBe(201)
      offerId = o.data.id
    }
    return { itemId: it.id, name: it.name, listingId: it.listingId!, offerId }
  }

  const listingSku = async (id: number) => (await listListings(shop.ownerToken)).find((l) => l.id === id)?.sku ?? null

  test.beforeAll(async () => {
    test.setTimeout(180_000)
    shop = await specShop('offers-sku')
    shopB = await specShop('offers-sku-b')
    prepared = await seed(shop, 'prepared', { sku: SKU.prepared })
    free = await seed(shop, 'free')
    ar = await seed(shop, 'arabic')
    seedA = await seed(shop, 'admA', { sku: SKU.a, offer: true })
    seedB = await seed(shop, 'admB', { offer: true })
    seedOther = await seed(shopB, 'other', { offer: true })
  })

  test.afterAll(async () => {
    try { await shop?.destroy() } catch (e) { console.warn('[shop-admin-offers-sku] cleanup shop:', e) }
    try { await shopB?.destroy() } catch (e) { console.warn('[shop-admin-offers-sku] cleanup shopB:', e) }
    const dir = path.join(__dirname, 'reports')
    fs.mkdirSync(dir, { recursive: true })
    const lines = [
      '# Journey-Report: shop-admin-offers — Gruppe SKU', '',
      `**Datum:** ${new Date().toISOString()}`, `**Frontend:** ${BASE_URL}  **Backend:** ${BACKEND_URL}`,
      `**Spec-Shop:** ${shop?.slug ?? '—'}  **Zweiter Shop:** ${shopB?.slug ?? '—'}`, '',
      '| Schritt | Beschreibung | Status |', '|---|---|---|',
      ...stepLog.map((s) => `| ${s.step} | ${s.desc} | **${s.status}** |`),
    ]
    fs.writeFileSync(path.join(dir, `shop-admin-offers-sku-${new Date().toISOString().slice(0, 10)}.md`), lines.join('\n'))
  })

  test.beforeEach(async ({ context }) => {
    await context.addCookies(shop.storageState.cookies)
    await context.addCookies([{ name: 'app_lang', value: 'en', domain: new URL(BASE_URL).hostname, path: '/' }])
  })

  // ── Owner: Neu-Flow ─────────────────────────────────────────────────────────

  /** Neuen Artikel ueber den Picker anlegen (Typ product|service) -> Schritt 2. */
  async function createItemInPicker(page: Page, type: 'product' | 'service', label: string): Promise<void> {
    const tr = tAdmin('en')
    await page.goto(`${BASE_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
    await openItemPickerModal(page.getByRole('button', { name: /^\+ /i }))
    await page.getByRole('button', { name: new RegExp(`^\\+ ${tr.item_picker_add_new}`) }).click()
    const form = page.locator('form').filter({ has: page.locator('fieldset legend') })
    await form.locator(`input[type="radio"][value="${type}"]`).check()
    await form.locator('input[type="text"]').first().fill(e2eName(SPEC, label))
    // Dienstleistungen nutzen die UNSPSC-Taxonomie: die zufaelligen Produktbegriffe (bread, lamp ...) fanden dort nichts.
    if (type === 'service') await pickCategory(page, form, { suggestion: false, query: 'cleaning' })
    else await pickCategory(page, form, { random: true })
    const resp = page.waitForResponse((r) => r.url().includes('/api/shop-admin/items') && r.request().method() === 'POST')
    await form.locator('button[type="submit"]').click()
    const r = await resp
    expect(r.status(), await r.text()).toBe(201)
    const body = (await r.json()) as { id: number; slug: string }
    shop.tracker.item(body.id, body.slug)
    await expect(page.locator('#offer-sku')).toBeVisible({ timeout: 30_000 })
  }

  async function saveStep2(page: Page): Promise<void> {
    await setPriceType(page, 'on_request')
    await page.locator('form button[type="submit"]').click()
  }

  for (const [id, type, sku] of [['SKU-1', 'product', SKU.product], ['SKU-2', 'service', SKU.service]] as const) {
    test(`${id}: neues ${type} mit SKU anlegen -> Liste zeigt die SKU`, async ({ page }) => {
      test.setTimeout(120_000)
      await step(id, `Artikel (${type}) anlegen, SKU ${sku} in Schritt 2, speichern`, async () => {
        await createItemInPicker(page, type, id)
        await page.locator('#offer-sku').fill(sku)
        await saveStep2(page)
        await page.waitForURL(/\/shop-admin\/offers(\?|$)/, { timeout: 30_000 })
      })
      await step(id, 'Angebotsliste zeigt die SKU; Listing traegt sie', async () => {
        await expect(page.getByTestId('offer-sku').filter({ hasText: sku })).toHaveCount(1, { timeout: 30_000 })
        expect((await listListings(shop.ownerToken)).filter((l) => l.sku === sku)).toHaveLength(1)
      })
    })
  }

  test('SKU-3: vorhandenes Listing mit SKU ist im Feld vorbelegt; unveraendert gespeichert bleibt sie', async ({ page }) => {
    test.setTimeout(120_000)
    await step('SKU-3', 'Artikel im Picker waehlen -> Feld zeigt die vorhandene SKU', async () => {
      await page.goto(`${BASE_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
      await selectItemViaModal(page, prepared.name)
      await expect(page.locator('#offer-sku')).toHaveValue(SKU.prepared, { timeout: 30_000 })
    })
    await step('SKU-3', 'speichern -> Liste zeigt die SKU, Listing unveraendert', async () => {
      await saveStep2(page)
      await page.waitForURL(/\/shop-admin\/offers(\?|$)/, { timeout: 30_000 })
      await expect(page.getByTestId('offer-sku').filter({ hasText: SKU.prepared })).toHaveCount(1, { timeout: 30_000 })
      expect(await listingSku(prepared.listingId)).toBe(SKU.prepared)
    })
  })

  test('SKU-4: vergebene SKU im Neu-Flow -> Feldmeldung, kein Angebot, Listing ohne SKU', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(`${BASE_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
    await selectItemViaModal(page, free.name)
    await expect(page.locator('#offer-sku')).toHaveValue('', { timeout: 30_000 })
    await page.locator('#offer-sku').fill(SKU.product)
    await saveStep2(page)
    await step('SKU-4', 'Meldung am Feld, keine Navigation', async () => {
      await expect(page.locator('#offer-sku-error')).toContainText('already used by another article in your shop', { timeout: 30_000 })
      expect(page.url()).toContain('/shop-admin/offers/new')
    })
    await step('SKU-4', 'nichts gespeichert: kein Angebot, Listing ohne SKU', async () => {
      const offers = await shop.api<any>('GET', '/offers?limit=200')
      expect(offers.json.items.filter((o: any) => o.shop_listing_id === free.listingId)).toHaveLength(0)
      expect(await listingSku(free.listingId)).toBeNull()
    })
  })

  // ── System-Admin ────────────────────────────────────────────────────────────

  async function adminPage(browser: import('@playwright/test').Browser, lang = 'en') {
    const ctx = await browser.newContext({ baseURL: BASE_URL, storageState: ADMIN_STATE })
    await ctx.addCookies([{ name: 'app_lang', value: lang, domain: new URL(BASE_URL).hostname, path: '/' }])
    return { ctx, page: await ctx.newPage() }
  }

  test('ADM-1: /admin/offers zeigt SKU, Listing-ID, Quelle und Archiv-Status (nicht leer)', async ({ browser }) => {
    test.setTimeout(120_000)
    const { ctx, page } = await adminPage(browser)
    try {
      await page.goto(`${BASE_URL}/admin/offers?q=${encodeURIComponent(seedA.name)}`, { waitUntil: 'domcontentloaded' })
      const row = page.locator('tbody tr').filter({ hasText: SKU.a })
      await step('ADM-1', 'Zeile mit SKU, Listing-ID, Quelle und Archiv-Status', async () => {
        await expect(row).toHaveCount(1, { timeout: 30_000 })
        await expect(row).toContainText(String(seedA.listingId))
        await expect(row).toContainText('shop_manual')
        await expect(row).toContainText('No')
        await expect(row).toContainText(seedA.name)
      })
      await step('ADM-1', 'kein "+ New"-Link', async () => {
        await expect(page.locator('a[href="/admin/offers/new"]')).toHaveCount(0)
      })
    } finally { await ctx.close() }
  })

  test('ADM-2: Admin aendert die SKU -> Liste (Filter sku) und Owner-Sicht zeigen sie', async ({ browser }) => {
    test.setTimeout(120_000)
    const { ctx, page } = await adminPage(browser)
    try {
      await page.goto(`${BASE_URL}/admin/offers/${seedA.offerId}/edit`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('#admin-offer-sku')).toHaveValue(SKU.a, { timeout: 30_000 })
      await page.locator('#admin-offer-sku').fill(SKU.adm)
      await page.locator('form button[type="submit"]').click()
      await page.waitForURL(/\/admin\/offers$/, { timeout: 30_000 })
      await step('ADM-2', 'Liste gefiltert nach der neuen SKU zeigt genau eine Zeile', async () => {
        await page.goto(`${BASE_URL}/admin/offers?sku=${encodeURIComponent(SKU.adm)}`, { waitUntil: 'domcontentloaded' })
        await expect(page.locator('tbody tr')).toHaveCount(1, { timeout: 30_000 })
      })
      await step('ADM-2', 'Shop-Owner sieht die SKU in seiner Angebotsliste (API listing_sku)', async () => {
        const offers = await shop.api<any>('GET', '/offers?limit=200')
        expect(offers.json.items.find((o: any) => o.id === seedA.offerId).listing_sku).toBe(SKU.adm)
      })
    } finally { await ctx.close() }
  })

  test('ADM-3: Konflikt im selben Shop -> Meldung, nichts gespeichert; anderer Shop ist erlaubt', async ({ browser }) => {
    test.setTimeout(120_000)
    const { ctx, page } = await adminPage(browser)
    try {
      await page.goto(`${BASE_URL}/admin/offers/${seedB.offerId}/edit`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('#admin-offer-sku')).toBeVisible({ timeout: 30_000 })
      await page.locator('#admin-offer-sku').fill(SKU.adm)
      await page.locator('form button[type="submit"]').click()
      await step('ADM-3', 'Feldmeldung (EN), keine Navigation', async () => {
        await expect(page.locator('#admin-offer-sku-error')).toContainText('already used by another article of this shop', { timeout: 30_000 })
        expect(page.url()).toContain(`/admin/offers/${seedB.offerId}/edit`)
      })
      await step('ADM-3', 'beide SKUs unveraendert', async () => {
        expect(await listingSku(seedA.listingId)).toBe(SKU.adm)
        expect(await listingSku(seedB.listingId)).toBeNull()
      })
      await step('ADM-3', 'Gegenprobe: dieselbe SKU an einem Listing eines anderen Shops -> 200', async () => {
        const r = await adminApi<any>('PATCH', `/offers/${seedOther.offerId}`, { sku: SKU.adm })
        expect(r.status, r.text).toBe(200)
        expect(r.json.sku).toBe(SKU.adm)
      })
    } finally { await ctx.close() }
  })

  // ── Sprachen / RTL ──────────────────────────────────────────────────────────

  test('I18N: Owner auf ar (Schritt 2: Label uebersetzt, SKU ltr, Seite rtl); Admin auf el (Label, Konfliktmeldung)', async ({ page, browser, context }) => {
    test.setTimeout(120_000)
    await step('I18N', 'Owner ar: Neu-Flow Schritt 2', async () => {
      await context.addCookies([{ name: 'app_lang', value: 'ar', domain: new URL(BASE_URL).hostname, path: '/' }])
      await page.goto(`${BASE_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
      await selectItemViaModal(page, ar.name)
      const input = page.getByLabel(tAdmin('ar').offer_sku_label)
      await expect(input).toBeVisible({ timeout: 30_000 })
      await expect(input).toHaveAttribute('dir', 'ltr')
      await expect(page.locator('[dir="rtl"]').first()).toBeAttached()
    })
    const { ctx, page: ap } = await adminPage(browser, 'el')
    try {
      await step('I18N', 'Admin el: Label und griechische Konfliktmeldung', async () => {
        await ap.goto(`${BASE_URL}/admin/offers/${seedB.offerId}/edit`, { waitUntil: 'domcontentloaded' })
        await expect(ap.getByLabel('SKU', { exact: true })).toBeVisible({ timeout: 30_000 })
        await ap.locator('#admin-offer-sku').fill(SKU.adm)
        await ap.locator('form button[type="submit"]').click()
        await expect(ap.locator('#admin-offer-sku-error')).toContainText('χρησιμοποιείται ήδη από άλλο προϊόν του καταστήματος', { timeout: 30_000 })
      })
    } finally { await ctx.close() }
  })

  test('ADM-4: Admin leert die SKU -> Listing ohne SKU', async ({ browser }) => {
    test.setTimeout(120_000)
    const { ctx, page } = await adminPage(browser)
    try {
      await page.goto(`${BASE_URL}/admin/offers/${seedA.offerId}/edit`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('#admin-offer-sku')).toHaveValue(SKU.adm, { timeout: 30_000 })
      await page.locator('#admin-offer-sku').fill('')
      await page.locator('form button[type="submit"]').click()
      await page.waitForURL(/\/admin\/offers$/, { timeout: 30_000 })
      await step('ADM-4', 'Listing hat keine SKU mehr', async () => {
        expect(await listingSku(seedA.listingId)).toBeNull()
      })
    } finally { await ctx.close() }
  })

  test('I18N-2: Owner he/ar (RTL) und Admin en/el bei 390 px: SKU ltr, kein Horizontal-Overflow', async ({ page, browser, context }) => {
    test.setTimeout(150_000)
    const overflow = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    for (const lang of ['he', 'ar'] as const) {
      await step('I18N-2', `Owner ${lang} bei 390 px: Schritt 2`, async () => {
        await page.setViewportSize({ width: 390, height: 844 })
        await context.addCookies([{ name: 'app_lang', value: lang, domain: new URL(BASE_URL).hostname, path: '/' }])
        await page.goto(`${BASE_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
        await selectItemViaModal(page, ar.name)
        const input = page.getByLabel(tAdmin(lang).offer_sku_label)
        await expect(input).toBeVisible({ timeout: 30_000 })
        await expect(input).toHaveAttribute('dir', 'ltr')
        await expect(page.locator('[dir="rtl"]').first()).toBeAttached()
        await input.scrollIntoViewIfNeeded()
        const box = await input.boundingBox()
        expect(box && box.x >= 0 && box.x + box.width <= 390).toBeTruthy()
        expect(await overflow(page)).toBeLessThanOrEqual(1)
      })
    }
    for (const lang of ['en', 'el'] as const) {
      const { ctx, page: ap } = await adminPage(browser, lang)
      try {
        await step('I18N-2', `Admin ${lang} bei 390 px: Formular`, async () => {
          await ap.setViewportSize({ width: 390, height: 844 })
          await ap.goto(`${BASE_URL}/admin/offers/${seedB.offerId}/edit`, { waitUntil: 'domcontentloaded' })
          const sku = ap.locator('#admin-offer-sku')
          await expect(sku).toBeVisible({ timeout: 30_000 })
          await expect(sku).toHaveAttribute('dir', 'ltr')
          const box = await sku.boundingBox()
          expect(box && box.x >= 0 && box.x + box.width <= 390).toBeTruthy()
          expect(await overflow(ap)).toBeLessThanOrEqual(1)
        })
      } finally { await ctx.close() }
    }
  })
})
