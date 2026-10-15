/**
 * Journey: customer-shop-all-products-flow
 * Regression guard for B5900-004 und B5900-016.
 *
 * F8950 T31 (Zwei-Ebenen-Prinzip, docs/e2e-testing.md):
 *  - Ebene 1 (laeuft immer, kein Skip): Die Spec legt zwei eigene Shops per API an. Shop A hat 3 Produkte mit
 *    Angebot, Shop B listet eines davon zu einem niedrigeren Preis (Multi-Shop-Angebot) - so ist "best_offer im
 *    shop_id-Modus nur vom eigenen Shop" (B5900-016) eine echte Pruefung.
 *  - Ebene 2 (Realdaten-Check E1 bis E3): dieselben Invarianten gegen echte Prod-Kopie-Shops (grosser Shop mit
 *    1596 Produkten, Demo-Shops). Fehlt ein Shop in pundo_test (frische Kopie), wird der Test mit konkretem Grund
 *    uebersprungen.
 *
 * Fixtures:
 * ┌─────────────────────────┬────────────────────────────────────────────┐
 * │ Fixture                 │ Zweck                                      │
 * ├─────────────────────────┼────────────────────────────────────────────┤
 * │ Spec-Shop A (specShop)  │ 3 Produkte mit Festpreis-Angebot (5.00)    │
 * │ Spec-Shop B (specShop)  │ Listing + Angebot (1.00) auf Produkt 1 von A│
 * │ manjo-pet-087d8709 u.a. │ Ebene 2: reale Prod-Kopie-Shops (read-only)│
 * └─────────────────────────┴────────────────────────────────────────────┘
 *
 * Port-Konvention: Frontend 3500, Backend 8500 (pundo_test).
 */

import * as fs from 'fs'
import * as path from 'path'
import { test, expect, createStepLog } from '../fixtures'
import { waitForPageHydrated } from './_helpers/hydration'
import { populatedCategoryId } from './_helpers/test-data'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { BASE_URL, BACKEND_URL } from '../env'

// Ebene 2: reale Shops der Prod-Kopie (read-only)
const REAL_SHOPS = ['manjo-pet-087d8709', 'anna-s-bakery', 'o-phournos-tes-annas']

// Ebene 1: eigene Shops, im beforeAll angelegt
let shopA: WorkerShop
let shopB: WorkerShop
let SHOP_SLUG = ''
let SHOP_ID = 0
let CATEGORY_ID = 0

// ─── Seed (Ebene 1) ───────────────────────────────────────────────────────────

const fixedTier = (price: number) => [{ unit: 'per_piece', steps: [{ min_quantity: 1, price, currency: 'EUR' }] }]

test.beforeAll(async () => {
  test.setTimeout(120_000)
  shopA = await specShop('ALLPROD-A')
  shopB = await specShop('ALLPROD-B')
  SHOP_SLUG = shopA.slug
  SHOP_ID = shopA.id
  CATEGORY_ID = populatedCategoryId()

  const items = []
  for (const label of ['alpha', 'bravo', 'charlie']) {
    const item = await shopA.createItem('ALLPROD', label, { listing: true, categoryId: CATEGORY_ID })
    const offer = await shopA.api('POST', '/offers', { shop_listing_id: item.listingId, price_type: 'fixed', price_tiers: fixedTier(5) })
    expect(offer.status, offer.text).toBe(201)
    items.push(item)
  }
  // Shop B listet Produkt 1 von A zu 1.00 -> ohne shop_id-Filter waere B das beste Angebot
  const listing = await shopB.api<{ id?: number }>('POST', '/shop-listings', { item_id: items[0].id })
  expect(listing.status, listing.text).toBe(201)
  const offerB = await shopB.api('POST', '/offers', { shop_listing_id: listing.json.id, price_type: 'fixed', price_tiers: fixedTier(1) })
  expect(offerB.status, offerB.text).toBe(201)

  await expect.poll(async () => {
    const res = await fetch(`${BACKEND_URL}/api/v1/products?shop_id=${SHOP_ID}&limit=10`)
    return res.ok ? ((await res.json()) as { total: number }).total : 0
  }, { message: 'Seed-Produkte von Shop A oeffentlich sichtbar', timeout: 15_000 }).toBe(3)
})

test.afterAll(async () => {
  await shopA?.destroy()
  await shopB?.destroy()
})

// ─── Report state ────────────────────────────────────────────────────────────

const { entries: steps, logStep } = createStepLog()

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('customer-shop-all-products-flow (B5900-004)', () => {

  test('A — Shop-Detail-Seite lädt korrekt', async ({ page }) => {
    // F8950 T22: Listener vor dem goto (vorher erst nach dem Laden angehaengt = fing Ladefehler nie)
    const jsErrors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') jsErrors.push(msg.text()) })
    const res = await page.goto(`${BASE_URL}/en/shops/${SHOP_SLUG}`)
    const status = res?.status() ?? 0

    if (status === 200) {
      logStep('A1 HTTP-Status', '', '200', String(status), 'PASS')
    } else {
      logStep('A1 HTTP-Status', '', '200', String(status), 'FAIL', 'Shop-Seite nicht erreichbar')
    }
    expect(status).toBe(200)

    // H1 enthält Shop-Name
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
    const h1Text = await h1.textContent()
    const h1HasName = (h1Text ?? '').length > 0
    logStep('A2 H1 Shop-Name', '', 'Nicht leer', h1Text ?? '', h1HasName ? 'PASS' : 'FAIL')
    expect(h1HasName).toBe(true)

    // Keine JS-Konsolenfehler: statt networkidle auf Hydration warten
    await waitForPageHydrated(page)
    const criticalErrors = jsErrors.filter(e => !e.includes('favicon') && !e.includes('ERR_ABORTED'))
    logStep('A3 Keine JS-Errors', '', '0 kritische Errors', String(criticalErrors.length), criticalErrors.length === 0 ? 'PASS' : 'FAIL', criticalErrors.join(' | ') || undefined)
  })

  test('B — Top-Products-Sektion + Alle-Link', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/shops/${SHOP_SLUG}`)
    await expect(page.locator('a[href^="/en/products/"]').first()).toBeAttached()

    // Mindestens 1 ProductCard in der Seite
    // Backend liefert top 12 Produkte via searchProducts({shop_id, limit:12})
    const productLinks = page.locator('a[href^="/en/products/"]')
    const productCount = await productLinks.count()
    logStep('B1 Top-Products sichtbar', '', '≥1 Produkt-Link', String(productCount), productCount >= 1 ? 'PASS' : 'FAIL')
    expect(productCount).toBeGreaterThanOrEqual(1)

    // "Alle"-Link existiert mit korrektem href
    const alleLink = page.locator(`a[href*="search?shop_id=${SHOP_ID}"]:visible`)
    await expect(alleLink).toBeVisible()
    const alleHref = await alleLink.getAttribute('href')
    logStep('B2 Alle-Link href', '', `/en/search?shop_id=${SHOP_ID}`, alleHref ?? '', alleHref?.includes(`shop_id=${SHOP_ID}`) ? 'PASS' : 'FAIL')
    expect(alleHref).toContain(`shop_id=${SHOP_ID}`)

    // B5900-004: Link-Text darf NICHT hartcodiert Deutsch "Alle" sein wenn Sprache EN
    const alleText = (await alleLink.textContent())?.trim() ?? ''
    const isNotHardcodedDe = alleText !== 'Alle →' && alleText !== 'Alle'
    logStep('B3 Link-Text I18n (EN)', '', 'Text ≠ "Alle"', alleText, isNotHardcodedDe ? 'PASS' : 'FAIL', isNotHardcodedDe ? undefined : 'Hartcodierter DE-Text in EN-Seite')
    expect(isNotHardcodedDe, `"Alle →" ist hartcodiert Deutsch — I18n-Fix fehlt. Aktuell: "${alleText}"`).toBe(true)

    // EN-Seite: Text sollte "All" enthalten
    const isEnText = alleText.toLowerCase().startsWith('all')
    logStep('B4 Link-Text EN = "All →"', '', '"All →"', alleText, isEnText ? 'PASS' : 'FAIL')
    expect(isEnText, `Erwartet "All →", erhalten "${alleText}"`).toBe(true)
  })

  test('B5 — Alle-Link übersetzt auf DE-Seite', async ({ page }) => {
    await page.goto(`${BASE_URL}/de/shops/${SHOP_SLUG}`)

    const alleLink = page.locator(`a[href*="search?shop_id=${SHOP_ID}"]:visible`)
    await expect(alleLink).toBeVisible()
    const alleText = (await alleLink.textContent())?.trim() ?? ''
    // Auf DE-Seite ist "Alle →" die korrekte Übersetzung
    const isDeText = alleText.startsWith('Alle')
    logStep('B5 Link-Text DE = "Alle →"', '', '"Alle →"', alleText, isDeText ? 'PASS' : 'FAIL')
    expect(isDeText, `Erwartet "Alle →" auf DE, erhalten "${alleText}"`).toBe(true)
  })

  test('C1 — Klick auf Alle-Link zeigt Produkte (Kern-Regression B5900-004)', async ({ page }) => {
    // Desktop-Viewport: vermeidet SearchMapBottomSheet-Überlagerung auf Mobile,
    // sodass Produktkarten im sichtbaren 55%-Panel des Desktop-Layouts erscheinen.
    await page.setViewportSize({ width: 1280, height: 900 })

    // Intercepte API-Calls um zu prüfen ob searchProducts mit shop_id aufgerufen wird
    const apiCalls: string[] = []
    page.on('request', req => {
      const url = req.url()
      if (url.includes('/api/v1/')) apiCalls.push(url)
    })

    await page.goto(`${BASE_URL}/en/shops/${SHOP_SLUG}`)
    await waitForPageHydrated(page)

    // Klick auf "All →" Link
    const alleLink = page.locator(`a[href*="search?shop_id=${SHOP_ID}"]:visible`)
    await alleLink.click()

    // URL muss auf /search?shop_id=75 zeigen
    await page.waitForURL(`**search?shop_id=${SHOP_ID}**`)
    const currentUrl = page.url()
    logStep('C1a Navigation', '', `/en/search?shop_id=${SHOP_ID}`, currentUrl, currentUrl.includes(`shop_id=${SHOP_ID}`) ? 'PASS' : 'FAIL')
    expect(currentUrl).toContain(`shop_id=${SHOP_ID}`)

    // F8950 T22: statt networkidle + 1,5 s Timeout - die expect-Zeile unten wartet auf die Produktkarten

    // HAUPT-ASSERTION (war vor Fix immer leer):
    // Mindestens 1 Produkt-Link muss sichtbar sein.
    // :visible filtert den mobilen Panel (md:hidden, display:none bei 1280px) aus —
    // sonst trifft der Selektor die DOM-ersten Links im hidden mobile sheet.
    const productLinks = page.locator('a[href^="/en/products/"]:visible')
    await expect(productLinks.first()).toBeVisible({ timeout: 10000 })
    const count = await productLinks.count()
    logStep('C1b Produkte sichtbar', '', '≥1 Produkt-Link', String(count), count >= 1 ? 'PASS' : 'FAIL', count === 0 ? 'B5900-004 REGRESSION: SearchContent ignoriert shop_id' : undefined)
    expect(count, `REGRESSION B5900-004: Keine Produkte bei ?shop_id=${SHOP_ID}`).toBeGreaterThanOrEqual(1)

    // API-Calls: /api/v1/products?shop_id=75 muss aufgerufen worden sein
    const shopIdCall = apiCalls.find(u => u.includes('products') && u.includes(`shop_id=${SHOP_ID}`))
    logStep('C1c API shop_id-Request', '', `/api/v1/products?shop_id=${SHOP_ID}`, shopIdCall ?? 'nicht gefunden', shopIdCall ? 'PASS' : 'FAIL')
    expect(shopIdCall, 'searchProducts mit shop_id wurde nicht aufgerufen').toBeTruthy()
  })

  test('C2 — searchAll wird NICHT aufgerufen im shop_id-Modus', async ({ page }) => {
    const searchAllCalls: string[] = []
    page.on('request', req => {
      const url = req.url()
      if (url.includes('/api/v1/search')) searchAllCalls.push(url)
    })

    await page.goto(`${BASE_URL}/en/search?shop_id=${SHOP_ID}`)
    // F8950 T22: erst abwarten, bis der shop_id-Modus seine Produkte geladen hat (dann waere ein searchAll-Call
    // laengst gesendet); vorher: networkidle + 1,5 s
    await expect(page.locator('a[href^="/en/products/"]:visible').first()).toBeVisible({ timeout: 10_000 })

    const noSearchAll = searchAllCalls.length === 0
    logStep('C2 searchAll nicht aufgerufen', '', '0 /search Calls', String(searchAllCalls.length), noSearchAll ? 'PASS' : 'FAIL', noSearchAll ? undefined : `searchAll-Calls: ${searchAllCalls.join(', ')}`)
    expect(searchAllCalls).toHaveLength(0)
  })

  test('D — Keine Regression: category_id-Modus weiterhin funktional', async ({ page }) => {
    // Sicherstellen dass der Guard-Fix den category-Modus nicht gebrochen hat
    const productCalls: string[] = []
    page.on('request', req => {
      const url = req.url()
      if (url.includes('/api/v1/products') && url.includes('category_id')) productCalls.push(url)
    })

    await page.goto(`${BASE_URL}/en/search?category_id=${CATEGORY_ID}`)
    // F8950 T22: statt networkidle + 1,5 s auf den Request warten
    await expect.poll(() => productCalls.find(u => u.includes(`category_id=${CATEGORY_ID}`)), { timeout: 10_000 }).toBeTruthy()

    const categoryCall = productCalls.find(u => u.includes(`category_id=${CATEGORY_ID}`))
    logStep('D1 category_id-Modus', '', `/api/v1/products?category_id=${CATEGORY_ID} aufgerufen`, categoryCall ?? 'nicht gefunden', categoryCall ? 'PASS' : 'FAIL')
    expect(categoryCall, 'searchProducts mit category_id wurde nicht aufgerufen — Guard-Fix hat Regression').toBeTruthy()
  })

  // ─── E — B5900-016: best_offer im shop_id-Modus nur vom eigenen Shop ───────────
  // Ebene 1 = Spec-Shop A (immer), Ebene 2 = reale Prod-Kopie-Shops (Skip mit Grund, wenn nicht vorhanden).

  const GEO = 'lat=34.6841&lng=33.0379'
  type ListItem = { name?: string; best_offer?: { shop_id: number; shop_slug?: string } | null }
  type ShopDetail = { id: number; product_count?: number }

  /** Slug des Ziels: 'seed' = Spec-Shop A (Ebene 1), sonst echter Shop. */
  const targetSlug = (t: string) => (t === 'seed' ? SHOP_SLUG : t)
  const levelOf = (t: string) => (t === 'seed' ? 'Ebene 1: Spec-Shop A' : `Ebene 2: ${t}`)

  /**
   * Shop-Links im Produktraster. Breadcrumb (`nav`) und Bereiche wie "Shops in der Naehe" (`section`) gehoeren nicht
   * zum Raster; Spec-Shops haben (anders als die Demo-Shops) einen Standort und damit beides.
   */
  const gridShopLinks = (page: import('@playwright/test').Page) =>
    page.locator('main a[href^="/en/shops/"]').evaluateAll(els =>
      els.filter(e => !e.closest('nav') && !e.closest('section')).map(e => e.getAttribute('href') ?? ''))

  /** Shop-Detail; bei einem realen Shop, der in dieser Prod-Kopie fehlt, wird der Test mit Grund uebersprungen. */
  async function detailOrSkip(t: string): Promise<ShopDetail> {
    const res = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${targetSlug(t)}`)
    if (!res.ok) {
      logStep(`E ${t}`, '', 'Shop vorhanden', `HTTP ${res.status}`, 'SKIP', 'Prod-Kopie ohne diesen Shop')
      test.skip(t !== 'seed', `Realdaten-Check: Shop ${t} fehlt in pundo_test (Prod-Kopie ohne diesen Shop)`)
      throw new Error(`Spec-Shop ${t} nicht abrufbar: HTTP ${res.status}`)
    }
    return await res.json() as ShopDetail
  }

  for (const t of ['seed', ...REAL_SHOPS]) {
    test(`E1 — API-Invariante shop_id-Modus (${levelOf(t)}): nur eigene Angebote, total == product_count`, async () => {
      const detail = await detailOrSkip(t)
      for (const geo of ['', `&${GEO}`]) {
        const res = await fetch(`${BACKEND_URL}/api/v1/products?shop_id=${detail.id}&limit=100${geo}`)
        const data = await res.json() as { total: number; items: ListItem[] }
        if (t === 'seed') expect(data.total, 'Spec-Shop A hat genau 3 Produkte').toBe(3)
        const foreign = data.items.filter(i => !i.best_offer || i.best_offer.shop_id !== detail.id)
        const label = `E1 ${t}${geo ? ' +geo' : ''}`
        logStep(`${label} nur eigene Angebote`, '', '0 fremde/fehlende best_offer', String(foreign.length), foreign.length === 0 ? 'PASS' : 'FAIL', foreign.map(i => i.name).join(', ') || undefined)
        expect(foreign, `Fremd-/Kein-Angebot im shop_id-Modus: ${foreign.map(i => i.name).join(', ')}`).toHaveLength(0)
        if (data.total <= 100 && typeof detail.product_count === 'number') {
          const same = detail.product_count === data.total
          logStep(`${label} product_count == total`, '', String(detail.product_count), String(data.total), same ? 'PASS' : 'FAIL')
          expect(data.total).toBe(detail.product_count)
        }
      }
    })
  }

  for (const t of ['seed', 'anna-s-bakery', 'o-phournos-tes-annas']) {
    test(`E2 — Shop-Seite (${levelOf(t)}): jede Karte verlinkt nur auf den eigenen Shop; Raster == product_count`, async ({ page }) => {
      const detail = await detailOrSkip(t) as { product_count: number }
      const slug = targetSlug(t)
      await page.goto(`${BASE_URL}/en/shops/${slug}`)
      await waitForPageHydrated(page)
      await expect(page.locator('a[href^="/en/products/"]').first()).toBeAttached()
      const cards = await page.locator('a[href^="/en/products/"]').evaluateAll(els => els.length)
      const shopLinks = await gridShopLinks(page)
      const foreign = shopLinks.filter(h => h.replace(/\/$/, '') !== `/en/shops/${slug}`)
      logStep(`E2 ${t} nur eigene Shop-Links`, '', '0 fremde', String(foreign.length), foreign.length === 0 ? 'PASS' : 'FAIL', foreign.join(', ') || undefined)
      expect(foreign, `Fremde Shop-Links im Raster: ${foreign.join(', ')}`).toHaveLength(0)
      const ok = cards >= detail.product_count
      logStep(`E2 ${t} Kartenanzahl`, '', `>= ${detail.product_count}`, String(cards), ok ? 'PASS' : 'FAIL')
      expect(cards).toBeGreaterThanOrEqual(detail.product_count)
    })
  }

  for (const t of ['seed', 'anna-s-bakery']) {
    test(`E3 — /search?shop_id= mit Geolocation Limassol (${levelOf(t)}): nur eigene Shop-Links, Anzahl == product_count`, async ({ browser }) => {
      const detail = await detailOrSkip(t) as { id: number; product_count: number }
      const slug = targetSlug(t)
      const ctx = await browser.newContext({ geolocation: { latitude: 34.6841, longitude: 33.0379 }, permissions: ['geolocation'] })
      const page = await ctx.newPage()
      try {
        await page.goto(`${BASE_URL}/en/search?shop_id=${detail.id}`)
        // F8950 T22: statt networkidle + 1,5 s - warten, bis alle Karten des Shops gerendert sind
        const uniqueProductHrefs = () => page.locator('a[href^="/en/products/"]')
          .evaluateAll(els => new Set(els.map(e => e.getAttribute('href'))).size)
        await expect.poll(uniqueProductHrefs, { timeout: 15_000 }).toBe(detail.product_count)
        const productHrefs = await page.locator('a[href^="/en/products/"]').evaluateAll(els => Array.from(new Set(els.map(e => e.getAttribute('href')))))
        const shopLinks = await gridShopLinks(page)
        const foreign = shopLinks.filter(h => h.replace(/\/$/, '') !== `/en/shops/${slug}`)
        logStep(`E3 ${t} Anzahl Karten`, '', String(detail.product_count), String(productHrefs.length), productHrefs.length === detail.product_count ? 'PASS' : 'FAIL')
        logStep(`E3 ${t} nur eigene Shop-Links`, '', '0 fremde', String(foreign.length), foreign.length === 0 ? 'PASS' : 'FAIL', foreign.join(', ') || undefined)
        expect(productHrefs.length).toBe(detail.product_count)
        expect(foreign).toHaveLength(0)
      } finally {
        await ctx.close()
      }
    })
  }

})

// ─── Report schreiben ────────────────────────────────────────────────────────

test.afterAll(async () => {
  const today = new Date().toISOString().slice(0, 10)
  const reportDir = path.join(process.cwd(), 'e2e/journeys/reports')
  const reportFile = path.join(reportDir, `customer-shop-all-products-flow-${today}.md`)

  const pass = steps.filter(s => s.status === 'PASS').length
  const fail = steps.filter(s => s.status === 'FAIL').length
  const verdict = fail === 0 ? 'PASS' : 'FAIL'

  const rows = steps.map(s =>
    `| ${s.step} | ${s.expected} | ${s.actual} | **${s.status}** |${s.note ? ` ${s.note}` : ''}`
  ).join('\n')

  const content = `# Journey Report: customer-shop-all-products-flow
**Datum:** ${today}
**Verdict:** ${verdict} (${pass}/${steps.length} Steps)
**Bug:** B5900-004 — shop_id-Modus in SearchContent

## Fixtures
| Fixture | Wert |
|---|---|
| Shop-Slug (Ebene 1, Spec-Shop A) | ${SHOP_SLUG} |
| Shop-ID | ${SHOP_ID} |
| Produkte im Spec-Shop A | 3 (Multi-Shop: Shop B listet Produkt 1 zu 1.00) |
| Ebene 2 (Realdaten) | ${REAL_SHOPS.join(', ')} |

## Schritt-Protokoll
| Schritt | Erwartet | Tatsächlich | Status |
|---|---|---|---|
${rows}

## Findings
${fail === 0 ? '— Keine Findings. B5900-004 erfolgreich regressionsfrei.' : steps.filter(s => s.status === 'FAIL').map(s => `- **${s.step}:** ${s.note ?? s.actual}`).join('\n')}

## Cleanup
Spec-Shops A und B werden im afterAll per Admin-Delete entfernt (kaskadiert Listings, Offers, exklusive Items). Ebene 2 liest nur.
`

  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })
  fs.writeFileSync(reportFile, content)
})
