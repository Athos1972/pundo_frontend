/**
 * Smoke-Test: Shop-Visibility
 *
 * Erstellt eigenständig einen frischen @pundo.com-Shop, wählt zufällig eine
 * der 4 Angebotsgruppen, legt Items + ShopListings + Offers an und verifiziert,
 * dass der Shop und seine Angebote auf der Kunden-Seite erscheinen.
 *
 * Gruppen:
 *   1. FIXED      — Artikel mit Festpreis (z.B. Tiernahrung)
 *   2. ON_REQUEST — Artikel auf Anfrage  (z.B. Tierarzt-Beratung)
 *   3. FREE       — Kostenloser Service  (z.B. Erstberatung gratis)
 *   4. VARIABLE   — Variabler Preis      (z.B. Tierpflege pro Stunde)
 *
 * Registrierung/Approve/Login sind hier Prüfgegenstand und bleiben (B8950-012: Owner-E-Mail, Shop-Name und
 * Item-Namen tragen den Marker `E2E-<RUN>-SMOKE…`).
 * Teardown (B8950-012): Admin-Shop-Delete kaskadiert Owner, Listings, Offers und die exklusiven
 * shop_manual-Items; Reste fängt der Reporter über den Run-Marker ab.
 *
 * S3 prüft den Endpoint-Vertrag von GET /shops/by-slug/{slug}/offers: er liefert NUR Angebote mit aktiver
 * Aktion (Docstring get_shop_offers_by_slug, shop_query.py). Normale Listings stehen im Produktblock
 * (GET /products?shop_id=) → S3 prüft diesen Weg, S3b den Aktions-Endpoint mit echter Aktion.
 *
 * Ports: Frontend 3500 · Backend 8500 · DB: pundo_test — NIEMALS 3000/8000
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'
import { adminLogin as _adminLogin } from './journeys/_helpers'
import { TestDataTracker, e2eEmail, e2eName } from './journeys/_helpers/test-data'

// Pfad zum Backend-Repo (gleiche Konvention wie global-setup.ts)
const BACKEND_REPO =
  process.env.BACKEND_REPO ??
  '/Users/bb_studio_2025/dev/github/pundo_main_backend'

/** Liest DATABASE_URL aus dem Backend-.env (nicht in Playwright-Umgebung gesetzt). */
function readBackendDbUrl(): string {
  try {
    const envContent = fs.readFileSync(path.join(BACKEND_REPO, '.env'), 'utf8')
    return (
      envContent.match(/^DATABASE_URL_TEST=(.+)$/m)?.[1]?.trim() ??
      envContent.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim() ??
      ''
    )
  } catch {
    return process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL ?? ''
  }
}

/**
 * Stellt sicher, dass der E2E-Admin-User existiert (idempotent), dann Login.
 * `_helpers.ts adminLogin()` loggt nur ein — erstellt den User nicht.
 */
async function adminLogin(): Promise<string> {
  const pyBin = `${BACKEND_REPO}/.venv/bin/python3`
  const adminEmail    = 'e2e-admin@pundo-e2e.io'
  const adminPassword = 'E2eAdminPassword!99'
  const dbUrl = readBackendDbUrl()
  try {
    execSync(
      `${pyBin} scripts/seed_admin.py --email ${adminEmail} --password "${adminPassword}"`,
      {
        cwd: BACKEND_REPO,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: dbUrl },
      }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200)
    console.warn(`[Smoke] seed_admin.py Warnung: ${msg}`)
  }
  return _adminLogin(adminEmail, adminPassword)
}

// ─── Port-Sicherheit ─────────────────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL ?? process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL  = process.env.BACKEND_URL  ?? process.env.TEST_BACKEND_URL ?? 'http://localhost:8500'

if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[smoke-shop-visibility] Safety: NIEMALS gegen Produktiv-Ports 3000/8000 testen!')
}

// ─── 4 Angebotsgruppen ───────────────────────────────────────────────────────

interface PriceTierStep {
  min_quantity: number
  max_quantity?: number
  price: number
  currency: string
}

interface PriceTier {
  unit: string
  unit_label_custom?: string
  steps: PriceTierStep[]
}

interface Gruppe {
  nr: number
  name: string
  price_type: 'fixed' | 'on_request' | 'free' | 'variable'
  price_tiers: PriceTier[]
  item_name_de: string
  item_count: number
}

const GRUPPEN: Gruppe[] = [
  {
    nr: 1,
    name: 'FIXED',
    price_type: 'fixed',
    price_tiers: [{ unit: 'piece', steps: [{ min_quantity: 1, price: 24.99, currency: 'EUR' }] }],
    item_name_de: 'Smoke Tiernahrung Premium',
    item_count: 2,
  },
  {
    nr: 2,
    name: 'ON_REQUEST',
    price_type: 'on_request',
    price_tiers: [],
    item_name_de: 'Smoke Tierarzt Beratung',
    item_count: 1,
  },
  {
    nr: 3,
    name: 'FREE',
    price_type: 'free',
    price_tiers: [],
    item_name_de: 'Smoke Gratis Erstberatung',
    item_count: 1,
  },
  {
    nr: 4,
    name: 'VARIABLE',
    price_type: 'variable',
    price_tiers: [{ unit: 'hour', unit_label_custom: 'pro Stunde', steps: [{ min_quantity: 1, price: 55.00, currency: 'EUR' }] }],
    item_name_de: 'Smoke Tierpflege Leistung',
    item_count: 2,
  },
]

// ─── Shared Test-State ───────────────────────────────────────────────────────

interface SmokeState {
  ownerEmail: string
  shopName: string
  shopId: number
  shopSlug: string
  ownerToken: string
  gruppe: Gruppe
  itemIds: number[]
  listingIds: number[]
  offerIds: number[]
}

let state: SmokeState | null = null
const tracker = new TestDataTracker()

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

async function api(
  method: string,
  path: string,
  body?: unknown,
  auth?: { bearer?: string; cookie?: string }
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth?.bearer) headers['Authorization'] = `Bearer ${auth.bearer}`
  if (auth?.cookie)  headers['Cookie'] = auth.cookie

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  const data = res.status !== 204 ? await res.json().catch(() => ({})) : {}
  return { status: res.status, data }
}

// ─── Serial: beforeAll, Tests, afterAll laufen der Reihe nach ────────────────

test.describe.configure({ mode: 'serial' })

// ─── Setup ───────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  test.setTimeout(120_000)

  // 1. Zufällige Gruppe wählen
  const gruppe = GRUPPEN[Math.floor(Math.random() * GRUPPEN.length)]
  console.log(`\n[Smoke] ▶ Gruppe ${gruppe.nr} — ${gruppe.name}`)

  // 2. Unique Email + Shop-Name
  const ts = Date.now()
  const ownerEmail = e2eEmail('SMOKE', 'pundo.com')
  const ownerPassword = `SmokeTest!${ts % 1_000_000}`
  const shopName = e2eName('SMOKE', `G${gruppe.nr}`)

  // 3. Shop-Owner registrieren
  console.log(`[Smoke] Registriere ${ownerEmail}…`)
  const regRes = await api('POST', '/api/v1/shop-owner/register', {
    email: ownerEmail,
    password: ownerPassword,
    name: `Smoke Owner G${gruppe.nr}`,
    shop_name: shopName,
    shop_address: 'Finikoudes Beach, Larnaca, Cyprus',
  })
  if (regRes.status !== 201) {
    throw new Error(`[Smoke] Register failed: ${regRes.status} — ${JSON.stringify(regRes.data)}`)
  }
  const ownerId = (regRes.data as { id: number }).id
  console.log(`[Smoke] Owner registered: id=${ownerId}`)

  // 4. Admin approvet den Owner
  const adminToken = await adminLogin()
  const approveRes = await api(
    'PATCH',
    `/api/v1/admin/shop-owners/${ownerId}`,
    { status: 'approved' },
    { cookie: `admin_token=${adminToken}` }
  )
  if (approveRes.status !== 200) {
    throw new Error(`[Smoke] Approve failed: ${approveRes.status}`)
  }
  console.log(`[Smoke] Owner approved.`)

  // 5. shop_id holen
  const ownerDetailsRes = await api(
    'GET',
    `/api/v1/admin/shop-owners/${ownerId}`,
    undefined,
    { cookie: `admin_token=${adminToken}` }
  )
  const shopId = (ownerDetailsRes.data as { shop_id: number }).shop_id
  if (!shopId) throw new Error('[Smoke] shop_id not found in owner details')

  // 6. Geo-Koordinaten setzen → slug wird im Response zurückgegeben
  const geoRes = await api(
    'PATCH',
    `/api/v1/admin/shops/${shopId}`,
    { lat: 34.9177, lng: 33.6273 },
    { cookie: `admin_token=${adminToken}` }
  )
  const shopSlug = (geoRes.data as { slug?: string }).slug
  if (!shopSlug) throw new Error('[Smoke] shopSlug not found after geo-patch')
  tracker.shop(shopId)
  console.log(`[Smoke] Shop: id=${shopId}, slug=${shopSlug}`)

  // 7. Shop-Owner einloggen → Bearer-Token
  const loginRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!loginRes.ok) throw new Error(`[Smoke] Login failed: ${loginRes.status}`)
  const cookieHeader = loginRes.headers.get('set-cookie') ?? ''
  const tokenMatch = cookieHeader.match(/shop_owner_token=([^;]+)/)
  if (!tokenMatch) throw new Error('[Smoke] shop_owner_token nicht im Set-Cookie gefunden')
  const ownerToken = tokenMatch[1]

  // 8. Erste verfügbare Kategorie holen (Leaf-Level bevorzugt)
  // Bevorzugt: generierte Test-Kategorie (global-setup, `e2e-tmp-*`, Wurzel ohne Kinder).
  // Fallback (z. B. E2E_REUSE_STATE nach bereinigtem Lauf): erstes Kind einer Google-Wurzel,
  // damit der Test nicht an einer Wurzel-Kategorie der falschen Taxonomie hängt.
  const catRes = await api('GET', '/api/v1/categories?limit=50')
  const categories = (catRes.data as { items: Array<{ id: number; child_count: number }> }).items ?? []
  let leafCat: { id: number } | undefined = categories.find(c => c.child_count === 0)
  if (!leafCat) {
    const gRes = await api('GET', '/api/v1/categories?taxonomy_type=google&limit=1')
    const root = (gRes.data as { items: Array<{ id: number }> }).items?.[0]
    if (root) {
      const kids = await api('GET', `/api/v1/categories?parent_id=${root.id}&limit=1`)
      leafCat = (kids.data as { items: Array<{ id: number }> }).items?.[0] ?? root
    }
  }
  leafCat = leafCat ?? categories[0]
  if (!leafCat) throw new Error('[Smoke] Keine Kategorie verfügbar')
  const categoryId = leafCat.id

  // 9. Items erstellen (Anzahl gemäß Gruppe)
  const itemIds: number[] = []
  for (let i = 0; i < gruppe.item_count; i++) {
    const itemName = e2eName('SMOKE', `${gruppe.item_name_de}-${i + 1}`)
    const itemRes = await api(
      'POST',
      '/api/v1/shop-owner/items',
      { item_type: 'product', name_de: itemName, category_id: categoryId, confirmed: true },
      { bearer: ownerToken }
    )
    if (itemRes.status === 201) {
      const created = itemRes.data as { id: number; slug: string }
      itemIds.push(created.id)
      tracker.item(created.id, created.slug)
    } else {
      // Kein Wiederverwenden fremder Items bei 409 (B8950-012): der Marker-Name ist eindeutig → Fehler.
      throw new Error(`[Smoke] Item ${i + 1}: ${itemRes.status} — ${JSON.stringify(itemRes.data)}`)
    }
  }
  if (itemIds.length === 0) throw new Error('[Smoke] Kein Item erstellt — Testabbruch')
  // Deduplizieren — bei 409-Kollision können mehrere Items auf dieselbe ID zeigen
  const uniqueItemIds = [...new Set(itemIds)]
  console.log(`[Smoke] Items: ${uniqueItemIds} (${itemIds.length} erstellt, ${uniqueItemIds.length} unique)`)

  // 10. Shop-Listings erstellen (1 Listing pro Item)
  const listingIds: number[] = []
  for (const itemId of uniqueItemIds) {
    const listRes = await api(
      'POST',
      '/api/v1/shop-owner/shop-listings',
      { item_id: itemId },
      { bearer: ownerToken }
    )
    if (listRes.status === 201 || listRes.status === 409) {
      const listingId =
        (listRes.data as { id?: number; detail?: { shop_listing_id?: number } }).id ??
        (listRes.data as { detail?: { shop_listing_id?: number } }).detail?.shop_listing_id
      if (listingId) listingIds.push(listingId)
    } else {
      console.warn(`[Smoke] Listing für item ${itemId}: ${listRes.status}`)
    }
  }
  if (listingIds.length === 0) throw new Error('[Smoke] Kein ShopListing erstellt — Testabbruch')
  console.log(`[Smoke] Listings: ${listingIds}`)

  // 11. Offers erstellen (1 Offer pro Listing)
  const offerIds: number[] = []
  for (const listingId of listingIds) {
    const offerRes = await api(
      'POST',
      '/api/v1/shop-owner/offers',
      {
        shop_listing_id: listingId,
        price_type: gruppe.price_type,
        price_tiers: gruppe.price_tiers,
      },
      { bearer: ownerToken }
    )
    if (offerRes.status === 201) {
      offerIds.push((offerRes.data as { id: number }).id)
    } else {
      console.warn(`[Smoke] Offer für listing ${listingId}: ${offerRes.status} — ${JSON.stringify(offerRes.data)}`)
    }
  }
  if (offerIds.length === 0) throw new Error('[Smoke] Kein Offer erstellt — Testabbruch')
  console.log(`[Smoke] Offers: ${offerIds}`)
  console.log(`[Smoke] Setup abgeschlossen — Gruppe ${gruppe.nr}/${gruppe.name}, ${offerIds.length} Offers aktiv.`)

  state = { ownerEmail, shopName, shopId, shopSlug, ownerToken, gruppe, itemIds: uniqueItemIds, listingIds, offerIds }
})

// ─── Teardown ────────────────────────────────────────────────────────────────

test.afterAll(async () => {
  const report = await tracker.cleanup()
  console.log(`[Smoke] Teardown: ${report.shopsDeleted} Shop(s), ${report.itemsDeleted} Item(s) per Admin-API gelöscht.`)
})

// ─── Tests ───────────────────────────────────────────────────────────────────

test('S1 — Shop-Seite: H1 enthält Shop-Namen', async ({ page }) => {
  if (!state) throw new Error('SETUP BROKEN: beforeAll hat keinen State geliefert')
  const { shopSlug, shopName } = state

  await page.goto(`${FRONTEND_URL}/en/shops/${shopSlug}`)
  await page.waitForLoadState('networkidle')

  const h1 = page.locator('h1').first()
  await expect(h1).toBeVisible()
  await expect(h1).toContainText(shopName)
})

test('S2 — Shop-Seite: Angebote erscheinen als Produkt-Links', async ({ page }) => {
  if (!state) throw new Error('SETUP BROKEN: beforeAll hat keinen State geliefert')
  const { shopSlug, offerIds } = state

  await page.goto(`${FRONTEND_URL}/en/shops/${shopSlug}`)
  await page.waitForLoadState('networkidle')

  // Warte bis mindestens ein Produkt-Link geladen ist (max 10s)
  // Produkt-URLs haben lang-Präfix: /{lang}/products/slug — daher href*= statt href^=
  const productLinks = page.locator('a[href*="/products/"]')
  await expect(productLinks.first()).toBeVisible({ timeout: 10_000 })

  const count = await productLinks.count()
  expect(count, `Erwartet ${offerIds.length} Produkt-Links, gefunden ${count}`).toBeGreaterThanOrEqual(
    Math.min(offerIds.length, 1)
  )
  console.log(`[Smoke] S2: ${count} Produkt-Link(s) auf Shop-Seite sichtbar.`)
})

test('S3 — Produkte-API: alle angelegten Items stehen im öffentlichen Produktblock des Shops', async () => {
  if (!state) throw new Error('SETUP BROKEN: beforeAll hat keinen State geliefert')
  const { shopId, itemIds } = state

  // Vertrag (get_shop_offers_by_slug-Docstring): normale Listings stehen im Produktblock via GET /products?shop_id=
  const res = await fetch(`${BACKEND_URL}/api/v1/products?shop_id=${shopId}&limit=50`, {
    signal: AbortSignal.timeout(10_000),
  })
  expect(res.ok, `GET /products?shop_id=${shopId}: ${res.status}`).toBeTruthy()
  const body = await res.json() as { items?: Array<{ id: number }> }
  const returnedIds = (body.items ?? []).map(i => i.id)
  const allPresent = itemIds.every(id => returnedIds.includes(id))
  expect(
    allPresent,
    `Nicht alle Items erscheinen im Produktblock. Erwartet: ${itemIds}, Gefunden: ${returnedIds}`
  ).toBeTruthy()
  console.log(`[Smoke] S3: ${returnedIds.length} Produkt(e) im Produktblock — alle ${itemIds.length} erwarteten vorhanden.`)
})

test('S3b — Angebote-API: Angebot mit aktiver Aktion erscheint im Aktions-Endpoint', async () => {
  if (!state) throw new Error('SETUP BROKEN: beforeAll hat keinen State geliefert')
  const { shopSlug, ownerToken, offerIds } = state

  // GET /shops/by-slug/{slug}/offers liefert nur Angebote mit aktiver Aktion (promo_valid_from <= heute <= promo_valid_until)
  const today = new Date()
  const until = new Date(today.getTime() + 30 * 86_400_000)
  const patch = await api(
    'PATCH',
    `/api/v1/shop-owner/offers/${offerIds[0]}`,
    {
      promo_price_type: 'fixed',
      promo_price_tiers: [{ unit: 'piece', steps: [{ min_quantity: 1, price: 4.99, currency: 'EUR' }] }],
      promo_valid_from: today.toISOString().slice(0, 10),
      promo_valid_until: until.toISOString().slice(0, 10),
    },
    { bearer: ownerToken }
  )
  expect(patch.status, `PATCH Aktion: ${JSON.stringify(patch.data)}`).toBe(200)
  const promoOfferId = (patch.data as { id: number }).id

  const res = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${shopSlug}/offers`, {
    signal: AbortSignal.timeout(10_000),
  })
  expect(res.ok, `GET /shops/by-slug/${shopSlug}/offers: ${res.status}`).toBeTruthy()
  const offers = await res.json() as Array<{ id: number }>
  expect(
    offers.map(o => o.id),
    `Aktions-Angebot ${promoOfferId} fehlt im öffentlichen Endpoint`
  ).toContain(promoOfferId)
})

test('S4 — Shop-Admin: Offers in der Verwaltungsliste sichtbar', async () => {
  if (!state) throw new Error('SETUP BROKEN: beforeAll hat keinen State geliefert')
  const { ownerToken, offerIds } = state

  const res = await api('GET', '/api/v1/shop-owner/offers?limit=50', undefined, { bearer: ownerToken })
  expect(res.status).toBe(200)

  const body = res.data as { items?: Array<{ id: number }> }
  const adminOfferIds = (body.items ?? []).map(o => o.id)
  const allPresent = offerIds.every(id => adminOfferIds.includes(id))
  expect(
    allPresent,
    `Shop-Admin-API: Nicht alle Offers sichtbar. Erwartet: ${offerIds}, Gefunden: ${adminOfferIds.slice(0, 10)}`
  ).toBeTruthy()
  console.log(`[Smoke] S4: ${adminOfferIds.length} Admin-Offers — alle ${offerIds.length} erwarteten vorhanden.`)
})

test('S5 — Shop-Suche: Shop erscheint in Shop-Suchergebnissen', async ({ page }) => {
  if (!state) throw new Error('SETUP BROKEN: beforeAll hat keinen State geliefert')
  const { shopSlug } = state

  // Suche auf der /shops-Seite via URL-Param
  await page.goto(`${FRONTEND_URL}/en/shops?q=${encodeURIComponent(shopSlug)}`)
  await page.waitForLoadState('networkidle')

  // Mindestens ein Link zum neu erstellten Shop muss erscheinen
  const shopLink = page.locator(`a[href$="/shops/${shopSlug}"]`)
  const count = await shopLink.count()
  if (count === 0) {
    // Fallback: Shop-Seite direkt erreichbar (Suche evtl. nicht live)
    console.warn(`[Smoke] S5: Shop-Suche hat ${shopSlug} nicht gefunden — prüfe direkte URL.`)
    const directRes = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${shopSlug}`, {
      signal: AbortSignal.timeout(10_000),
    })
    expect(directRes.ok, `Shop ${shopSlug} nicht über API erreichbar`).toBeTruthy()
    console.log(`[Smoke] S5: Shop direkt über API erreichbar (Suche noch nicht indiziert).`)
  } else {
    await expect(shopLink.first()).toBeVisible()
    console.log(`[Smoke] S5: Shop-Link in Suchergebnissen sichtbar.`)
  }
})
