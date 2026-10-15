/**
 * B5900-030 — Katalog-Import: alles-oder-nichts, uebersetzte Meldungen/Zeilenfehler, Bild-Polling,
 * Foto-Duplikatschutz. Laeuft ausschliesslich gegen 3500 / 8500, kein DB-Reset.
 * Eigener Spec-Shop (specShop); afterAll loescht ihn samt Items/Fotos (Admin-Shop-Delete).
 *
 * Sheets-Sync: bewusst KEINE Journey (BB E5, Google-Netz) -> Backend-Unit-/Integrationstests.
 * FieldCatalog: bewusst nicht Gegenstand (BB E6, F5920).
 *
 * Die Bild-URL ist eine oeffentliche Google-Logo-PNG (Wikimedia blockt den httpx-User-Agent mit 403) (Backend-SSRF-Schutz blockt localhost);
 * ist sie nicht erreichbar, schlaegt der Bild-Test fehl (kein stilles Skip).
 */
import { test, expect, type Page } from '@playwright/test'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { e2eName } from './_helpers/test-data'
import { BASE_URL, BACKEND_URL } from '../env'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5900-030] Safety: NEVER use production ports!')
}

test.describe.configure({ mode: 'serial' })

const IMG = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png'
const GOOD = e2eName('B5900-030', 'good')
const GOOD2 = e2eName('B5900-030', 'good2')
const IMGITEM = e2eName('B5900-030', 'img')

// Erwartete Texte (src/lib/i18n/shop-admin-catalog.ts)
const T = {
  en: { nothing: /Nothing was imported because 1 rows contain errors/, missing: 'Name is missing', row: 'Row 3', xlsx: /\.xlsx file could not be read/ },
  el: { nothing: /Δεν εισήχθη τίποτα, επειδή 1 γραμμές/, missing: 'Λείπει το όνομα', row: 'Γραμμή 3', xlsx: /δεν ήταν δυνατό να διαβαστεί/ },
  ar: { nothing: /لم يتم استيراد أي شيء لأن 1 صفوف/, missing: 'الاسم مفقود', row: 'الصف 3', xlsx: /تعذّر قراءة ملف \.xlsx/ },
} as const

let shop: WorkerShop

async function findItems(q: string): Promise<Array<{ id: number; name: string }>> {
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/items?q=${encodeURIComponent(q)}&limit=50`, {
    headers: { Authorization: `Bearer ${shop.ownerToken}` },
  })
  const j = (await r.json()) as { items?: Array<{ id: number; name: string }>; results?: Array<{ id: number; name: string }> }
  return (j.items ?? j.results ?? []).filter((i) => i.name.includes(q))
}

async function photoCount(itemId: number): Promise<number> {
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/items/${itemId}`, { headers: { Authorization: `Bearer ${shop.ownerToken}` } })
  return ((await r.json()) as { photos: unknown[] }).photos.length
}

async function open(page: Page, lang: string) {
  await page.context().addCookies([{ name: 'app_lang', value: lang, domain: '127.0.0.1', path: '/' }])
  await page.goto(`${BASE_URL}/shop-admin/import`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('input[type="file"]')).toBeAttached()
}

async function upload(page: Page, name: string, mime: string, content: string | Buffer) {
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType: mime, buffer: Buffer.from(content) })
}

test.beforeAll(async () => {
  shop = await specShop('B5900-030')
})
test.afterAll(async () => {
  await shop?.destroy()
})
test.beforeEach(async ({ context }) => {
  await context.addCookies(shop.storageState.cookies)
})

test('AK1: gueltige Datei -> importiert, Erfolgstext', async ({ page }) => {
  await open(page, 'en')
  await upload(page, 'ok.csv', 'text/csv', `name,available\n${GOOD},true\n${GOOD2},true\n`)
  await expect(page.getByText('2 products imported.').first()).toBeVisible({ timeout: 15_000 })
  expect((await findItems(GOOD)).length).toBe(1)
})

for (const lang of ['en', 'el', 'ar'] as const) {
  test(`AK2 [${lang}]: 1 fehlerhafte + gueltige Zeilen -> nichts importiert, Zeilenliste uebersetzt`, async ({ page }) => {
    const valid = e2eName('B5900-030', `valid-${lang}`)
    await open(page, lang)
    await upload(page, 'mixed.csv', 'text/csv', `name,available\n${valid},true\n,true\n`)
    // Zeile 3 (Kopfzeile = 1) ist fehlerhaft
    await expect(page.getByText(T[lang].nothing).first()).toBeVisible({ timeout: 15_000 })
    const li = page.locator('li', { hasText: T[lang].row })
    await expect(li).toContainText(T[lang].missing)
    expect((await findItems(valid)).length).toBe(0)
  })

  test(`AK3 [${lang}]: kaputte .xlsx wird als Lesefehler gemeldet`, async ({ page }) => {
    await open(page, lang)
    await upload(page, 'broken.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'this is not a zip')
    await expect(page.getByText(T[lang].xlsx).first()).toBeVisible({ timeout: 15_000 })
  })
}

test('AK4: mobil 390px — Zeilenfehlerliste ohne horizontalen Overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'de')
  await upload(page, 'mixed.csv', 'text/csv', `name,available\nX,true\n,true\n`)
  await expect(page.getByText('Name fehlt').first()).toBeVisible({ timeout: 15_000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('AK5: Sheets-Toasts uebersetzt (verbinden / entfernen, el)', async ({ page }) => {
  await open(page, 'el')
  // ungueltige, aber syntaktisch URL-faehige Eingabe: Backend lehnt ggf. ab -> dann Fehlertext, sonst Verbunden-Toast.
  await page.getByLabel('URL Google Sheets').fill('https://docs.google.com/spreadsheets/d/B5900030E2EInvalidSheetId000000000000000000/edit')
  const connect = page.getByRole('button', { name: 'Σύνδεση', exact: true })
  await connect.click()
  await expect(page.getByText(/Το Google Sheet συνδέθηκε/).first()).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Κατάργηση σύνδεσης' }).click()
  await expect(page.getByText(/Η σύνδεση του Google Sheet καταργήθηκε/).first()).toBeVisible({ timeout: 15_000 })
})

test('AK6: image_url -> Polling zeigt Abschluss, Re-Upload haengt kein 2. Foto an', async ({ page }) => {
  test.setTimeout(150_000)
  await open(page, 'en')
  const csv = `name,available,image_url\n${IMGITEM},true,${IMG}\n`
  await upload(page, 'img.csv', 'text/csv', csv)
  await expect(page.getByText('1 products imported.').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/product images are being downloaded/)).toBeVisible({ timeout: 10_000 })
  // Pending-Block bleibt stehen; Polling endet (kein Timeout-Hinweis) wenn last_image_download_at gesetzt ist
  let id = 0
  await expect.poll(async () => {
    const f = await findItems(IMGITEM)
    id = f[0]?.id ?? 0
    return id ? await photoCount(id) : -1
  }, { timeout: 60_000, intervals: [2000] }).toBe(1)
  await expect(page.getByText(/Image status could not be|status.*not.*updated/i)).toHaveCount(0)

  // Re-Upload derselben Datei -> weiterhin genau 1 Foto
  await page.reload({ waitUntil: 'domcontentloaded' })
  await upload(page, 'img.csv', 'text/csv', csv)
  await expect(page.getByText(/products? imported\./).first()).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(15_000)
  expect(await photoCount(id)).toBe(1)
})
