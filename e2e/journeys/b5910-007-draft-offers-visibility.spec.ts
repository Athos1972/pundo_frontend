/* eslint-disable @typescript-eslint/no-explicit-any -- API-Antworten in der Journey bewusst untypisiert */
/**
 * Journey: b5910-007-draft-offers-visibility
 * Bug: B5910-007 — Onboarding-Vorschläge (auto_seeded) nicht freigeschalteter Shops in der Kundensuche
 * Entscheidungen D1-D4 (BB 2026-10-14): available=true für alle Quellen; Angebote nur bei Owner pending/rejected
 * ausgeblendet; Shop selbst bleibt sichtbar; vor der Freigabe übernommene/bearbeitete Vorschläge werden bei der
 * Freigabe sichtbar, gelöschte nicht.
 *
 * Fixtures: zwei neue Shops (Bäckerei + Metzgerei bzw. Bäckerei, Limassol), Marker-Konvention B8950-012,
 * Cleanup per Admin-Shop-Delete. Nur 3500/8500 + pundo_test.
 *
 * Hinweis Fixture-Eingriff: Owner mit Status `pending` können sich nicht einloggen (403). Damit der Owner VOR der
 * Freigabe Vorschläge übernehmen/bearbeiten/löschen kann (D4-Szenario), wird sein Status per psql auf EIGENER
 * Testzeile kurz auf `approved` gesetzt (ohne assign_services_after_onboarding) und danach wieder auf `pending`.
 */
import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { shopOwnerOnboardWithRetry, shopOwnerLogin } from './_helpers'
import { TestDataTracker, e2eEmail, e2eName, adminApi, psql } from './_helpers/test-data'
import { waitForPageHydrated } from './_helpers/hydration'
import { specShop } from './_helpers/worker-shop'
import { BASE_URL, BACKEND_URL } from '../env'
import { createStepLog } from '../fixtures'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const LAT = 34.6841
const LNG = 33.0379
const PASSWORD = 'E2eTestPassword!99'
const BREAD = 'baeckerei-konditorei-frisches-brot'
const CAKE = 'baeckerei-konditorei-torten-kuchen'
const WEDDING = 'baeckerei-konditorei-hochzeitstorte'

const tracker = new TestDataTracker()
const { entries: stepLog, logStep } = createStepLog()

// ── API-Helper (öffentlich, ohne Auth) ───────────────────────────────────────

async function pub<T = any>(p: string, params: Record<string, string | number> = {}, lang = 'en'): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
  const res = await fetch(`${BACKEND_URL}/api/v1${p}${qs ? `?${qs}` : ''}`, {
    headers: { 'Accept-Language': lang },
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`GET ${p} -> ${res.status}`)
  return (await res.json()) as T
}

interface PublicView {
  searchRu: string[] // Slugs der Shops mit best_offer für „хлеб“
  searchEn: string[] // … für „bread“
  searchCakeRu: string[] // … für „торты“
  productsTotal: number // /products?shop_id=
  detailOfferShops: Record<string, string[]> // item-slug -> shop-slugs der Angebote
  shopTopProducts: number
  shopProductCount: number
}

async function bestOfferShops(q: string, lang: string): Promise<string[]> {
  const d = await pub<{ items: any[] }>('/search', { q, lat: LAT, lng: LNG }, lang)
  return d.items.filter(i => i.best_offer).map(i => i.best_offer.shop_slug as string)
}

async function publicView(shopId: number, itemSlugs: string[]): Promise<PublicView> {
  const detailOfferShops: Record<string, string[]> = {}
  for (const s of itemSlugs) {
    const d = await pub<{ offers: any[] }>(`/products/by-slug/${s}`, { lat: LAT, lng: LNG })
    detailOfferShops[s] = (d.offers ?? []).map(o => o.shop_slug as string)
  }
  const shop = await pub<any>(`/shops/${shopId}`)
  const prods = await pub<{ total: number }>('/products', { shop_id: shopId, lat: LAT, lng: LNG })
  return {
    searchRu: await bestOfferShops('хлеб', 'ru'),
    searchEn: await bestOfferShops('bread', 'en'),
    searchCakeRu: await bestOfferShops('торты', 'ru'),
    productsTotal: prods.total,
    detailOfferShops,
    shopTopProducts: (shop.top_products ?? []).length,
    shopProductCount: shop.product_count ?? 0,
  }
}

function setOwnerStatus(ownerId: number, status: string) {
  // nur EIGENE Testzeile (Marker-E-Mail), siehe Kopfkommentar
  psql(`update shop_owners set status='${status}' where id=${Number(ownerId)} and email like 'e2e-%@pundo-e2e.io'`)
}

// ── Kontext ──────────────────────────────────────────────────────────────────

interface Shop {
  ownerId: number
  shopId: number
  slug: string
  name: string
  email: string
}
let A: Shop // Bäckerei + Metzgerei, wird freigeschaltet
let B: Shop // Bäckerei, wird abgelehnt
let metzSlugs: string[] = []
let wasPending403 = 0

async function onboard(label: string, domains: string[]): Promise<Shop> {
  const name = e2eName('B5910-007', label)
  const email = e2eEmail('B5910-007')
  const r = await shopOwnerOnboardWithRetry({
    provider_type: 'haendler',
    domain_slugs: domains,
    specialty_slugs: [],
    location: { address: 'Test 1', city: 'Limassol', country_code: 'CY', lat: LAT, lng: LNG },
    contact: { phone: '+35799000000' },
    shop_name: name,
    credentials: { type: 'email', email, password: PASSWORD, name: `B5910 ${label}` },
  })
  const ownerId = r.user_id as number
  const shopId = r.shop_id as number
  tracker.owner(ownerId)
  tracker.shop(shopId)
  const shop = await pub<any>(`/shops/${shopId}`)
  return { ownerId, shopId, slug: shop.slug as string, name, email }
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  test.setTimeout(240_000)
  A = await onboard('Bakery-A', ['baeckerei-konditorei', 'metzgerei'])
  B = await onboard('Bakery-B', ['baeckerei-konditorei'])
  metzSlugs = psql(
    `select i.slug from shop_listings l join items i on i.id=l.item_id where l.shop_id=${A.shopId} and i.slug not like 'baeckerei-%' order by i.slug`
  ).split('\n').filter(Boolean)
})

test.afterAll(async () => {
  try { await tracker.cleanup() } catch (e) { console.warn('[b5910-007] cleanup:', e) }
  const dir = path.join(__dirname, 'reports')
  fs.mkdirSync(dir, { recursive: true })
  const lines = [
    '# Journey-Report: b5910-007-draft-offers-visibility', '',
    `**Datum:** ${new Date().toISOString()}`, `**Frontend:** ${BASE_URL}  **Backend:** ${BACKEND_URL}`,
    `**Shop A:** ${A?.slug ?? '—'}  **Shop B:** ${B?.slug ?? '—'}`, '',
    '| Schritt | Beschreibung | Status |', '|---|---|---|',
    ...stepLog.map(s => `| ${s.step} | ${s.desc} | **${s.status}** |`),
  ]
  fs.writeFileSync(path.join(dir, `b5910-007-draft-offers-visibility-${new Date().toISOString().slice(0, 10)}.md`), lines.join('\n'))
})

// ═════════════════════════════════════════════════════════════════════════════
// P1: Vor der Freigabe — keine Vorschläge in öffentlichen Pfaden, Shop sichtbar (D3)
// ═════════════════════════════════════════════════════════════════════════════

test('P1: Shop in Prüfung (pending) — Vorschläge in keinem öffentlichen Pfad, Shop selbst sichtbar', async ({ page }) => {
  test.setTimeout(120_000)
  // Owner kann sich nicht einloggen (Voraussetzung für das Fixture-Vorgehen)
  const login = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: A.email, password: PASSWORD }),
  })
  wasPending403 = login.status
  expect(login.status).toBe(403)

  const v = await publicView(A.shopId, [BREAD, CAKE, WEDDING, ...metzSlugs])
  const checks: Array<[string, boolean]> = [
    ['Suche „хлеб“ (ru)', !v.searchRu.includes(A.slug)],
    ['Suche „bread“ (en)', !v.searchEn.includes(A.slug)],
    ['Suche „торты“ (ru)', !v.searchCakeRu.includes(A.slug)],
    ['/products?shop_id= leer', v.productsTotal === 0],
    ['Shop-Detail: keine Top-Produkte', v.shopTopProducts === 0 && v.shopProductCount === 0],
    ...Object.entries(v.detailOfferShops).map(([s, shops]): [string, boolean] => [`Produktdetail ${s}`, !shops.includes(A.slug)]),
  ]
  for (const [d, ok] of checks) logStep('P1', d, ok)
  for (const [d, ok] of checks) expect(ok, d).toBe(true)

  // D3: Shop selbst bleibt sichtbar (Detail by-slug + Liste)
  const bySlug = await pub<any>(`/shops/by-slug/${A.slug}`)
  expect(bySlug.id).toBe(A.shopId)
  const list = await pub<{ items: any[] }>('/shops', { q: A.name, lat: LAT, lng: LNG })
  expect(list.items.map(s => s.slug)).toContain(A.slug)
  logStep('P1', 'D3: Shop in Detail + Liste sichtbar', true)

  // Sitemap (Frontend 3500): Shop nicht über Angebote indexierbar
  const sm = await fetch(`${BASE_URL}/sitemap-shops.xml`).then(r => r.text())
  expect(sm.includes(A.slug)).toBe(false)
  logStep('P1', 'Sitemap enthält Shop nicht', true)

  // UI: Kunden-Shopseite zeigt Shop, aber keine Angebote
  // F8950 T22: statt waitForTimeout(2500) - geladen (inkl. gestreamter Segmente), hydriert, H1 gerendert
  await page.goto(`${BASE_URL}/en/shops/${A.slug}`, { waitUntil: 'domcontentloaded' })
  await waitForPageHydrated(page)
  await expect(page.locator('h1').first()).toContainText(A.name)
  expect(await page.locator('a[href*="/products/"]').count()).toBe(0)
  logStep('P1', 'UI /en/shops/<slug>: Shop sichtbar, keine Produkt-Links', true)

  // UI: Produktdetail zeigt den Shop nicht als Anbieter
  await page.goto(`${BASE_URL}/en/products/${BREAD}`, { waitUntil: 'domcontentloaded' })
  await waitForPageHydrated(page)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  expect(await page.getByText(A.name, { exact: false }).count()).toBe(0)
  logStep('P1', 'UI Produktdetail: Shop nicht als Anbieter gelistet', true)
})

// ═════════════════════════════════════════════════════════════════════════════
// P2: Owner übernimmt / bearbeitet / löscht Vorschläge vor der Freigabe (UI) + 6 Sprachen
// ═════════════════════════════════════════════════════════════════════════════

const KEEP_LABELS: Record<string, [string, string, string]> = {
  en: ['Keep', 'Keep this suggestion', 'Suggestion kept.'],
  de: ['Übernehmen', 'Vorschlag übernehmen', 'Vorschlag übernommen.'],
  el: ['Διατήρηση', 'Διατήρηση αυτής της πρότασης', 'Η πρόταση διατηρήθηκε.'],
  ru: ['Оставить', 'Оставить это предложение', 'Предложение сохранено.'],
  ar: ['احتفاظ', 'الاحتفاظ بهذا الاقتراح', 'تم الاحتفاظ بالاقتراح.'],
  he: ['השאר', 'השאר את ההצעה', 'ההצעה נשמרה.'],
}

async function ownerPage(page: Page, lang: string) {
  const ctx = page.context()
  await ctx.addCookies([{ name: 'app_lang', value: lang, url: BASE_URL }])
  await page.goto(`${BASE_URL}/shop-admin/offers`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('button[title]', { timeout: 20_000 })
}

test('P2: Owner (vor Freigabe) — Knopf „Übernehmen/Keep" in 6 Sprachen, übernehmen, bearbeiten, löschen', async ({ page }) => {
  test.setTimeout(240_000)
  // Fixture-Eingriff (siehe Kopfkommentar)
  setOwnerStatus(A.ownerId, 'approved')
  const loginRes = await page.request.post(`${BASE_URL}/api/shop-admin/login`, {
    data: { email: A.email, password: PASSWORD }, headers: { 'Content-Type': 'application/json' },
  })
  expect(loginRes.ok()).toBe(true)

  // Sprachcheck: Knopftext + Tooltip je Sprache, alter Text („Aktivieren") darf nirgends vorkommen
  for (const [lang, [label, tooltip]] of Object.entries(KEEP_LABELS)) {
    await ownerPage(page, lang)
    const btn = page.locator('button', { hasText: new RegExp(`^${label}$`) }).first()
    await expect(btn, `Knopf ${lang}`).toBeVisible()
    await expect(btn).toHaveAttribute('title', tooltip)
    const body = await page.locator('body').innerText()
    for (const old of ['Aktivieren', 'Activate', 'Ενεργοποίηση', 'Активировать', 'تفعيل', 'הפעל']) {
      expect(body.includes(old), `alter Text „${old}" in ${lang}`).toBe(false)
    }
    logStep('P2', `Knopf/Tooltip ${lang}: „${label}"`, true)
  }

  // Übernehmen (UI, en) — Brot
  await ownerPage(page, 'en')
  const rowOf = (name: RegExp | string) => page.locator('[data-testid="offer-row"]').filter({ hasText: name }).first()
  const breadRow = rowOf('Fresh bread (daily)')
  const patch = page.waitForResponse(r => r.url().includes('/api/shop-admin/offers/') && r.request().method() === 'PATCH')
  await breadRow.locator('button', { hasText: /^Keep$/ }).click()
  expect((await patch).ok()).toBe(true)
  await expect(page.getByText('Suggestion kept.')).toBeVisible()
  logStep('P2', 'Übernehmen (UI) → Toast „Suggestion kept."', true)

  // Bearbeiten (Preis) — über denselben Endpunkt wie das Edit-Formular
  const tok = await shopOwnerLogin(A.email, PASSWORD)
  const offers = await (await fetch(`${BACKEND_URL}/api/v1/shop-owner/offers?limit=50`, { headers: { Authorization: `Bearer ${tok}` } })).json() as any
  const byItem = (slug: string) => offers.items.find((o: any) => o.item?.slug === slug)
  const cake = byItem(CAKE)
  const pr = await fetch(`${BACKEND_URL}/api/v1/shop-owner/offers/${cake.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ price_type: 'fixed', price_tiers: [{ unit: 'piece', steps: [{ min_quantity: 1, price: '12.50', currency: 'EUR' }] }] }),
  })
  expect(pr.status).toBe(200)
  logStep('P2', 'Bearbeiten: Preis 12.50 EUR gesetzt', true)

  // Löschen (UI): archivieren → Tab „abgelaufen/archiviert" → löschen
  await ownerPage(page, 'en')
  const wedRow = rowOf(/Wedding cake/i)
  await wedRow.getByRole('button', { name: 'Archive', exact: true }).click() // öffnet Bestätigung (gleiche Zeile)
  await wedRow.getByRole('button', { name: 'Archive', exact: true }).click() // bestätigt
  await expect(rowOf(/Wedding cake/i)).toHaveCount(0)
  await page.getByRole('button', { name: /Expired/ }).first().click()
  await rowOf(/Wedding cake/i).getByRole('button', { name: 'Delete', exact: true }).click()
  const del = page.waitForResponse(r => r.url().includes('/api/shop-admin/offers/') && r.request().method() === 'DELETE')
  await rowOf(/Wedding cake/i).getByRole('button', { name: 'Delete', exact: true }).click()
  expect((await del).status()).toBeLessThan(300)
  logStep('P2', 'Löschen (UI): archivieren + löschen', true)

  // Zustand in der DB: Brot shop_manual, Torte shop_manual (neuer Preis), Hochzeitstorte Angebot weg
  const state = psql(
    `select i.slug||':'||o.source||':'||o.price_type||':'||o.archived from offers o join shop_listings l on l.id=o.shop_listing_id join items i on i.id=l.item_id where l.shop_id=${A.shopId} and i.slug like 'baeckerei-%' order by 1`
  )
  expect(state).toContain(`${BREAD}:shop_manual:on_request:f`)
  expect(state).toContain(`${CAKE}:shop_manual:fixed:f`)
  expect(state).not.toContain(WEDDING)
  logStep('P2', 'DB: Brot/Torte shop_manual, Hochzeitstorte-Angebot gelöscht', true)

  // Zurück in den Prüfstatus: Angebote weiter unsichtbar
  setOwnerStatus(A.ownerId, 'pending')
  const v = await publicView(A.shopId, [BREAD, CAKE])
  expect(v.searchRu).not.toContain(A.slug)
  expect(v.searchCakeRu).not.toContain(A.slug)
  expect(v.productsTotal).toBe(0)
  logStep('P2', 'Übernommene/bearbeitete Vorschläge vor Freigabe weiter unsichtbar', true)
})

// ═════════════════════════════════════════════════════════════════════════════
// P2b (B5900-017): Angebotsliste mobil — Aktionen unter dem Namen, nichts überlagert; AR: Bild rechts
// ═════════════════════════════════════════════════════════════════════════════

test('P2b: mobil 390 px — Aktionen überlagern den Namen nicht (EL, auch im Bestätigungszustand), AR Bild rechts', async ({ page }) => {
  test.setTimeout(240_000)
  setOwnerStatus(A.ownerId, 'approved')
  try {
    const loginRes = await page.request.post(`${BASE_URL}/api/shop-admin/login`, {
      data: { email: A.email, password: PASSWORD }, headers: { 'Content-Type': 'application/json' },
    })
    expect(loginRes.ok()).toBe(true)
    await page.setViewportSize({ width: 390, height: 844 })

    async function checkRow(row: ReturnType<Page['locator']>, label: string) {
      const name = await row.locator('p').first().boundingBox()
      const actions = await row.locator('[data-testid="offer-row-actions"]').boundingBox()
      const rowBox = await row.boundingBox()
      const thumb = await row.locator('div.shrink-0').first().boundingBox()
      const content = await row.locator('p').first().locator('xpath=../..').boundingBox() // Inhalts-Spalte (Name+Badges+Preis)
      expect(name && actions && rowBox && thumb, `${label}: Boxen vorhanden`).toBeTruthy()
      expect(actions!.y, `${label}: Aktionen unter dem Namen`).toBeGreaterThanOrEqual(name!.y + name!.height - 1)
      expect(content!.width, `${label}: Inhalt hat volle Breite`).toBeGreaterThan((rowBox!.width - thumb!.width) * 0.5)
      expect(actions!.x + actions!.width, `${label}: Aktionen im Zeilenrahmen`).toBeLessThanOrEqual(rowBox!.x + rowBox!.width + 1)
    }

    await ownerPage(page, 'el')
    const keepRe = new RegExp(`^${KEEP_LABELS.el[0]}$`)
    const n = await page.locator('[data-testid="offer-row"] button', { hasText: keepRe }).count()
    expect(n, 'Vorschläge mit Keep-Knopf vorhanden').toBeGreaterThan(0)
    const rows = page.locator('[data-testid="offer-row"]').filter({ has: page.locator('button', { hasText: keepRe }) })
    for (let i = 0; i < n; i++) await checkRow(rows.nth(i), `EL Zeile ${i}`)
    logStep('P2b', `EL 390 px: ${n} Vorschlags-Zeilen, Aktionen unter dem Namen`, true)

    // Bestätigungszustand (Archivieren öffnen, nicht bestätigen)
    const first = rows.first()
    const buttons = first.locator('[data-testid="offer-row-actions"] button')
    await buttons.nth((await buttons.count()) - 1).click() // letzter Knopf = Archivieren
    await expect(first.getByRole('button', { name: /Ακύρωση/ })).toBeVisible()
    await checkRow(first, 'EL Bestätigung')
    logStep('P2b', 'EL 390 px: Bestätigungszustand ohne Überlagerung', true)

    // AR: Thumbnail rechts vom Inhalt
    await ownerPage(page, 'ar')
    const arRow = page.locator('[data-testid="offer-row"]').first()
    const thumb = await arRow.locator('div.shrink-0').first().boundingBox()
    const nm = await arRow.locator('p').first().boundingBox()
    expect(thumb!.x, 'AR: Bild rechts vom Namen').toBeGreaterThan(nm!.x)
    await checkRow(arRow, 'AR Zeile')
    logStep('P2b', 'AR 390 px: Thumbnail rechts, keine Überlagerung', true)
  } finally {
    setOwnerStatus(A.ownerId, 'pending')
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// P3: Freigabe — D4: übernommen + bearbeitet + unbearbeitet sichtbar, gelöscht nicht
// ═════════════════════════════════════════════════════════════════════════════

test('P3: System-Admin schaltet frei — übernommener, bearbeiteter und unbearbeitete Vorschläge sichtbar, gelöschter nicht (D4)', async ({ page }) => {
  test.setTimeout(120_000)
  const res = await adminApi('PATCH', `/shop-owners/${A.ownerId}`, { status: 'approved' })
  expect(res.status).toBe(200)

  const v = await publicView(A.shopId, [BREAD, CAKE, WEDDING, ...metzSlugs])
  expect(v.searchRu, 'Suche хлеб (übernommen)').toContain(A.slug)
  expect(v.searchEn, 'Suche bread (übernommen)').toContain(A.slug)
  expect(v.searchCakeRu, 'Suche торты (bearbeitet)').toContain(A.slug)
  logStep('P3', 'Suche: übernommener + bearbeiteter Vorschlag sichtbar', true)

  expect(v.detailOfferShops[BREAD]).toContain(A.slug)
  expect(v.detailOfferShops[CAKE]).toContain(A.slug)
  for (const m of metzSlugs) expect(v.detailOfferShops[m], `unbearbeitet ${m}`).toContain(A.slug)
  expect(v.detailOfferShops[WEDDING]).not.toContain(A.slug)
  logStep('P3', 'Produktdetail: übernommen/bearbeitet/unbearbeitet sichtbar, gelöscht nicht', true)

  // erwartet: Brot + Torte + alle Metzgerei-Vorschläge; Hochzeitstorte (gelöscht) fehlt
  expect(v.productsTotal).toBe(2 + metzSlugs.length)
  const listings = psql(
    `select i.slug||':'||l.available from shop_listings l join items i on i.id=l.item_id where l.shop_id=${A.shopId} order by 1`
  )
  expect(listings).toContain(`${WEDDING}:f`)
  expect(listings).toContain(`${BREAD}:t`)
  expect(listings).toContain(`${CAKE}:t`)
  logStep('P3', `/products?shop_id= = ${v.productsTotal}, Hochzeitstorte available=false`, true)

  // Preis des bearbeiteten Vorschlags im Produktdetail
  const det = await pub<{ offers: any[] }>(`/products/by-slug/${CAKE}`, { lat: LAT, lng: LNG })
  const mine = det.offers.find(o => o.shop_slug === A.slug)
  expect(String(mine?.price)).toMatch(/^12\.5/)
  logStep('P3', 'Preis 12.50 im Produktdetail', true)

  // UI Kunden-Shopseite: Produkt-Links vorhanden, Hochzeitstorte fehlt
  await page.goto(`${BASE_URL}/en/shops/${A.slug}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('a[href*="/products/"]').first()).toBeAttached()
  expect(await page.locator('a[href*="/products/"]').count()).toBeGreaterThan(0)
  expect(await page.locator(`a[href*="${WEDDING}"]`).count()).toBe(0)
  logStep('P3', 'UI Kunden-Shopseite: Angebote sichtbar, gelöschter Vorschlag nicht', true)
})

// ═════════════════════════════════════════════════════════════════════════════
// P4: Ablehnen — Angebote unsichtbar, Shop bleibt sichtbar (D3)
// ═════════════════════════════════════════════════════════════════════════════

test('P4: Owner abgelehnt — Angebote unsichtbar, Shop bleibt sichtbar (D3)', async ({ page }) => {
  test.setTimeout(120_000)
  let v = await publicView(B.shopId, [BREAD])
  expect(v.detailOfferShops[BREAD]).not.toContain(B.slug)

  const res = await adminApi('PATCH', `/shop-owners/${B.ownerId}`, { status: 'rejected' })
  expect(res.status).toBe(200)

  v = await publicView(B.shopId, [BREAD, CAKE, WEDDING])
  expect(v.searchRu).not.toContain(B.slug)
  expect(v.searchEn).not.toContain(B.slug)
  expect(v.searchCakeRu).not.toContain(B.slug)
  expect(v.productsTotal).toBe(0)
  for (const s of [BREAD, CAKE, WEDDING]) expect(v.detailOfferShops[s]).not.toContain(B.slug)
  expect(v.shopTopProducts).toBe(0)
  logStep('P4', 'abgelehnt: Suche/Produktliste/Detail ohne Angebote des Shops', true)

  const bySlug = await pub<any>(`/shops/by-slug/${B.slug}`)
  expect(bySlug.id).toBe(B.shopId)
  const list = await pub<{ items: any[] }>('/shops', { q: B.name, lat: LAT, lng: LNG })
  expect(list.items.map(s => s.slug)).toContain(B.slug)
  await page.goto(`${BASE_URL}/en/shops/${B.slug}`, { waitUntil: 'domcontentloaded' })
  await waitForPageHydrated(page)
  await expect(page.locator('h1').first()).toContainText(B.name)
  expect(await page.locator('a[href*="/products/"]').count()).toBe(0)
  logStep('P4', 'abgelehnt: Shop in Detail/Liste/UI sichtbar, ohne Angebote (D3)', true)
})

// ═════════════════════════════════════════════════════════════════════════════
// P5: Regression — Shops ohne Freigabe-Gate bleiben mit Preisen sichtbar (Zwei-Ebenen-Prinzip, F8950 T31)
//   Ebene 1 (P5a, laeuft immer): eigener Spec-Shop (Admin-angelegt, ohne Onboarding-Owner-Status) mit Festpreis-Angebot
//   Ebene 2 (P5b, Realdaten): freigeschaltete Demo-Shops und gescrapter Shop ohne Owner aus der Prod-Kopie
// ═════════════════════════════════════════════════════════════════════════════

test('P5a: Regression — Shop ohne Onboarding-Gate zeigt sein Angebot mit Preis (Spec-Shop)', async ({ page }) => {
  test.setTimeout(120_000)
  const shop = await specShop('B5910-P5')
  try {
    const item = await shop.createItem('B5910-P5', 'bread', { listing: true })
    const offer = await shop.api('POST', '/offers', {
      shop_listing_id: item.listingId, price_type: 'fixed',
      price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 2.5, currency: 'EUR' }] }],
    })
    expect(offer.status, offer.text).toBe(201)

    const detail = await pub<any>(`/shops/by-slug/${shop.slug}`)
    // Owner-API speichert 2.5 (Seed-Daten der Demo-Shops: '2.50') -> numerisch vergleichen
    const prices = (detail.top_products ?? []).map((p: any) => Number(p.price))
    expect(prices, `${shop.slug} Top-Produkte`).toContain(2.5)
    const det = await pub<{ offers: any[] }>(`/products/by-slug/${item.slug}`, { lat: LAT, lng: LNG })
    const o = det.offers.find(x => x.shop_slug === shop.slug)
    expect(o?.price_type, 'Produktdetail').toBe('fixed')
    expect(Number(o?.price)).toBe(2.5)
    const list = await pub<{ items: any[] }>('/products', { shop_id: shop.id, limit: 10 })
    expect(list.items.some(i => i.best_offer?.shop_slug === shop.slug && i.best_offer.is_available), 'best_offer verfügbar').toBe(true)
    logStep('P5', 'Spec-Shop: Shop-Detail + Produktdetail + Liste mit Preis 2.50', true)

    await page.goto(`${BASE_URL}/en/shops/${shop.slug}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toContainText(/2[.,]50/)
    logStep('P5', 'UI Spec-Shop: Preis 2,50 sichtbar', true)
  } finally {
    await shop.destroy()
  }
})

test('P5b: Realdaten — Demo-Shops mit Preisen, gescrapter Shop ohne Owner unverändert', async ({ page }) => {
  test.setTimeout(120_000)
  const demoSlugs = ['anna-s-bakery', 'o-phournos-tes-annas']
  const scrapedSlug = 'markos-pet-shop-26a6fc5d'
  for (const slug of [...demoSlugs, scrapedSlug]) {
    const r = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${slug}`)
    test.skip(!r.ok, `Realdaten-Check: Shop ${slug} fehlt in pundo_test (Prod-Kopie ohne diesen Shop) — Ebene 1 deckt P5a ab`)
  }
  for (const slug of demoSlugs) {
    const shop = await pub<any>(`/shops/by-slug/${slug}`)
    const prices = (shop.top_products ?? []).map((p: any) => p.price)
    expect(prices.length, `${slug} Top-Produkte`).toBeGreaterThan(0)
    expect(prices, `${slug} Preis 2.50`).toContain('2.50')
    const det = await pub<{ offers: any[] }>(`/products/by-slug/${BREAD}`, { lat: LAT, lng: LNG })
    const o = det.offers.find(x => x.shop_slug === slug)
    expect(o?.price_type, `${slug} Produktdetail`).toBe('fixed')
    expect(String(o?.price)).toBe('2.50')
    logStep('P5', `${slug}: Shop-Detail + Produktdetail mit Preis 2.50`, true)
  }
  // Suche „хлеб“: Treffer mit Preis (best_offer fixed) der Demo-Shops, nicht on_request/unavailable
  const s = await pub<{ items: any[] }>('/search', { q: 'хлеб', lat: LAT, lng: LNG }, 'ru')
  const bo = s.items.map(i => i.best_offer).filter(Boolean)
  expect(bo.some(b => [...demoSlugs, A.slug].includes(b.shop_slug) && b.is_available)).toBe(true)
  expect(bo.every(b => b.shop_slug !== B.slug)).toBe(true)
  logStep('P5', 'Suche „хлеб“: verfügbare Treffer, abgelehnter Shop B nicht dabei', true)

  // UI: Shop-Seite Anna's Bakery zeigt Preis
  await page.goto(`${BASE_URL}/en/shops/anna-s-bakery`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('body')).toContainText(/2[.,]50/)
  logStep('P5', 'UI anna-s-bakery: Preis 2,50 sichtbar', true)

  // gescrapter Shop ohne Owner
  const scraped = await pub<any>(`/shops/by-slug/${scrapedSlug}`)
  expect((scraped.top_products ?? []).length).toBeGreaterThan(0)
  const bread = await bestOfferShops('bread', 'en')
  expect(bread).toContain(scrapedSlug)
  logStep('P5', 'gescrapter Shop ohne Owner: Top-Produkte + Suchtreffer unverändert', true)
  void wasPending403
})
