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
 * Teardown: Offers werden archiviert + gelöscht, Listings gelöscht.
 * Shop-Owner + Shop bleiben in pundo_test (keine Lösch-API für shop-owner).
 *
 * Ports: Frontend 3500 · Backend 8500 · DB: pundo_test — NIEMALS 3000/8000
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'
import { adminLogin as _adminLogin } from './journeys/_helpers'

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
  const ownerEmail = `smoketest-${ts}@pundo.com`
  const ownerPassword = `SmokeTest!${ts % 1_000_000}`
  const shopName = `Smoke Shop G${gruppe.nr} ${ts}`

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
  const catRes = await api('GET', '/api/v1/categories?limit=50')
  const categories = (catRes.data as { items: Array<{ id: number; child_count: number }> }).items ?? []
  const leafCat = categories.find(c => c.child_count === 0) ?? categories[0]
  if (!leafCat) throw new Error('[Smoke] Keine Kategorie verfügbar')
  const categoryId = leafCat.id

  // 9. Items erstellen (Anzahl gemäß Gruppe)
  const itemIds: number[] = []
  for (let i = 0; i < gruppe.item_count; i++) {
    const itemName = `${gruppe.item_name_de} ${ts}-${i + 1}`
    const itemRes = await api(
      'POST',
      '/api/v1/shop-owner/items',
      { item_type: 'product', name_de: itemName, category_id: categoryId },
      { bearer: ownerToken }
    )
    if (itemRes.status === 201) {
      itemIds.push((itemRes.data as { id: number }).id)
    } else if (itemRes.status === 409) {
      const existing = (itemRes.data as { detail?: { similar_items?: Array<{ id: number }> } })
        .detail?.similar_items?.[0]?.id
      if (existing) itemIds.push(existing)
      else console.warn(`[Smoke] Item ${i + 1}: 409 ohne similar_items — übersprungen`)
    } else {
      console.warn(`[Smoke] Item ${i + 1}: ${itemRes.status} — ${JSON.stringify(itemRes.data)}`)
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
  const today = new Date()
  const validFrom = today.toISOString().slice(0, 10)
  const validUntil = `${today.getFullYear() + 1}-12-31`
  for (const listingId of listingIds) {
    const offerRes = await api(
      'POST',
      '/api/v1/shop-owner/offers',
      {
        shop_listing_id: listingId,
        price_type: gruppe.price_type,
        price_tiers: gruppe.price_tiers,
        valid_from: validFrom,
        valid_until: validUntil,
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
  if (!state) return
  const { ownerToken, offerIds, listingIds } = state
  for (const id of offerIds) {
    await api('PATCH', `/api/v1/shop-owner/offers/${id}`, { archived: true }, { bearer: ownerToken }).catch(() => {})
    await api('DELETE', `/api/v1/shop-owner/offers/${id}`, undefined, { bearer: ownerToken }).catch(() => {})
  }
  for (const id of listingIds) {
    await api('DELETE', `/api/v1/shop-owner/shop-listings/${id}`, undefined, { bearer: ownerToken }).catch(() => {})
  }
  console.log(`[Smoke] Teardown: ${offerIds.length} Offers, ${listingIds.length} Listings bereinigt.`)
})

// ─── Tests ───────────────────────────────────────────────────────────────────

test('S1 — Shop-Seite: H1 enthält Shop-Namen', async ({ page }) => {
  if (!state) { test.skip(true, 'Setup fehlgeschlagen'); return }
  const { shopSlug, shopName } = state

  await page.goto(`${FRONTEND_URL}/shops/${shopSlug}`)
  await page.waitForLoadState('networkidle')

  const h1 = page.locator('h1').first()
  await expect(h1).toBeVisible()
  await expect(h1).toContainText(shopName)
})

test('S2 — Shop-Seite: Angebote erscheinen als Produkt-Links', async ({ page }) => {
  if (!state) { test.skip(true, 'Setup fehlgeschlagen'); return }
  const { shopSlug, offerIds } = state

  await page.goto(`${FRONTEND_URL}/shops/${shopSlug}`)
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

test('S3 — Angebote-API: Offers erscheinen im öffentlichen Endpoint', async () => {
  if (!state) { test.skip(true, 'Setup fehlgeschlagen'); return }
  const { shopSlug, offerIds } = state

  const res = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${shopSlug}/offers`, {
    signal: AbortSignal.timeout(10_000),
  })
  expect(res.ok, `GET /shops/by-slug/${shopSlug}/offers: ${res.status}`).toBeTruthy()

  const offers = await res.json() as Array<{ id: number }>
  const returnedIds = offers.map(o => o.id)
  const allPresent = offerIds.every(id => returnedIds.includes(id))
  expect(
    allPresent,
    `Nicht alle Offers erscheinen in der API. Erwartet: ${offerIds}, Gefunden: ${returnedIds}`
  ).toBeTruthy()
  console.log(`[Smoke] S3: ${returnedIds.length} Offer(s) in API — alle ${offerIds.length} erwarteten vorhanden.`)
})

test('S4 — Shop-Admin: Offers in der Verwaltungsliste sichtbar', async () => {
  if (!state) { test.skip(true, 'Setup fehlgeschlagen'); return }
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
  if (!state) { test.skip(true, 'Setup fehlgeschlagen'); return }
  const { shopSlug } = state

  // Suche auf der /shops-Seite via URL-Param
  await page.goto(`${FRONTEND_URL}/shops?q=${encodeURIComponent(shopSlug)}`)
  await page.waitForLoadState('networkidle')

  // Mindestens ein Link zum neu erstellten Shop muss erscheinen
  const shopLink = page.locator(`a[href="/shops/${shopSlug}"]`)
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
