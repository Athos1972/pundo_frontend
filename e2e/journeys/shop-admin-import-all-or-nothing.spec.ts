/**
 * F5920-Anpassung (2026-10-15): Der Upload fuehrt jetzt ueber die Vorschau (Design F5920 Flow A, AK 1/3/23): Datei waehlen ->
 * Vorschau (nichts gespeichert, bei Fehlerzeilen ist „Uebernehmen“ gesperrt) -> „Uebernehmen“ -> Ergebnis. Die Erwartungen
 * dieser Journey wurden auf diesen Flow umgestellt (gleiche Aussagen: Fehler uebersetzt, nichts gespeichert, Erfolg nach
 * Uebernehmen); neu: AK7 (F5920 AK 23: 1 fehlerhafte + 9 gueltige Zeilen) und AK8 (F5920 AK 17: doppelte SKU).
 *
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
import { csv, uploadToPreview, applyToResult, previewRow, tiles } from './_helpers/import-flow'
import { waitForHydrated } from './_helpers/hydration'
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
// F5920: `blocked` = Sperr-Hinweis der Vorschau (preview_apply_blocked, src/lib/i18n/shop-admin-import.ts)
const T = {
  en: { blocked: /Applying is only possible without errors\. Fix the 1 faulty rows/, missing: 'Name is missing', row: 'Row 3', xlsx: /\.xlsx file could not be read/, dup: 'Duplicate in the file' },
  el: { blocked: /Η εφαρμογή είναι δυνατή μόνο χωρίς σφάλματα\. Διορθώστε τις 1 γραμμές/, missing: 'Λείπει το όνομα', row: 'Γραμμή 3', xlsx: /δεν ήταν δυνατό να διαβαστεί/, dup: 'Διπλότυπο στο αρχείο' },
  ar: { blocked: /لا يمكن التطبيق إلا بلا أخطاء\. صحّح الصفوف الخاطئة \(1\)/, missing: 'الاسم مفقود', row: 'الصف 3', xlsx: /تعذّر قراءة ملف \.xlsx/, dup: 'تكرار في الملف' },
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
  // F5920: erst nach React-Hydration waehlen — ein vor dem Handler gewaehltes File geht verloren (Flake unter Last, Dev-Server)
  await waitForHydrated(page.getByTestId('import-full-list'))
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
  // F5920: erst Vorschau (nichts gespeichert), dann „Uebernehmen“
  await expect(page.getByTestId('import-preview')).toBeVisible({ timeout: 60_000 })
  expect((await findItems(GOOD)).length).toBe(0)
  await page.getByTestId('import-apply').click()
  await expect(page.getByTestId('import-result')).toContainText('2 new', { timeout: 60_000 })
  expect((await findItems(GOOD)).length).toBe(1)
})

for (const lang of ['en', 'el', 'ar'] as const) {
  test(`AK2 [${lang}]: 1 fehlerhafte + gueltige Zeilen -> nichts importiert, Zeilenliste uebersetzt`, async ({ page }) => {
    const valid = e2eName('B5900-030', `valid-${lang}`)
    await open(page, lang)
    await upload(page, 'mixed.csv', 'text/csv', `name,available\n${valid},true\n,true\n`)
    // Zeile 3 (Kopfzeile = 1) ist fehlerhaft: Vorschau zeigt den Fehler, „Uebernehmen“ ist gesperrt, nichts gespeichert
    await expect(page.getByTestId('import-preview')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByTestId('import-apply-blocked')).toHaveText(T[lang].blocked)
    await expect(page.getByTestId('import-apply')).toBeDisabled()
    const li = page.getByTestId('import-preview-row').filter({ hasText: T[lang].row })
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
  await expect(page.getByTestId('import-preview-row').filter({ hasText: 'Name fehlt' })).toBeVisible({ timeout: 60_000 })
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
  await expect(page.getByTestId('import-preview')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('import-apply').click()
  await expect(page.getByTestId('import-result')).toContainText('1 new', { timeout: 60_000 })
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
  await expect(page.getByTestId('import-preview')).toBeVisible({ timeout: 60_000 })
  await page.getByTestId('import-apply').click()
  await expect(page.getByTestId('import-result')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(15_000)
  expect(await photoCount(id)).toBe(1)
})

// ── F5920 AK 23: 1 fehlerhafte + 9 gueltige Zeilen ────────────────────────────

for (const lang of ['en', 'el', 'ar'] as const) {
  test(`AK7 [${lang}] (F5920 AK23): 1 fehlerhafte + 9 gueltige Zeilen -> Vorschau, Uebernehmen gesperrt, nichts gespeichert`, async ({ page }) => {
    const names = Array.from({ length: 9 }, (_, i) => e2eName('F5920-AON', `ok${i}-${lang}`))
    const rows = names.map((n) => [n, 'true'])
    rows.splice(4, 0, ['', 'true']) // Zeile 6 (Kopfzeile = 1) ohne Namen
    await open(page, lang)
    await uploadToPreview(page, 'ten.csv', csv(['name', 'available'], rows))
    expect(await tiles(page)).toMatchObject({ new: 9, error: 1, updated: 0 })
    await expect(previewRow(page, 6)).toHaveAttribute('data-status', 'error')
    await expect(previewRow(page, 6).getByTestId('import-row-errors')).toContainText(T[lang].missing)
    await expect(page.getByTestId('import-apply')).toBeDisabled()
    await expect(page.getByTestId('import-apply-blocked')).toHaveText(T[lang].blocked)
    for (const n of names) expect((await findItems(n)).length, n).toBe(0)
  })
}

test('AK8 (F5920 AK17): doppelte SKU in der Datei -> beide Zeilen Fehler „doppelt in der Datei“, nichts gespeichert', async ({ page }) => {
  const a = e2eName('F5920-AON', 'dup-a')
  const b = e2eName('F5920-AON', 'dup-b')
  await open(page, 'el')
  await uploadToPreview(page, 'dup.csv', csv(['sku', 'name'], [['S-1', a], ['S-1', b]]))
  expect(await tiles(page)).toMatchObject({ error: 2, new: 0 })
  for (const r of [2, 3]) await expect(previewRow(page, r).getByTestId('import-row-errors')).toContainText(T.el.dup)
  await expect(page.getByTestId('import-apply')).toBeDisabled()
  expect((await findItems(a)).length + (await findItems(b)).length).toBe(0)
})

test('AK9 (F5920 AK3): korrigierte Datei -> Vorschau ohne Fehler -> Uebernehmen legt den Artikel an', async ({ page }) => {
  const ok = e2eName('F5920-AON', 'fixed')
  await open(page, 'en')
  await uploadToPreview(page, 'fixed.csv', csv(['name', 'available'], [[ok, 'true']]))
  await applyToResult(page)
  expect((await findItems(ok)).length).toBe(1)
})
