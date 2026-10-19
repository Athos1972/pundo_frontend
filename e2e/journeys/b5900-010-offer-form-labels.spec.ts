/**
 * B5900-010 — Shop-Admin Angebotsformular: Beschriftungen + Namenssprache
 *
 * Nur gegen Test-Instanz 3500 / 8500. Kein DB-Reset.
 * B8950-012: alle Tests laufen im WORKER-Shop (eigener Shop pro Worker, Impersonation, kein Passwort-Login).
 * Items tragen den Marker `E2E-<RUN>-B5900-010-…` am Namensanfang und werden getrackt:
 * afterAll räumt Listings/Offers weg, der Worker-Teardown löscht Shop und Items (Admin-API).
 *
 * Fixtures (zur Laufzeit): frisches Item mit griechischem Namen (EL-UI, Cookie app_lang=el).
 */
import { test, expect, type WorkerShop } from './_helpers/worker-shop'
import { e2eName } from './_helpers/test-data'
import type { Page } from '@playwright/test'
import { pickCategory } from './_helpers/category-picker'
import { openItemPickerModal } from './_helpers/hydration'
import { BASE_URL as FRONTEND_URL, BACKEND_URL } from '../env'

if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5900-010] Safety: NEVER use production ports!')
}

let shop: WorkerShop
test.beforeAll(({ workerShop }) => { shop = workerShop })
test.afterAll(async () => { await shop.cleanupSpecData() })

/** UI-angelegte Items (haben id + slug in der Antwort) für den Teardown merken. */
function track(body: { id?: number; slug?: string }) {
  expect(body.id, 'Item-Antwort ohne id').toBeTruthy()
  shop.tracker.item(body.id as number, body.slug)
}

test('EL: Item mit griechischem Namen -> names.el, kein names.de', async ({ page, context }) => {
  const name = e2eName('B5900-010', 'Χωριάτικο')
  await context.addCookies([{ name: 'app_lang', value: 'el', url: FRONTEND_URL }])
  await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
  await openItemPickerModal(page.getByRole('button', { name: /^\+ /i }))
  await page.getByRole('button', { name: /^\+ Δημιουργία νέου προϊόντος ή υπηρεσίας/ }).click()
  const form = page.locator('form').filter({ has: page.locator('fieldset legend') })
  await expect(form.locator('legend')).toContainText('Τύπος')
  await expect(form.getByText('(DE)')).toHaveCount(0)
  await form.locator('input[type="text"]').first().fill(name)
  await pickCategory(page, form, { random: true })
  const respPromise = page.waitForResponse((r) => r.url().includes('/api/shop-admin/items') && r.request().method() === 'POST')
  await form.locator('button[type="submit"]').click()
  const resp = await respPromise
  const body = (await resp.json()) as { id?: number; slug?: string; names?: Record<string, string>; detail?: unknown }
  expect(resp.status(), JSON.stringify(body)).toBe(201)
  track(body)
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
// Die Tests legen Item + Angebot an und prüfen die Kundenansicht im Browser. Aufräumen: siehe Kopf.

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
  await openItemPickerModal(page.getByRole('button', { name: PICKER_BTN[lang] }))
  await page.getByRole('button', { name: CREATE_BTN[lang] }).click()
  const form = page.locator('form').filter({ has: page.locator('fieldset legend') })
  await form.locator('input[type="text"]').first().fill(name)
  await pickCategory(page, form, { random: true })
  const respPromise = page.waitForResponse((r) => r.url().includes('/api/shop-admin/items') && r.request().method() === 'POST')
  await form.locator('button[type="submit"]').click()
  const resp = await respPromise
  expect(resp.status()).toBe(201)
  const item = (await resp.json()) as { id: number; slug: string; names: Record<string, string> }
  track(item)
  return item
}

/** Schritt 2: Festpreis 5,00 eintragen und speichern. */
async function savePrice(page: Page) {
  // eslint-disable-next-line local-e2e/no-positional-tag-locator -- legacy (B8950-016 T4): replace by getByTestId/getByRole
  await page.locator('select').first().selectOption('fixed')
  await page.getByRole('button', { name: /add pricing unit|preiseinheit hinzufügen|προσθήκη μονάδας τιμής/i }).first().click()
  await page.locator('input[inputmode="decimal"]').first().fill('5.00')
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL(/\/shop-admin\/offers$/)
}

test.describe('Kundensicht + Sprachen (e2e-tester)', () => {
  test.describe.configure({ mode: 'serial' })

  test('AK1 EL: griechischer Name erscheint in der griechischen Kundenansicht (Detail + Suche), EN-Ansicht Fallback statt Slug', async ({ page, context, browser }) => {
    page.setDefaultTimeout(20_000)
    const name = e2eName('B5900-010', 'Ψωμί')
    const item = await createItemInLang(page, context, 'el', name)
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
    await c.goto(`${FRONTEND_URL}/el/search?shop_id=${shop.id}&q=${encodeURIComponent(name)}`, { waitUntil: 'domcontentloaded' })
    await expect(c.locator(`a[href*="/products/${item.slug}"]`).first()).toBeAttached()
    await cust.close()
  })

  test('AK1 EN: englischer Name -> names.en, EN-Ansicht zeigt ihn, DE-Ansicht fällt auf EN zurück', async ({ page, context, browser }) => {
    page.setDefaultTimeout(20_000)
    const name = e2eName('B5900-010', 'Bread')
    const item = await createItemInLang(page, context, 'en', name)
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
    await openItemPickerModal(page.getByRole('button', { name: PICKER_BTN.de }))
    await page.getByRole('button', { name: CREATE_BTN.de }).click()
    const form = page.locator('form').filter({ has: page.locator('fieldset legend') })
    await expect(form.locator('legend')).toHaveText(/^Art( \*)?$/)
    await expect(form.getByText('(DE)')).toHaveCount(0)
    // Kategorie-Label bleibt eigenständig und ist nicht gleich der Typ-Legende
    await expect(form.locator('label').filter({ hasText: /^Kategorie/ }).first()).toBeVisible()
    await expect(form.getByText('Produkt', { exact: true })).toBeVisible()
    await expect(form.getByText('Dienstleistung', { exact: true })).toBeVisible()

    // Preisarten im Angebotsformular (Schritt 2) — braucht ein Item
    const name = e2eName('B5900-010', 'Preisarten')
    await form.locator('input[type="text"]').first().fill(name)
    await pickCategory(page, form, { random: true })
    const respPromise = page.waitForResponse((r) => r.url().includes('/api/shop-admin/items') && r.request().method() === 'POST')
    await form.locator('button[type="submit"]').click()
    const item = (await (await respPromise).json()) as { id: number; slug: string }
    track(item)

    const expected = ['Festpreis', 'Auf Anfrage', 'Kostenlos', 'Variabler Preis']
    await expect(page.getByText('Preisart', { exact: true }).first()).toBeVisible()
    // eslint-disable-next-line local-e2e/no-positional-tag-locator -- legacy (B8950-016 T4): replace by getByTestId/getByRole
    const std = page.locator('select').first()
    expect(await std.locator('option').allTextContents()).toEqual(expected)
    // Aktionspreis-Accordion öffnen
    await page.getByRole('button', { name: /Aktion/i }).first().click()
    // eslint-disable-next-line local-e2e/no-positional-tag-locator -- legacy (B8950-016 T4): replace by getByTestId/getByRole
    const promo = page.locator('select').nth(1)
    expect(await promo.locator('option').allTextContents()).toEqual(expected)
    // Kein englisches Literal mehr
    for (const en of ['On request', 'Free', 'Variable']) {
      await expect(page.locator('select option', { hasText: new RegExp(`^${en}$`) })).toHaveCount(0)
    }
  })
})
