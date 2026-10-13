/**
 * B5900-009 — Shop-Admin: Produktfoto-Upload im Angebotsflow (Schritt 2)
 *
 * Läuft ausschließlich gegen Test-Instanz 3500 / 8500. Kein DB-Reset.
 * Items sind global und vom Owner nicht löschbar -> eindeutiger Name `E2E-B5900-009-<uuid>`;
 * Angebot wird am Ende gelöscht (Item bleibt, siehe Architektur R10).
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
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { randomUUID } from 'crypto'
import { pickCategory } from './_helpers/category-picker'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[b5900-009] Safety: NEVER use production ports!')
}

interface TestState {
  email: string
  password: string
  shopId: number
  shopSlug: string
  storageState: { cookies: unknown[]; origins: unknown[] }
}
const STATE: TestState = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.test-state.json'), 'utf8'))
test.use({ storageState: STATE.storageState as Parameters<typeof test.use>[0]['storageState'] })
test.describe.configure({ mode: 'serial' })

// ─── helpers ─────────────────────────────────────────────────────────────────

function crc32(buf: Buffer): number {
  let c: number
  let crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
/** Valid 64x64 RGB PNG; `shade` makes every file hash differently. */
function makePng(shade: number): Buffer {
  const w = 64, h = 64
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3
      raw[o] = (shade * 37) % 256; raw[o + 1] = (x * 4 + shade) % 256; raw[o + 2] = (y * 4 + shade * 3) % 256
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}
const png = (shade: number, name = `p${shade}.png`) => ({ name, mimeType: 'image/png', buffer: makePng(shade) })

async function login(): Promise<string> {
  const r = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: STATE.email, password: STATE.password }),
  })
  return (r.headers.get('set-cookie') ?? '').match(/shop_owner_token=([^;]+)/)?.[1] ?? ''
}

const ITEM_NAME = `E2E-B5900-009-${randomUUID().slice(0, 8)}`
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
  await page.getByRole('button', { name: /^\+ (select (item|product or service)|artikel auswählen|item auswählen)/i }).click()
  // the modal's role=dialog wrapper does not enclose all content -> use page-level locators
  const dialog = page
  await dialog.getByRole('button', { name: /create new (item|product or service)|neues item anlegen|neuen artikel/i }).click()
  await dialog.locator('form input[type="text"]').first().fill(ITEM_NAME)
  await pickCategory(page, dialog.locator('form'), { random: true })
  await dialog.locator('form button[type="submit"]').click()
}

test.beforeAll(async () => {
  token = await login()
  expect(token, 'Login fehlgeschlagen').not.toBe('')
})

test.afterAll(async () => {
  const auth = { Authorization: `Bearer ${token}` }
  if (offerId) {
    // aktive Angebote sind nicht löschbar (409) -> erst archivieren
    await fetch(`${BACKEND_URL}/api/v1/shop-owner/offers/${offerId}`, {
      method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true }),
    }).catch(() => {})
    await fetch(`${BACKEND_URL}/api/v1/shop-owner/offers/${offerId}`, { method: 'DELETE', headers: auth }).catch(() => {})
  }
  if (itemId) {
    // Fotos entfernen (DB-Zeilen) und Listing löschen, damit der Test-Shop nicht mit E2E-Items zuwächst
    // (Produktblock der Shop-Seite zeigt nur 12 Items). Item selbst bleibt (Owner kann Items nicht löschen).
    for (const ph of await itemPhotos().catch(() => [])) {
      await fetch(`${BACKEND_URL}/api/v1/shop-owner/items/${itemId}/photos/${ph.id}`, { method: 'DELETE', headers: auth }).catch(() => {})
    }
    const l = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings?limit=500`, { headers: auth }).then((r) => r.json()).catch(() => null) as
      { items?: Array<{ id: number; item_id: number }> } | null
    const listing = l?.items?.find((x) => x.item_id === itemId)
    if (listing) await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop-listings/${listing.id}`, { method: 'DELETE', headers: auth }).catch(() => {})
  }
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

  const res = await fetch(`${BACKEND_URL}/api/v1/products?shop_id=${STATE.shopId}&q=${encodeURIComponent(ITEM_NAME)}&limit=5`)
  const j = await res.json() as { items?: Array<{ slug: string }> }
  expect(j.items?.some((i) => i.slug === itemSlug), 'Produkt nicht über shop_id-Suche auffindbar').toBe(true)

  // AK5 (Kundensicht, Browser): Shop-Suche (Link „Alle“ der Shop-Seite) zeigt das neue Produkt mit Foto
  await page.goto(`${FRONTEND_URL}/en/search?shop_id=${STATE.shopId}&q=${encodeURIComponent(ITEM_NAME)}`, { waitUntil: 'domcontentloaded' })
  const hit = page.locator(`a[href*="/products/${itemSlug}"]`).first()
  // Titel-Link ist ein Overlay-Link (after:absolute) -> Karte über den Link finden
  await expect(hit, 'neues Produkt nicht in der Kunden-Suche (shop_id)').toBeAttached()
  const resultCard = page.locator('div').filter({ has: hit }).filter({ has: page.locator('img') }).last()
  await expect(resultCard.locator('img').first()).toBeVisible()

  // AK5b-Messung: Produktblock der Shop-Seite (Auswertung im letzten Test)
  await page.goto(`${FRONTEND_URL}/en/shops/${STATE.shopSlug}`, { waitUntil: 'domcontentloaded' })
  shopPageShowsProduct = (await page.locator(`a[href*="/products/${itemSlug}"]`).count()) > 0
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
  // sort=newest (Runde 2): das neu angelegte Produkt steht ganz oben im Produktblock. Toleranz bis Index 2,
  // weil parallel laufende Specs (z. B. b5900-010) im selben Test-Shop ebenfalls frische Listings anlegen.
  // Ohne Toleranz (Einzellauf) ist der Wert 0.
  expect(shopPageProductIndex, 'neues Produkt steht nicht oben im Produktblock der Shop-Seite').toBeGreaterThanOrEqual(0)
  expect(shopPageProductIndex, 'neues Produkt steht nicht oben im Produktblock der Shop-Seite').toBeLessThanOrEqual(2)
})
