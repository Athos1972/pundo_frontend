/**
 * B5900-010 — Shop-Admin Angebotsformular: Beschriftungen + Namenssprache
 *
 * Nur gegen Test-Instanz 3500 / 8500. Kein DB-Reset.
 * Items sind global und vom Owner nicht löschbar -> eindeutiger Name `E2E-B5900-010-<uuid>`;
 * das Item bleibt (Test-DB), das Angebot gibt es nicht (nur Item-Anlage über die UI).
 *
 * Fixtures (zur Laufzeit): frisches Item mit griechischem Namen (EL-UI, Cookie app_lang=el).
 */
import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { pickCategory } from './_helpers/category-picker'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5900-010] Safety: NEVER use production ports!')
}

const STATE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.test-state.json'), 'utf8')) as {
  storageState: { cookies: unknown[]; origins: unknown[] }
}
test.use({ storageState: STATE.storageState as Parameters<typeof test.use>[0]['storageState'] })

test('EL: Item mit griechischem Namen -> names.el, kein names.de', async ({ page, context }) => {
  const name = `E2E-B5900-010-Χωριάτικο-${randomUUID().slice(0, 8)}`
  await context.addCookies([{ name: 'app_lang', value: 'el', url: FRONTEND_URL }])
  await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /^\+ /i }).first().click()
  await page.getByRole('button', { name: /^\+ Δημιουργία νέου προϊόντος ή υπηρεσίας/ }).click()
  const form = page.locator('form').filter({ has: page.locator('fieldset legend') })
  await expect(form.locator('legend')).toContainText('Τύπος')
  await expect(form.getByText('(DE)')).toHaveCount(0)
  await form.locator('input[type="text"]').first().fill(name)
  await pickCategory(page, form, { random: true })
  const respPromise = page.waitForResponse((r) => r.url().includes('/api/shop-admin/items') && r.request().method() === 'POST')
  await form.locator('button[type="submit"]').click()
  const resp = await respPromise
  const body = (await resp.json()) as { slug?: string; names?: Record<string, string>; detail?: unknown }
  expect(resp.status(), JSON.stringify(body)).toBe(201)
  expect(body.names?.el).toBe(name)
  expect(body.names?.de).toBeUndefined()
  // Kundensicht: Detail-API liefert names.el
  const r = await fetch(`${BACKEND_URL}/api/v1/products/${body.slug}`, { headers: { 'Accept-Language': 'el' } })
  if (r.ok) {
    const d = (await r.json()) as { names?: Record<string, string> }
    expect(d.names?.el).toBe(name)
  }
})

// ─── Erweiterung (e2e-tester): Kundensicht, DE-Preisarten, EN-Name ───────────────────────────────────
// Die Tests legen Item + Angebot an, prüfen die Kundenansicht im Browser und räumen danach
// Angebot (archivieren + löschen), Listing auf. Das Item selbst bleibt (Owner kann Items nicht löschen).

const SHOP = STATE as unknown as { email: string; password: string; shopId: number }

async function ownerToken(): Promise<string> {
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: SHOP.email, password: SHOP.password }),
  })
  return (r.headers.get('set-cookie') ?? '').match(/shop_owner_token=([^;]+)/)?.[1] ?? ''
}

async function cleanupItem(slug: string): Promise<void> {
  const tok = await ownerToken()
  const h = { Authorization: `Bearer ${tok}` }
  const l = (await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings?limit=500`, { headers: h }).then((r) => r.json())) as
    { items: Array<{ id: number; item: { slug: string }; current_offer?: { id: number } | null }> }
  const listing = l.items.find((x) => x.item.slug === slug)
  if (!listing) return
  if (listing.current_offer) {
    await fetch(`${BACKEND_URL}/api/v1/shop-owner/offers/${listing.current_offer.id}`, {
      method: 'PATCH', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true }),
    })
    await fetch(`${BACKEND_URL}/api/v1/shop-owner/offers/${listing.current_offer.id}`, { method: 'DELETE', headers: h })
  }
  await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings/${listing.id}`, { method: 'DELETE', headers: h })
}

const PICKER_BTN: Record<string, RegExp> = {
  en: /^\+ Select product or service/, de: /^\+ Artikel auswählen/, el: /^\+ Επιλογή προϊόντος ή υπηρεσίας/,
}
const CREATE_BTN: Record<string, RegExp> = {
  en: /^\+ Create new product or service/, de: /^\+ Neuen Artikel anlegen/, el: /^\+ Δημιουργία νέου προϊόντος ή υπηρεσίας/,
}

/** Legt ein Item über die UI an; liefert die Item-Antwort des Backends. */
async function createItemInLang(page: Page, context: import('@playwright/test').BrowserContext, lang: 'en' | 'de' | 'el', name: string) {
  await context.addCookies([{ name: 'app_lang', value: lang, url: FRONTEND_URL }])
  await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: PICKER_BTN[lang] }).click()
  await page.getByRole('button', { name: CREATE_BTN[lang] }).click()
  const form = page.locator('form').filter({ has: page.locator('fieldset legend') })
  await form.locator('input[type="text"]').first().fill(name)
  await pickCategory(page, form, { random: true })
  const respPromise = page.waitForResponse((r) => r.url().includes('/api/shop-admin/items') && r.request().method() === 'POST')
  await form.locator('button[type="submit"]').click()
  const resp = await respPromise
  expect(resp.status()).toBe(201)
  return (await resp.json()) as { slug: string; names: Record<string, string> }
}

/** Schritt 2: Festpreis 5,00 eintragen und speichern. */
async function savePrice(page: Page) {
  await page.locator('select').first().selectOption('fixed')
  await page.getByRole('button', { name: /add pricing unit|preiseinheit hinzufügen|προσθήκη μονάδας τιμής/i }).first().click()
  await page.locator('input[inputmode="decimal"]').first().fill('5.00')
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL(/\/shop-admin\/offers$/)
}

test.describe('Kundensicht + Sprachen (e2e-tester)', () => {
  test.describe.configure({ mode: 'serial' })
  const created: string[] = []
  test.afterAll(async () => { for (const slug of created) await cleanupItem(slug).catch(() => {}) })

  test('AK1 EL: griechischer Name erscheint in der griechischen Kundenansicht (Detail + Suche), EN-Ansicht Fallback statt Slug', async ({ page, context, browser }) => {
    page.setDefaultTimeout(20_000)
    const name = `E2E-B5900-010-Ψωμί-${randomUUID().slice(0, 8)}`
    const item = await createItemInLang(page, context, 'el', name)
    created.push(item.slug)
    expect(item.names.el).toBe(name)
    expect(item.names.de).toBeUndefined()
    await savePrice(page)

    const cust = await browser.newContext()
    const c = await cust.newPage()
    await c.goto(`${FRONTEND_URL}/el/products/${item.slug}`, { waitUntil: 'domcontentloaded' })
    await expect(c.locator('h1').first()).toHaveText(name)
    await expect(c).toHaveTitle(new RegExp(name.slice(0, 20)))
    // EN-Ansicht: kein EN-Name vorhanden -> erster verfügbarer Name (nicht der Slug)
    await c.goto(`${FRONTEND_URL}/en/products/${item.slug}`, { waitUntil: 'domcontentloaded' })
    await expect(c.locator('h1').first()).toHaveText(name)
    // Suche (el) findet das Produkt über den Namen
    await c.goto(`${FRONTEND_URL}/el/search?shop_id=${SHOP.shopId}&q=${encodeURIComponent(name)}`, { waitUntil: 'domcontentloaded' })
    await expect(c.locator(`a[href*="/products/${item.slug}"]`).first()).toBeAttached()
    await cust.close()
  })

  test('AK1 EN: englischer Name -> names.en, EN-Ansicht zeigt ihn, DE-Ansicht fällt auf EN zurück', async ({ page, context, browser }) => {
    page.setDefaultTimeout(20_000)
    const name = `E2E-B5900-010-Bread-${randomUUID().slice(0, 8)}`
    const item = await createItemInLang(page, context, 'en', name)
    created.push(item.slug)
    expect(item.names.en).toBe(name)
    expect(item.names.de).toBeUndefined()
    await savePrice(page)

    const cust = await browser.newContext()
    const c = await cust.newPage()
    for (const l of ['en', 'de']) {
      await c.goto(`${FRONTEND_URL}/${l}/products/${item.slug}`, { waitUntil: 'domcontentloaded' })
      await expect(c.locator('h1').first()).toHaveText(name)
    }
    await cust.close()
  })

  test('AK2/AK3 DE: Legende "Art" statt doppelt "Kategorie", kein "(DE)", Preisarten (Standard + Aktion) auf Deutsch', async ({ page, context }) => {
    page.setDefaultTimeout(20_000)
    await context.addCookies([{ name: 'app_lang', value: 'de', url: FRONTEND_URL }])
    await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: PICKER_BTN.de }).click()
    await page.getByRole('button', { name: CREATE_BTN.de }).click()
    const form = page.locator('form').filter({ has: page.locator('fieldset legend') })
    await expect(form.locator('legend')).toHaveText(/^Art( \*)?$/)
    await expect(form.getByText('(DE)')).toHaveCount(0)
    // Kategorie-Label bleibt eigenständig und ist nicht gleich der Typ-Legende
    await expect(form.locator('label').filter({ hasText: /^Kategorie/ }).first()).toBeVisible()
    await expect(form.getByText('Produkt', { exact: true })).toBeVisible()
    await expect(form.getByText('Dienstleistung', { exact: true })).toBeVisible()

    // Preisarten im Angebotsformular (Schritt 2) — braucht ein Item
    const name = `E2E-B5900-010-Preisarten-${randomUUID().slice(0, 8)}`
    await form.locator('input[type="text"]').first().fill(name)
    await pickCategory(page, form, { random: true })
    const respPromise = page.waitForResponse((r) => r.url().includes('/api/shop-admin/items') && r.request().method() === 'POST')
    await form.locator('button[type="submit"]').click()
    const item = (await (await respPromise).json()) as { slug: string }
    created.push(item.slug)

    const expected = ['Festpreis', 'Auf Anfrage', 'Kostenlos', 'Variabler Preis']
    await expect(page.getByText('Preisart', { exact: true }).first()).toBeVisible()
    const std = page.locator('select').first()
    expect(await std.locator('option').allTextContents()).toEqual(expected)
    // Aktionspreis-Accordion öffnen
    await page.getByRole('button', { name: /Aktion/i }).first().click()
    const promo = page.locator('select').nth(1)
    expect(await promo.locator('option').allTextContents()).toEqual(expected)
    // Kein englisches Literal mehr
    for (const en of ['On request', 'Free', 'Variable']) {
      await expect(page.locator('select option', { hasText: new RegExp(`^${en}$`) })).toHaveCount(0)
    }
  })
})
