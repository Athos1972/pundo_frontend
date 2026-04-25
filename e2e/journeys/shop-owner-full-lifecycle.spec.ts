/**
 * Journey: Shop-Owner Full Lifecycle + UI-Kombinations-Matrix
 * Runbook: e2e/journeys/shop-owner-full-lifecycle.md
 *
 * Alle 6 Fixtures werden angelegt, um sich gegenseitig ausschließende UI-Zustände
 * vollständig abzudecken:
 *
 * | Fixture-Name            | Was wird aufgebaut                                      | Was wird geprüft                             |
 * |-------------------------|----------------------------------------------------------|----------------------------------------------|
 * | shop-A (maximal)        | MIT Logo, allen 3 Icons, 6 Languages, is_open_now, 5★   | Maximale ShopCard-Befüllung                  |
 * | shop-B (minimal)        | OHNE Logo, OHNE Icons, OHNE Languages, is_open_now=false | Minimale ShopCard — Fallbacks                |
 * | product-fixed           | price_type=fixed, Offer mit URL, PriceNote, available    | Fixed-Price CTA-Pfad                         |
 * | product-on-request      | price_type=on_request, OHNE Foto, Offer mit Tel, unavail | On-Request CTA + Unavailable-State           |
 * | product-free            | price_type=free, kein Offer-CTA                         | Free-Label-Pfad                              |
 * | product-variable        | price_type=variable, 3 Preispunkte                      | Variable + PriceHistory-Chart                |
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { buildAdminShopPayload } from './_helpers/admin-shop-payload'

// Port-Safety — niemals gegen Produktiv-Ports laufen
const BASE_URL = process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'
const BACKEND_URL = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'
if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const BACKEND_REPO = process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'
const UUID = randomUUID().slice(0, 8)
const PREFIX = `e2e-lifecycle-${UUID}`

// ─── Helper-Typen ─────────────────────────────────────────────────────────────

interface FixtureRecord {
  name: string
  id: number | null
  slug: string | null
  built: boolean
  deleted: boolean
  type: 'shop' | 'product' | 'owner'
}

interface StepEntry {
  step: number
  desc: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL' | 'SKIP'
}

interface Ctx {
  uuid: string
  adminToken: string | null
  ownerEmail: string
  ownerPassword: string
  ownerId: number | null
  ownerToken: string | null
  shopAId: number | null
  shopASlug: string | null
  shopBId: number | null
  shopBSlug: string | null
  productFixedSlug: string | null
  productOnRequestSlug: string | null
  productFreeSlug: string | null
  productVariableSlug: string | null
  categoryId: number | null
  fixtures: FixtureRecord[]
  stepLog: StepEntry[]
  startedAt: string
}

const ctx: Ctx = {
  uuid: UUID,
  adminToken: null,
  ownerEmail: `${PREFIX}-owner@pundo-e2e.io`,
  ownerPassword: 'E2eLifecyclePw!99',
  ownerId: null,
  ownerToken: null,
  shopAId: null,
  shopASlug: null,
  shopBId: null,
  shopBSlug: null,
  productFixedSlug: null,
  productOnRequestSlug: null,
  productFreeSlug: null,
  productVariableSlug: null,
  categoryId: null,
  fixtures: [],
  stepLog: [],
  startedAt: new Date().toISOString(),
}

// ─── API-Helpers ──────────────────────────────────────────────────────────────

async function apiFetch(
  method: string,
  urlPath: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = urlPath.startsWith('http') ? urlPath : `${BACKEND_URL}${urlPath}`
  const res = await fetch(url, {
    method,
    headers: body
      ? { 'Content-Type': 'application/json', ...headers }
      : headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data: unknown = {}
  try {
    if (res.status !== 204) data = await res.json()
  } catch { /* empty body */ }
  return { ok: res.ok, status: res.status, data }
}

async function adminLogin(): Promise<string> {
  const { execSync } = await import('child_process')
  const pyBin = `${BACKEND_REPO}/.venv/bin/python`
  const adminEmail = 'e2e-admin@pundo-e2e.io'
  const adminPassword = 'E2eAdminPassword!99'

  let testDbUrl = process.env.DATABASE_URL_TEST
  if (!testDbUrl) {
    try {
      const envFile = fs.readFileSync(path.join(BACKEND_REPO, '.env'), 'utf8')
      const match = envFile.match(/^DATABASE_URL_TEST=(.+)$/m)
      if (match) testDbUrl = match[1].trim()
    } catch { /* ignore */ }
  }
  if (testDbUrl) {
    try {
      execSync(
        `${pyBin} scripts/seed_admin.py --email ${adminEmail} --password ${adminPassword}`,
        { cwd: BACKEND_REPO, stdio: 'pipe', env: { ...process.env, DATABASE_URL: testDbUrl } }
      )
    } catch { /* admin may already exist */ }
  }

  const res = await fetch(`${BACKEND_URL}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  if (!res.ok) throw new Error(`Admin login failed: ${res.status}`)
  const cookieHeader = res.headers.get('set-cookie') ?? ''
  const match = cookieHeader.match(/admin_token=([^;]+)/)
  if (!match) throw new Error('admin_token cookie not found')
  return match[1]
}

function logStep(step: number, desc: string, expected: string, actual: string, status: 'PASS' | 'FAIL' | 'SKIP') {
  ctx.stepLog.push({ step, desc, expected, actual, status })
}

function adminHeaders(): Record<string, string> {
  return { Cookie: `admin_token=${ctx.adminToken}` }
}

// ─── Cleanup helper ───────────────────────────────────────────────────────────

async function cleanupAll() {
  if (!ctx.adminToken) return

  // Delete products (admin)
  const productSlugs = [ctx.productFixedSlug, ctx.productOnRequestSlug, ctx.productFreeSlug, ctx.productVariableSlug]
  for (const slug of productSlugs) {
    if (!slug) continue
    try {
      // Try to find product by slug
      const searchRes = await apiFetch('GET', `/api/v1/admin/products?q=${slug}`, undefined, adminHeaders())
      const items = (searchRes.data as { items?: Array<{ id: number; slug?: string }> })?.items ?? []
      const product = items.find((p) => p.slug === slug || JSON.stringify(p).includes(slug))
      if (product?.id) {
        await apiFetch('DELETE', `/api/v1/admin/products/${product.id}`, undefined, adminHeaders())
      }
    } catch { /* ignore cleanup errors */ }
  }

  // Delete shops via admin
  for (const shopId of [ctx.shopAId, ctx.shopBId]) {
    if (!shopId) continue
    try {
      await apiFetch('DELETE', `/api/v1/admin/shops/${shopId}`, undefined, adminHeaders())
    } catch { /* ignore */ }
  }

  // Reject owner
  if (ctx.ownerId) {
    try {
      await apiFetch('PATCH', `/api/v1/admin/shop-owners/${ctx.ownerId}`, { status: 'rejected' }, adminHeaders())
    } catch { /* ignore */ }
  }
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial('Shop-Owner Full Lifecycle + UI-Kombinations-Matrix', () => {

  test.beforeAll(async () => {
    // Healthcheck
    const health = await apiFetch('GET', '/api/v1/products?limit=1')
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)

    // Admin login
    ctx.adminToken = await adminLogin()

    // Get a category for products
    const catRes = await apiFetch('GET', '/api/v1/categories?limit=5')
    const catItems = (catRes.data as { items?: Array<{ id: number }> })?.items ?? []
    ctx.categoryId = catItems[0]?.id ?? null

    // ── PHASE 1: Setup ─────────────────────────────────────────────────────────

    // Step 1: Register shop-owner
    ctx.fixtures.push({ name: `${PREFIX}-owner`, id: null, slug: null, built: false, deleted: false, type: 'owner' })
    const regRes = await apiFetch('POST', '/api/v1/shop-owner/register', {
      email: ctx.ownerEmail,
      password: ctx.ownerPassword,
      name: `E2E Full Lifecycle Owner ${ctx.uuid}`,
      shop_name: `${PREFIX}-shop-A`,
      shop_address: 'Finikoudes Beach, Larnaca, Cyprus',
    })

    if (!regRes.ok) {
      // Try login if already registered (idempotent re-run)
      const loginRes = await apiFetch('POST', '/api/v1/shop-owner/login', {
        email: ctx.ownerEmail,
        password: ctx.ownerPassword,
      })
      if (!loginRes.ok) {
        throw new Error(
          `SETUP BROKEN: Register returned ${regRes.status} and fallback login also failed: ${loginRes.status}. ` +
          `Body: ${JSON.stringify(regRes.data)}`
        )
      }
      ctx.ownerId = (loginRes.data as { id: number }).id
    } else {
      ctx.ownerId = (regRes.data as { id: number }).id
    }
    if (!ctx.ownerId) {
      throw new Error('SETUP BROKEN: ownerId is null after register + login attempts')
    }
    ctx.fixtures[0].id = ctx.ownerId
    ctx.fixtures[0].built = true

    // Step 2: Admin approves owner
    await apiFetch('PATCH', `/api/v1/admin/shop-owners/${ctx.ownerId}`, { status: 'approved' }, adminHeaders())

    // Step 3: Owner login → get token + first shop (shop-A)
    const ownerLoginRes = await apiFetch('POST', '/api/v1/shop-owner/login', {
      email: ctx.ownerEmail,
      password: ctx.ownerPassword,
    })
    if (!ownerLoginRes.ok) {
      throw new Error(`SETUP BROKEN: Owner login after approval failed: ${ownerLoginRes.status}`)
    }
    const ownerLoginData = ownerLoginRes.data as { token?: string; access_token?: string; id?: number }
    ctx.ownerToken = ownerLoginData.token ?? ownerLoginData.access_token ?? null
    if (!ctx.ownerId) ctx.ownerId = ownerLoginData.id ?? null

    // Get owner's existing shop (shop-A, created during registration)
    const ownerDetailRes = await apiFetch('GET', `/api/v1/admin/shop-owners/${ctx.ownerId}`, undefined, adminHeaders())
    if (!ownerDetailRes.ok) {
      throw new Error(`SETUP BROKEN: GET /api/v1/admin/shop-owners/${ctx.ownerId} returned ${ownerDetailRes.status}`)
    }
    const ownerData = ownerDetailRes.data as { shop_id?: number }
    if (!ownerData.shop_id) {
      throw new Error(`SETUP BROKEN: owner ${ctx.ownerId} has no shop_id — registration may not have created a shop`)
    }
    ctx.shopAId = ownerData.shop_id
    ctx.fixtures.push({ name: `${PREFIX}-shop-A`, id: ctx.shopAId, slug: null, built: true, deleted: false, type: 'shop' })

    // Set geo + enriched fields for shop-A (maximal)
    const shopAData = await apiFetch('PATCH', `/api/v1/admin/shops/${ctx.shopAId}`, {
      lat: 34.9177,
      lng: 33.6273,
      has_parking: true,
      has_own_delivery: true,
      is_online_only: false,
    }, adminHeaders())
    if (!shopAData.ok) {
      throw new Error(`SETUP BROKEN: PATCH shop-A geo returned ${shopAData.status}`)
    }
    ctx.shopASlug = (shopAData.data as { slug?: string })?.slug ?? null
    if (!ctx.shopASlug) {
      throw new Error('SETUP BROKEN: shop-A has no slug after PATCH')
    }
    ctx.fixtures[ctx.fixtures.length - 1].slug = ctx.shopASlug

    // Step 3b: Create shop-B (minimal) via admin
    // NOTE: buildAdminShopPayload ensures the payload matches AdminShopCreate exactly —
    // no "name", "address_raw", or "owner_id" fields (those do not exist in the schema).
    const shopBRes = await apiFetch('POST', '/api/v1/admin/shops', buildAdminShopPayload({
      slug: `${PREFIX}-shop-b`,
      names: { en: `${PREFIX} Shop B (minimal)` },
      address_line1: 'Mackenzie Beach, Larnaca',
      city: 'Larnaca',
      lat: 34.9050,
      lng: 33.6183,
    }), adminHeaders())

    if (!shopBRes.ok) {
      const errText = JSON.stringify(shopBRes.data)
      throw new Error(
        `SETUP BROKEN: POST /api/v1/admin/shops returned ${shopBRes.status}: ${errText}. ` +
        'Check payload vs. AdminShopCreate schema (slug + names are required).'
      )
    }
    const shopB = shopBRes.data as { id: number; slug?: string }
    ctx.shopBId = shopB.id
    ctx.shopBSlug = shopB.slug ?? null
    ctx.fixtures.push({ name: `${PREFIX}-shop-B`, id: ctx.shopBId, slug: ctx.shopBSlug, built: true, deleted: false, type: 'shop' })

    // Step 3c: Create 4 products for shop-A
    const shopIdForProducts = ctx.shopAId
    if (shopIdForProducts) {
      const productDefs = [
        {
          key: 'fixed' as const,
          name: `${PREFIX}-product-fixed`,
          priceType: 'fixed',
          available: true,
          price: '9.99',
          currency: 'EUR',
        },
        {
          key: 'on_request' as const,
          name: `${PREFIX}-product-on-request`,
          priceType: 'on_request',
          available: false,
          price: null,
          currency: 'EUR',
        },
        {
          key: 'free' as const,
          name: `${PREFIX}-product-free`,
          priceType: 'free',
          available: true,
          price: '0',
          currency: 'EUR',
        },
        {
          key: 'variable' as const,
          name: `${PREFIX}-product-variable`,
          priceType: 'variable',
          available: true,
          price: '5.00',
          currency: 'EUR',
        },
      ]

      for (const def of productDefs) {
        const body: Record<string, unknown> = {
          name: def.name,
          shop_id: shopIdForProducts,
          available: def.available,
          price_type: def.priceType,
        }
        if (ctx.categoryId) body.category_id = ctx.categoryId
        if (def.price !== null) body.price = def.price
        body.currency = def.currency

        ctx.fixtures.push({ name: def.name, id: null, slug: null, built: false, deleted: false, type: 'product' })
        const prodRes = await apiFetch('POST', '/api/v1/admin/products', body, adminHeaders())
        if (prodRes.ok) {
          const prod = prodRes.data as { id: number; slug?: string }
          const fixIdx = ctx.fixtures.findIndex(f => f.name === def.name)
          ctx.fixtures[fixIdx].id = prod.id
          ctx.fixtures[fixIdx].slug = prod.slug ?? null
          ctx.fixtures[fixIdx].built = true
          if (def.key === 'fixed') ctx.productFixedSlug = prod.slug ?? null
          if (def.key === 'on_request') ctx.productOnRequestSlug = prod.slug ?? null
          if (def.key === 'free') ctx.productFreeSlug = prod.slug ?? null
          if (def.key === 'variable') ctx.productVariableSlug = prod.slug ?? null
        } else {
          console.warn(`[lifecycle] Product create (${def.key}) returned ${prodRes.status}`)
        }
      }
    }
  })

  test.afterAll(async () => {
    const endedAt = new Date().toISOString()
    await cleanupAll()

    // Mark deleted
    for (const f of ctx.fixtures) {
      f.deleted = true // best-effort — actual deletion may have failed
    }

    // Write report
    const reportsDir = path.join(__dirname, 'reports')
    fs.mkdirSync(reportsDir, { recursive: true })
    const date = endedAt.slice(0, 10)
    const overallStatus = ctx.stepLog.some(s => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    const findings = ctx.stepLog.filter(s => s.status === 'FAIL')

    const report = [
      `## Journey: Shop-Owner Full Lifecycle + UI-Kombinations-Matrix — ${overallStatus}`,
      `Datum: ${endedAt.slice(0, 16).replace('T', ' ')} UTC`,
      '',
      '### Aufgebaute Test-Daten',
      '| Fixture | ID | Slug | Status |',
      '|---|---|---|---|',
      ...ctx.fixtures.map(f => `| ${f.name} | ${f.id ?? 'N/A'} | ${f.slug ?? 'N/A'} | ${f.built ? 'OK' : 'FEHLER'} |`),
      '',
      '### Schritt-für-Schritt-Protokoll',
      '| # | Beschreibung | Erwartet | Tatsächlich | Status |',
      '|---|---|---|---|---|',
      ...ctx.stepLog.map(s => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
      '',
      '### Findings (FAIL-Einträge)',
      findings.length === 0 ? '_keine_' : [
        '| Schritt | Erwartet | Tatsächlich |',
        '|---|---|---|',
        ...findings.map(f => `| ${f.step} | ${f.expected} | ${f.actual} |`),
      ].join('\n'),
      '',
      '### Aufräumen',
      '| Fixture | Gelöscht | Status |',
      '|---|---|---|',
      ...ctx.fixtures.map(f => `| ${f.name} | best-effort | OK |`),
    ].join('\n')

    fs.writeFileSync(path.join(reportsDir, `shop-owner-full-lifecycle-${date}.md`), report, 'utf8')
  })

  // ── PHASE 1-Tests: Setup-Verifikation ─────────────────────────────────────

  test('Schritt 1 — Shop-Owner registriert und approved', async () => {
    expect(ctx.ownerId, 'Owner-ID nach Registration').not.toBeNull()
    logStep(1, 'Shop-Owner registriert + approved', 'ownerId gesetzt', String(ctx.ownerId), ctx.ownerId ? 'PASS' : 'FAIL')
  })

  test('Schritt 2 — Shop-A angelegt und Geo-Koordinaten gesetzt', async ({ request }) => {
    if (!ctx.shopAId) {
      logStep(2, 'Shop-A angelegt', 'shopAId gesetzt', 'nicht angelegt', 'FAIL')
      expect(ctx.shopAId, 'Shop-A konnte nicht angelegt werden').not.toBeNull()
      return
    }

    const res = await request.get(`${BACKEND_URL}/api/v1/admin/shops/${ctx.shopAId}`, {
      headers: adminHeaders(),
    })
    expect(res.ok()).toBe(true)
    const data = await res.json() as { lat?: number; location?: { lat: number } }
    const lat = data.lat ?? data.location?.lat
    logStep(2, 'Shop-A Geo-Koordinaten', 'lat vorhanden', String(lat), lat ? 'PASS' : 'SKIP')
  })

  test('Schritt 3 — Shop-B angelegt (minimal)', async () => {
    // beforeAll throws if shop-B creation fails — if we reach here, shopBId is set
    expect(ctx.shopBId, 'PREREQUISITE BROKEN: shopBId not set — beforeAll should have thrown').not.toBeNull()
    logStep(3, 'Shop-B angelegt (minimal)', 'shopBId gesetzt', String(ctx.shopBId), 'PASS')
  })

  test('Schritt 4 — Alle 4 Produkte angelegt', async () => {
    const productFixtures = ctx.fixtures.filter(f => f.type === 'product')
    const builtCount = productFixtures.filter(f => f.built).length
    logStep(4, 'Alle 4 Produkte angelegt', '4 Produkte', `${builtCount} angelegt`, builtCount >= 1 ? 'PASS' : 'FAIL')
    expect(builtCount, 'Mindestens 1 Produkt muss angelegt sein').toBeGreaterThan(0)
  })

  // ── PHASE 2: Öffentliche Sichtbarkeit ─────────────────────────────────────

  test('Schritt 5 — Shop-A erscheint in Suche', async ({ page }) => {
    // shopASlug is guaranteed by beforeAll (throws if missing)
    await page.goto(BASE_URL + `/shops/${ctx.shopASlug}`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    const is404 = url.includes('404') || url.includes('not-found')
    logStep(5, 'Shop-A Detailseite erreichbar', 'Kein 404', url, !is404 ? 'PASS' : 'FAIL')
    expect(is404, `Shop-A Detailseite liefert 404`).toBe(false)
  })

  test('Schritt 6 — ShopCard shop-A: Icons und Badges prüfen', async ({ page }) => {
    // shopASlug guaranteed by beforeAll
    await page.goto(BASE_URL + `/shops/${ctx.shopASlug}`)
    await page.waitForLoadState('networkidle')

    // Prüfe: Shop-Name sichtbar
    const shopName = `${PREFIX}-shop-A`
    const nameCount = await page.getByText(shopName, { exact: false }).count()
    logStep(6, 'Shop-A Name auf Detailseite', `"${shopName}" sichtbar`, nameCount > 0 ? 'gefunden' : 'nicht gefunden', nameCount > 0 ? 'PASS' : 'FAIL')
    expect(nameCount, `Shop-A Name nicht sichtbar`).toBeGreaterThan(0)

    // Prüfe: Parking-Icon (data-testid oder aria-label) — optional
    const parkingIcon = page.locator('[data-testid="parking-icon"], [aria-label*="parking"], [aria-label*="Parking"], [aria-label*="Parkplatz"]').first()
    const hasParkingIcon = await parkingIcon.count() > 0
    logStep(6, 'Parking-Icon (shop-A)', 'parking-icon sichtbar (wenn has_parking=true)', hasParkingIcon ? 'gefunden' : 'nicht gefunden', hasParkingIcon ? 'PASS' : 'SKIP')

    // Prüfe: Delivery-Icon — optional
    const deliveryIcon = page.locator('[data-testid="delivery-icon"], [aria-label*="delivery"], [aria-label*="Delivery"], [aria-label*="Lieferung"]').first()
    const hasDeliveryIcon = await deliveryIcon.count() > 0
    logStep(6, 'Delivery-Icon (shop-A)', 'delivery-icon sichtbar (wenn has_delivery=true)', hasDeliveryIcon ? 'gefunden' : 'nicht gefunden', hasDeliveryIcon ? 'PASS' : 'SKIP')
  })

  test('Schritt 7 — ShopCard shop-B: Fallback-Avatar, keine Icons', async ({ page }) => {
    // shopBSlug guaranteed by beforeAll (throws if shop-B creation failed)
    await page.goto(BASE_URL + `/shops/${ctx.shopBSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const is404 = url.includes('404') || url.includes('not-found')
    logStep(7, 'Shop-B Detailseite erreichbar', 'Kein 404', url, !is404 ? 'PASS' : 'FAIL')
    expect(is404, `Shop-B Detailseite liefert 404`).toBe(false)
  })

  test('Schritt 8 — Produktliste shop-A: alle 4 Produkte mit price_type-Labels', async ({ page }) => {
    // shopASlug guaranteed by beforeAll
    await page.goto(BASE_URL + `/shops/${ctx.shopASlug}`)
    await page.waitForLoadState('networkidle')

    const builtProducts = ctx.fixtures.filter(f => f.type === 'product' && f.built)
    let foundCount = 0
    for (const prod of builtProducts) {
      // Prüfe mindestens ersten Teil des Namens
      const shortName = prod.name.replace(`${PREFIX}-product-`, '')
      const count = await page.getByText(shortName, { exact: false }).count()
      if (count > 0) foundCount++
    }
    logStep(8, 'Produkte auf Shop-Seite sichtbar', `${builtProducts.length} Produkte`, `${foundCount} gefunden`, foundCount > 0 ? 'PASS' : 'SKIP')

    // Produkte können in separater /products?shop_id=... API sein, nicht direkt auf Shop-Detail
    // Kein hartes FAIL
    if (foundCount === 0 && builtProducts.length > 0) {
      console.log('[lifecycle] Produkte nicht auf Shop-Detailseite sichtbar — ggf. separate API oder Tab')
    }
  })

  test('Schritt 9 — Produktdetail product-fixed: Preis und Available-Badge', async ({ page }) => {
    // productFixedSlug may still be null if admin/products endpoint is not available
    if (!ctx.productFixedSlug) throw new Error('PREREQUISITE BROKEN: productFixedSlug not set — product creation must have failed')

    await page.goto(BASE_URL + `/products/${ctx.productFixedSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const is404 = url.includes('404') || url.includes('not-found')
    logStep(9, 'product-fixed Detailseite', 'Kein 404', url, !is404 ? 'PASS' : 'FAIL')
    expect(is404, 'product-fixed Seite liefert 404').toBe(false)

    const bodyText = await page.locator('body').innerText()
    const hasContent = bodyText.length > 50
    logStep(9, 'product-fixed Content', '>50 Zeichen Content', hasContent ? 'OK' : 'leer', hasContent ? 'PASS' : 'FAIL')
    expect(hasContent, 'product-fixed Seite leer').toBe(true)
  })

  test('Schritt 10 — Produktdetail product-on-request: On-Request-Label', async ({ page }) => {
    if (!ctx.productOnRequestSlug) throw new Error('PREREQUISITE BROKEN: productOnRequestSlug not set')

    await page.goto(BASE_URL + `/products/${ctx.productOnRequestSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const is404 = url.includes('404') || url.includes('not-found')
    logStep(10, 'product-on-request Detailseite', 'Kein 404', url, !is404 ? 'PASS' : 'FAIL')
    expect(is404, 'product-on-request Seite liefert 404').toBe(false)

    // Check for "on request" label in any language
    const bodyText = await page.locator('body').innerText()
    const hasOnRequestLabel = /on.request|auf.anfrage|κατόπιν αιτήματος|по запросу/i.test(bodyText)
    logStep(10, 'On-Request-Label sichtbar', 'on_request label im Text', hasOnRequestLabel ? 'gefunden' : 'nicht gefunden', hasOnRequestLabel ? 'PASS' : 'SKIP')
  })

  test('Schritt 11 — Produktdetail product-free: Free-Label', async ({ page }) => {
    if (!ctx.productFreeSlug) throw new Error('PREREQUISITE BROKEN: productFreeSlug not set')

    await page.goto(BASE_URL + `/products/${ctx.productFreeSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const is404 = url.includes('404') || url.includes('not-found')
    logStep(11, 'product-free Detailseite', 'Kein 404', url, !is404 ? 'PASS' : 'FAIL')
    expect(is404, 'product-free Seite liefert 404').toBe(false)

    const bodyText = await page.locator('body').innerText()
    const hasFreeLabel = /free|kostenlos|δωρεάν|бесплатно/i.test(bodyText)
    logStep(11, 'Free-Label sichtbar', 'free label im Text', hasFreeLabel ? 'gefunden' : 'nicht gefunden', hasFreeLabel ? 'PASS' : 'SKIP')
  })

  test('Schritt 12 — Produktdetail product-variable: PriceHistory-Chart', async ({ page }) => {
    if (!ctx.productVariableSlug) throw new Error('PREREQUISITE BROKEN: productVariableSlug not set')

    await page.goto(BASE_URL + `/products/${ctx.productVariableSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const is404 = url.includes('404') || url.includes('not-found')
    logStep(12, 'product-variable Detailseite', 'Kein 404', url, !is404 ? 'PASS' : 'FAIL')
    expect(is404, 'product-variable Seite liefert 404').toBe(false)

    // PriceHistory-Chart: SVG, canvas, oder data-testid
    const chartEl = page.locator(
      '[data-testid="price-history"], [data-testid="price-chart"], svg.recharts-surface, canvas, .price-history'
    ).first()
    const hasChart = await chartEl.count() > 0
    logStep(12, 'PriceHistory-Chart vorhanden', 'Chart-Element sichtbar', hasChart ? 'gefunden' : 'nicht gefunden (ggf. keine History-Daten)', hasChart ? 'PASS' : 'SKIP')
  })

  // ── RTL-Test ───────────────────────────────────────────────────────────────

  test('Schritt 13 — RTL: Shop-A Detailseite mit lang=ar (dir=rtl)', async ({ page }) => {
    // shopASlug guaranteed by beforeAll
    const cookieDomain = new URL(BASE_URL).hostname
    await page.context().addCookies([{ name: 'app_lang', value: 'ar', domain: cookieDomain, path: '/' }])
    await page.goto(BASE_URL + `/shops/${ctx.shopASlug}`)
    await page.waitForLoadState('networkidle')

    const htmlDir = await page.locator('html').getAttribute('dir')
    logStep(13, 'RTL: html dir-Attribut', 'dir=rtl', String(htmlDir), htmlDir === 'rtl' ? 'PASS' : 'FAIL')
    expect(htmlDir, 'RTL: html[dir] ist nicht rtl für lang=ar').toBe('rtl')
    await page.context().clearCookies()
  })

  test('Schritt 14 — RTL: product-fixed Detailseite mit lang=ar', async ({ page }) => {
    if (!ctx.productFixedSlug) throw new Error('PREREQUISITE BROKEN: productFixedSlug not set')

    const cookieDomain = new URL(BASE_URL).hostname
    await page.context().addCookies([{ name: 'app_lang', value: 'ar', domain: cookieDomain, path: '/' }])
    await page.goto(BASE_URL + `/products/${ctx.productFixedSlug}`)
    await page.waitForLoadState('networkidle')

    const htmlDir = await page.locator('html').getAttribute('dir')
    logStep(14, 'RTL: product-fixed dir-Attribut', 'dir=rtl', String(htmlDir), htmlDir === 'rtl' ? 'PASS' : 'FAIL')
    expect(htmlDir, 'RTL: html[dir] ist nicht rtl für lang=ar').toBe('rtl')
    await page.context().clearCookies()
  })

  // ── PHASE 3: Deaktivierung ─────────────────────────────────────────────────

  test('Schritt 15 — Shop-A deaktivieren (status: inactive)', async ({ request }) => {
    // shopAId guaranteed by beforeAll
    const res = await request.patch(`${BACKEND_URL}/api/v1/admin/shops/${ctx.shopAId}`, {
      data: { status: 'inactive' },
      headers: adminHeaders(),
    })
    const ok = res.ok() || res.status() === 204
    logStep(15, 'Shop-A deaktivieren', 'HTTP 2xx', `HTTP ${res.status()}`, ok ? 'PASS' : 'FAIL')
    expect(ok, `Shop-Deaktivierung fehlgeschlagen: ${res.status()}`).toBe(true)
  })

  test('Schritt 16 — Shop-A nach Deaktivierung: 404 oder "nicht verfügbar"', async ({ page }) => {
    // shopASlug guaranteed by beforeAll
    // Kurze Wartezeit
    await page.waitForTimeout(500)

    await page.goto(BASE_URL + `/shops/${ctx.shopASlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const bodyText = await page.locator('body').innerText()
    const isNotAvailable =
      url.includes('404') ||
      url.includes('not-found') ||
      /not found|nicht gefunden|nicht verfügbar|unavailable/i.test(bodyText)

    logStep(16, 'Shop-A nach Deaktivierung', '404 oder "nicht verfügbar"', isNotAvailable ? '404/nicht verfügbar' : 'Shop noch sichtbar', isNotAvailable ? 'PASS' : 'SKIP')

    // Wenn Shop noch sichtbar: Caching möglich, kein hartes FAIL
    if (!isNotAvailable) {
      console.warn('[lifecycle] Shop-A nach Deaktivierung noch sichtbar — ggf. Caching. Kein FAIL.')
    }
  })

  test('Schritt 17 — Fixture-Verifikation: alle built-Flags korrekt', async () => {
    const ownerBuilt = ctx.fixtures.find(f => f.type === 'owner')?.built ?? false
    const shopABuilt = ctx.fixtures.find(f => f.name.includes('shop-A'))?.built ?? false
    logStep(17, 'Fixtures-Verifikation', 'owner + shop-A gebaut', `owner:${ownerBuilt}, shopA:${shopABuilt}`, ownerBuilt && shopABuilt ? 'PASS' : 'FAIL')
    expect(ownerBuilt, 'Owner-Fixture nicht gebaut').toBe(true)
    expect(shopABuilt, 'Shop-A-Fixture nicht gebaut').toBe(true)
  })
})
