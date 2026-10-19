/**
 * B5900-009 — Shop-Admin: Produktfoto-Upload im Angebotsflow (Schritt 2)
 *
 * Läuft ausschließlich gegen Test-Instanz 3500 / 8500. Kein DB-Reset.
 * B8950-012: läuft in einem EIGENEN Spec-Shop (specShop, Impersonation) — Foto-Dateien hängen am Item, und
 * nur der Admin-Shop-Delete (afterAll) räumt Item, item_photos UND die Dateien sauber weg (R16).
 * Der Item-Name trägt den Marker `E2E-<RUN>-B5900-009-…`. Weil der Shop leer startet, steht das neue
 * Produkt im Produktblock der Shop-Seite zwingend an Index 0 (AK5b ohne Toleranz).
 *
 * Fixtures (alles zur Laufzeit erzeugt):
 *  - e2e-b5900-009-item:  frisch angelegtes Item (Name mit uuid) + Angebot
 *  - PNGs 64x64 mit unterschiedlichem Pixelwert (sonst SHA-Dedup im Backend)
 *
 * Abgedeckt: AK1 (Upload direkt im Neuanlage-Flow), AK2 (Edit: zweites Foto, Titelbild,
 * Löschen, Persistenz), AK3 (Typ-/Limit-Fehler), AK4/AK5 (Kundenseite), AK6 (RTL ar, el),
 * Mobile-Viewport.
 */
import { test, expect, type Page } from '@playwright/test'
import { pickCategory } from './_helpers/category-picker'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { e2eName } from './_helpers/test-data'
import { openItemPickerModal } from './_helpers/hydration'
import { makePng, png } from './_helpers/png'
import { BASE_URL as FRONTEND_URL, BACKEND_URL } from '../env'

if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5900-009] Safety: NEVER use production ports!')
}

test.describe.configure({ mode: 'serial' })

// ─── helpers ─────────────────────────────────────────────────────────────────

const ITEM_NAME = e2eName('B5900-009', 'photo')
let shop: WorkerShop
let token = ''
let itemId = 0
let itemSlug = ''
let offerId = 0
let shopPageShowsProduct = false
let shopPageProductIndex = -1 // Position unter allen /products/-Links des Produktblocks (0 = ganz oben)

async function itemPhotos(): Promise<Array<{ id: number; sort_order: number }>> {
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/items/${itemId}`, { headers: { Authorization: `Bearer ${token}` } })
  return ((await r.json()) as { photos: Array<{ id: number; sort_order: number }> }).photos
    .sort((a, b) => a.sort_order - b.sort_order)
}

async function createItemViaUi(page: Page) {
  await page.goto(`${FRONTEND_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
  await openItemPickerModal(page.getByRole('button', { name: /^\+ (select (item|product or service)|artikel auswählen|item auswählen)/i }))
  // the modal's role=dialog wrapper does not enclose all content -> use page-level locators
  const dialog = page
  await dialog.getByRole('button', { name: /create new (item|product or service)|neues item anlegen|neuen artikel/i }).click()
  await dialog.locator('form input[type="text"]').first().fill(ITEM_NAME)
  await pickCategory(page, dialog.locator('form'), { random: true })
  await dialog.locator('form button[type="submit"]').click()
}

test.beforeAll(async () => {
  shop = await specShop('B5900-009')
  token = shop.ownerToken
})

// Shop-Delete entfernt Offer, Listing, Item, item_photos und die Foto-Dateien (exklusives shop_manual-Item)
test.afterAll(async () => {
  await shop?.destroy()
})

// Browser-Kontexte des Spec-Shops (Impersonation-Cookie); Kunden-Kontexte (browser.newContext()) bleiben anonym
test.beforeEach(async ({ context }) => {
  await context.addCookies(shop.storageState.cookies)
})

// ─── AK1 + Preis speichern ───────────────────────────────────────────────────

test('AK1: Neuanlage -> Schritt 2 zeigt Foto-Upload, Upload funktioniert, Angebot speicherbar', async ({ page }) => {
  page.setDefaultTimeout(20_000)
  await createItemViaUi(page)

  const upload = page.getByTestId('item-photo-upload')
  await expect(upload).toBeVisible()
  await page.getByTestId('item-photo-input').setInputFiles(png(1))
  await expect(page.getByTestId('item-photo-cover-badge')).toBeVisible()
  await expect(upload.locator('li[data-testid^="item-photo-"]')).toHaveCount(1)

  // Preis 5,00
  // eslint-disable-next-line local-e2e/no-positional-tag-locator -- legacy (B8950-016 T4): replace by getByTestId/getByRole
  await page.locator('select').first().selectOption('fixed')
  await page.getByRole('button', { name: /add pricing unit|preiseinheit hinzufügen/i }).first().click()
  await page.locator('input[inputmode="decimal"]').first().fill('5.00')
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL(/\/shop-admin\/offers$/)

  // Offer + Item über API ermitteln
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/offers?limit=500`, { headers: { Authorization: `Bearer ${token}` } })
  const body = await r.json() as { items: Array<{ id: number; item?: { id: number; slug: string; names: Record<string, string> } }> }
  const offer = body.items.find((o) => Object.values(o.item?.names ?? {}).includes(ITEM_NAME))
  expect(offer, 'Angebot des neuen Items nicht gefunden').toBeTruthy()
  offerId = offer!.id; itemId = offer!.item!.id; itemSlug = offer!.item!.slug
  expect((await itemPhotos()).length).toBe(1)
})

// ─── AK4/AK5 Kundenseite ─────────────────────────────────────────────────────

test('AK4/AK5: Kundenseite zeigt Produkt mit Foto; Suche nach shop_id findet es', async ({ browser }) => {
  const ctx = await browser.newContext() // ohne Login
  const page = await ctx.newPage()
  await page.goto(`${FRONTEND_URL}/en/products/${itemSlug}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('h1').first()).toContainText(ITEM_NAME)
  await expect(page.locator('img[src*="product_images"], img[src*="item_photos"], img[src*="photo"]').first()).toBeVisible()

  const res = await fetch(`${BACKEND_URL}/api/v1/products?shop_id=${shop.id}&q=${encodeURIComponent(ITEM_NAME)}&limit=5`)
  const j = await res.json() as { items?: Array<{ slug: string }> }
  expect(j.items?.some((i) => i.slug === itemSlug), 'Produkt nicht über shop_id-Suche auffindbar').toBe(true)

  // AK5 (Kundensicht, Browser): Shop-Suche (Link „Alle“ der Shop-Seite) zeigt das neue Produkt mit Foto
  await page.goto(`${FRONTEND_URL}/en/search?shop_id=${shop.id}&q=${encodeURIComponent(ITEM_NAME)}`, { waitUntil: 'domcontentloaded' })
  const hit = page.locator(`a[href*="/products/${itemSlug}"]`).first()
  // Titel-Link ist ein Overlay-Link (after:absolute) -> Karte über den Link finden
  await expect(hit, 'neues Produkt nicht in der Kunden-Suche (shop_id)').toBeAttached()
  const resultCard = page.locator('div').filter({ has: hit }).filter({ has: page.locator('img') }).last()
  await expect(resultCard.locator('img').first()).toBeVisible()

  // AK5b-Messung: Produktblock der Shop-Seite (Auswertung im letzten Test)
  await page.goto(`${FRONTEND_URL}/en/shops/${shop.slug}`, { waitUntil: 'domcontentloaded' })
  // Produktblock wird gestreamt (Suspense) -> auf den Link warten statt direkt nach DOMContentLoaded zu zählen
  shopPageShowsProduct = await page.locator(`a[href*="/products/${itemSlug}"]`).first()
    .waitFor({ state: 'attached', timeout: 15_000 }).then(() => true, () => false)
  const hrefs = await page.locator('a[href*="/products/"]').evaluateAll((els) =>
    els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''))
  const ordered = hrefs.filter((h, i) => hrefs.indexOf(h) === i)
  shopPageProductIndex = ordered.findIndex((h) => h.endsWith(`/products/${itemSlug}`))
  await ctx.close()
})

// ─── AK2 Edit-Seite ──────────────────────────────────────────────────────────

test('AK2: Edit-Seite — zweites Foto, als Titelbild, Reload, Löschen', async ({ page }) => {
  page.setDefaultTimeout(20_000)
  await page.goto(`${FRONTEND_URL}/shop-admin/offers/${offerId}/edit`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('item-photo-upload')).toBeVisible()

  await page.getByTestId('item-photo-input').setInputFiles(png(2))
  await expect.poll(async () => (await itemPhotos()).length).toBe(2)
  const [first, second] = await itemPhotos()

  await page.getByTestId(`item-photo-set-main-${second.id}`).click()
  await expect.poll(async () => (await itemPhotos())[0].id).toBe(second.id)

  await page.reload({ waitUntil: 'domcontentloaded' })
  const firstLi = page.getByTestId('item-photo-upload').locator('li[data-testid^="item-photo-"]').first()
  await expect(firstLi).toHaveAttribute('data-testid', `item-photo-${second.id}`)
  await expect(firstLi.getByTestId('item-photo-cover-badge')).toBeVisible()

  // Titelbild löschen -> verbleibendes Foto wird Titelbild (D7-Workaround)
  await page.getByTestId(`item-photo-delete-${second.id}`).click()
  await expect.poll(async () => (await itemPhotos()).length).toBe(1)
  expect((await itemPhotos())[0]).toMatchObject({ id: first.id, sort_order: 0 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('item-photo-upload').locator('li[data-testid^="item-photo-"]')).toHaveCount(1)
})

// ─── AK3 Fehler & Limit ──────────────────────────────────────────────────────

test('AK3: falscher Dateityp -> Fehler; Limit 8 -> Add-Button weg; 9. per API -> 409', async ({ page }) => {
  page.setDefaultTimeout(30_000)
  await page.goto(`${FRONTEND_URL}/shop-admin/offers/${offerId}/edit`, { waitUntil: 'domcontentloaded' })
  const input = page.getByTestId('item-photo-input')
  await expect(input).toBeAttached()

  await input.setInputFiles({ name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
  await expect(page.getByTestId('item-photo-error')).toBeVisible()

  // auf 8 auffüllen (1 vorhanden -> 7 neue, in einem Mehrfach-Upload)
  await input.setInputFiles([10, 11, 12, 13, 14, 15, 16].map((s) => png(s)))
  await expect.poll(async () => (await itemPhotos()).length, { timeout: 30_000 }).toBe(8)
  await expect(page.getByTestId('item-photo-add')).toHaveCount(0)
  await expect(page.getByTestId('item-photo-limit')).toBeVisible()

  const fd = new FormData()
  fd.append('file', new Blob([new Uint8Array(makePng(99))], { type: 'image/png' }), 'p99.png')
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/items/${itemId}/photos`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
  })
  expect(r.status).toBe(409)
})

// ─── AK6 RTL / Sprachen ──────────────────────────────────────────────────────

for (const [lang, dir] of [['ar', 'rtl'], ['el', 'ltr']] as const) {
  test(`AK6: Foto-Bereich in ${lang} (dir=${dir})`, async ({ page, context }) => {
    await context.addCookies([{ name: 'app_lang', value: lang, url: FRONTEND_URL }])
    await page.goto(`${FRONTEND_URL}/shop-admin/offers/${offerId}/edit`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('item-photo-upload')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('dir', dir)
    // Hinweistext ist nicht mehr der englische Fallback
    await expect(page.getByTestId('item-photo-upload')).not.toContainText('The first photo is shown')
  })
}

// ─── Mobile ──────────────────────────────────────────────────────────────────

test('Mobile 390x844: Upload-Bereich erreichbar, Input ohne capture, multiple', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${FRONTEND_URL}/shop-admin/offers/${offerId}/edit`, { waitUntil: 'domcontentloaded' })
  const input = page.getByTestId('item-photo-input')
  await expect(input).toBeAttached()
  await expect(input).toHaveAttribute('multiple', '')
  expect(await input.getAttribute('capture')).toBeNull()
  const box = await page.getByTestId('item-photo-upload').boundingBox()
  expect(box!.width).toBeLessThanOrEqual(390)
})

// ─── AK5b Shop-Seite Produktblock (Bernhard-Vorgabe: neues Produkt sofort auf der Shop-Seite sichtbar) ──
// Das Ergebnis wird in Test AK4/AK5 (solange das Angebot existiert) erhoben und hier zuletzt bewertet,
// damit ein Befund die übrigen seriellen Tests nicht überspringt.

test('AK5b: Kunden-Shop-Seite (Produktblock) zeigt das neu angelegte Produkt', async () => {
  expect(
    shopPageShowsProduct,
    'neues Produkt nicht im Produktblock der Kunden-Shop-Seite (limit 12, Item.id asc — bei Shops mit >12 Items strukturell nie sichtbar)',
  ).toBe(true)
  // sort=newest: das neu angelegte Produkt steht ganz oben im Produktblock. Seit B8950-012 strikt Index 0
  // (eigener Spec-Shop, kein Fremd-Listing möglich) — die frühere Toleranz bis Index 2 ist entfallen.
  expect(shopPageProductIndex, 'neues Produkt steht nicht oben im Produktblock der Shop-Seite').toBe(0)
})
