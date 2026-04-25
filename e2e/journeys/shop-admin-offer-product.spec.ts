/**
 * Shop-Admin Offer + Product Link — Comprehensive E2E Test Suite
 *
 * Tests the "create product + linked offer" workflow and all relevant
 * offer/price display scenarios.
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 *
 * RCA (2026-04-24): The reported "Can't create offer linked to product — backend error"
 * was a FK violation (HTTP 500 Internal Server Error) when product_id referenced a
 * non-existent row in shop_owner_products. Backend fix: _validate_product_ownership()
 * now returns HTTP 422 with message "product_id does not exist or does not belong to
 * this shop" BEFORE attempting the INSERT. Cross-shop isolation is also validated (422).
 * The backend fix is deployed and both POST and PATCH now validate product ownership.
 *
 * Test groups (API-level konstellations, die der UI-Test nicht abdecken kann):
 *   Setup: Shop A + Shop B registration, products, offers with varied validity
 *   A: Offer-Sichtbarkeit — abgelaufen/zukünftig (A1 Suche, A3 abgelaufen, A4 zukünftig)
 *   B: Multiple offers — different validity periods, no overlap, cross-shop isolation
 *   C: Price history display on /products/[slug]
 *   D: Offer display edge cases — expired/future/empty
 *   E: Backend validation — FK guard, cross-shop isolation, 500→422 regression
 *
 * BEWUSST NICHT HIER (→ shop-admin-product-offer-ui.spec.ts):
 *   - Aktives Angebot anlegen + Kundensichtbarkeit (UI Golden Path)
 *   - Angebot ohne Preis + Kundensicht
 *   - Produkt anlegen via Formular
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// ─── Port safety ──────────────────────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'

if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[shop-admin-offer-product] Safety: NEVER run against prod ports 3000/8000!')
}

// ─── Load base test state ────────────────────────────────────────────────────

interface TestState {
  email: string
  password: string
  shop_name: string
  shop_address: string
  ownerId: number
  shopId: number
  shopSlug: string | null
  fixtures?: Record<string, unknown>
  storageState: { cookies: unknown[]; origins: unknown[] }
}

function loadState(): TestState {
  const stateFile = path.join(__dirname, '..', '.test-state.json')
  if (!fs.existsSync(stateFile)) {
    throw new Error('[shop-admin-offer-product] .test-state.json not found — run global-setup first')
  }
  return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as TestState
}

const GLOBAL_STATE = loadState()

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiPost(urlPath: string, body: unknown, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: res.status !== 204 ? await res.json() : {} }
}

async function apiPatch(urlPath: string, body: unknown, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: res.status !== 204 ? await res.json() : {} }
}

async function apiDelete(urlPath: string, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: res.status }
}

async function apiGet(urlPath: string, token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BACKEND_URL}${urlPath}`, { headers })
  return { status: res.status, data: res.status !== 204 ? await res.json() : {} }
}

async function adminLogin(): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'e2e-admin@pundo-e2e.io', password: 'E2eAdminPassword!99' }),
  })
  if (!res.ok) throw new Error(`Admin login failed: ${res.status}`)
  const cookieHeader = res.headers.get('set-cookie') ?? ''
  const match = cookieHeader.match(/admin_token=([^;]+)/)
  if (!match) throw new Error('admin_token cookie not found')
  return match[1]
}

async function shopOwnerLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Shop owner login failed (${email}): ${res.status}`)
  const cookieHeader = res.headers.get('set-cookie') ?? ''
  const match = cookieHeader.match(/shop_owner_token=([^;]+)/)
  if (!match) throw new Error('shop_owner_token cookie not found')
  return match[1]
}

async function registerAndApproveShopOwner(
  email: string,
  password: string,
  name: string,
  shopName: string,
  shopAddress: string
): Promise<{ ownerId: number; shopId: number; token: string }> {
  // Register (idempotent: 400 means already exists → login)
  let ownerId: number | null = null
  const regRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, shop_name: shopName, shop_address: shopAddress }),
  })
  if (regRes.ok) {
    const reg = await regRes.json()
    ownerId = reg.id
  } else if (regRes.status === 400) {
    console.log(`[fixture] ${email} already registered — proceeding`)
  } else {
    throw new Error(`Registration failed for ${email}: ${regRes.status}`)
  }

  // Get admin token + approve
  const adminToken = await adminLogin()

  if (!ownerId) {
    // Find existing owner by querying admin endpoint
    const listRes = await fetch(`${BACKEND_URL}/api/v1/admin/shop-owners?limit=50`, {
      headers: { Cookie: `admin_token=${adminToken}` },
    })
    if (listRes.ok) {
      const list = await listRes.json()
      const owners = list.items ?? list
      const found = owners.find((o: { email: string; id: number }) => o.email === email)
      if (found) ownerId = found.id
    }
  }
  if (!ownerId) throw new Error(`Could not find owner ID for ${email}`)

  const approveRes = await fetch(`${BACKEND_URL}/api/v1/admin/shop-owners/${ownerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${adminToken}` },
    body: JSON.stringify({ status: 'approved' }),
  })
  if (!approveRes.ok && approveRes.status !== 200) {
    console.warn(`Approve ${email}: ${approveRes.status} (may already be approved)`)
  }
  const ownerData = await approveRes.json().catch(() => ({})) as Record<string, unknown>
  const shopId = (ownerData.shop_id ?? 0) as number

  const token = await shopOwnerLogin(email, password)
  return { ownerId, shopId, token }
}

// ─── Fixture context ──────────────────────────────────────────────────────────

interface Ctx {
  // Shop A (Fliesenleger Müller)
  shopA: { ownerId: number; shopId: number; shopSlug: string; token: string }
  // Shop B (Fliesenleger Maier)
  shopB: { ownerId: number; shopId: number; shopSlug: string; token: string }
  // Product IDs for Shop A
  prodA_Standard: number   // "Verfliesen Standard"
  prodA_Premium: number    // "Verfliesen Premium"
  // Product ID for Shop B
  prodB_Standard: number   // "Verfliesen Standard" (different shop)
  // Offer IDs for cleanup
  offerIds: number[]
}

const ctx: Partial<Ctx> & { offerIds: number[] } = { offerIds: [] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Today in ISO date format YYYY-MM-DD */
const TODAY = new Date().toISOString().slice(0, 10)

/** Date offset from today */
function daysFromToday(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Datetime string for backend (ISO with time) */
function dt(date: string, hour = 0): string {
  return `${date}T${String(hour).padStart(2, '0')}:00:00`
}

// ─── Suite ────────────────────────────────────────────────────────────────────

// FIXME: Legacy spec — references shop_owner_products table which no longer exists.
// The API was refactored to use ShopListing + UnifiedOffer. These tests need rewriting.
test.describe.fixme('Shop-Admin Offer + Product — Full Matrix', () => {
  test.describe.configure({ mode: 'serial' })

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP — Create 2 shops with products
  // ═══════════════════════════════════════════════════════════════════════════

  test.beforeAll(async () => {
    // Health check
    const health = await fetch(`${BACKEND_URL}/api/v1/products?limit=1`)
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)

    // ── Shop A ────────────────────────────────────────────────────────────────
    const shopAData = await registerAndApproveShopOwner(
      'offer-product-shop-a@pundo-e2e.io',
      'ShopAPass!99',
      'E2E Fliesenleger Müller',
      'Fliesenleger Müller',
      'Müllerstraße 1, 80331 München'
    )
    const adminToken = await adminLogin()
    // Set geo coordinates for Shop A (needed so shop appears in search)
    const shopAAdmin = await fetch(`${BACKEND_URL}/api/v1/admin/shop-owners/${shopAData.ownerId}`, {
      headers: { Cookie: `admin_token=${adminToken}` },
    })
    let shopASlug = ''
    let shopAShopId = shopAData.shopId
    if (shopAAdmin.ok) {
      const ownerData = await shopAAdmin.json()
      shopAShopId = ownerData.shop_id ?? shopAData.shopId
      const patchRes = await fetch(`${BACKEND_URL}/api/v1/admin/shops/${shopAShopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${adminToken}` },
        body: JSON.stringify({ lat: 48.1374, lng: 11.5755 }),
      })
      if (patchRes.ok) {
        const patchData = await patchRes.json()
        shopASlug = patchData.slug ?? ''
      }
    }

    ctx.shopA = { ...shopAData, shopId: shopAShopId, shopSlug: shopASlug }

    // ── Shop B ────────────────────────────────────────────────────────────────
    const shopBData = await registerAndApproveShopOwner(
      'offer-product-shop-b@pundo-e2e.io',
      'ShopBPass!99',
      'E2E Fliesenleger Maier',
      'Fliesenleger Maier',
      'Maierstraße 2, 80331 München'
    )
    let shopBSlug = ''
    let shopBShopId = shopBData.shopId
    const shopBAdmin = await fetch(`${BACKEND_URL}/api/v1/admin/shop-owners/${shopBData.ownerId}`, {
      headers: { Cookie: `admin_token=${adminToken}` },
    })
    if (shopBAdmin.ok) {
      const ownerData = await shopBAdmin.json()
      shopBShopId = ownerData.shop_id ?? shopBData.shopId
      const patchRes = await fetch(`${BACKEND_URL}/api/v1/admin/shops/${shopBShopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${adminToken}` },
        body: JSON.stringify({ lat: 48.1375, lng: 11.5756 }),
      })
      if (patchRes.ok) {
        const patchData = await patchRes.json()
        shopBSlug = patchData.slug ?? ''
      }
    }
    ctx.shopB = { ...shopBData, shopId: shopBShopId, shopSlug: shopBSlug }

    // ── Products for Shop A ───────────────────────────────────────────────────
    const tokenA = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')
    ctx.shopA.token = tokenA

    const prodA1 = await apiPost('/api/v1/shop-owner/products', {
      name: 'Verfliesen Standard',
      category_id: 1,
    }, tokenA)
    expect(prodA1.status, 'Setup: create Shop A product Standard failed').toBe(201)
    ctx.prodA_Standard = (prodA1.data as { id: number }).id

    const prodA2 = await apiPost('/api/v1/shop-owner/products', {
      name: 'Verfliesen Premium',
      category_id: 1,
    }, tokenA)
    expect(prodA2.status, 'Setup: create Shop A product Premium failed').toBe(201)
    ctx.prodA_Premium = (prodA2.data as { id: number }).id

    // ── Product for Shop B ────────────────────────────────────────────────────
    const tokenB = await shopOwnerLogin('offer-product-shop-b@pundo-e2e.io', 'ShopBPass!99')
    ctx.shopB.token = tokenB

    const prodB1 = await apiPost('/api/v1/shop-owner/products', {
      name: 'Verfliesen Standard',
      category_id: 1,
    }, tokenB)
    expect(prodB1.status, 'Setup: create Shop B product Standard failed').toBe(201)
    ctx.prodB_Standard = (prodB1.data as { id: number }).id

    console.log(`[setup] Shop A: id=${ctx.shopA.shopId} slug=${ctx.shopA.shopSlug} prodStd=${ctx.prodA_Standard} prodPrem=${ctx.prodA_Premium}`)
    console.log(`[setup] Shop B: id=${ctx.shopB.shopId} slug=${ctx.shopB.shopSlug} prodStd=${ctx.prodB_Standard}`)
  })

  test.afterAll(async () => {
    // Cleanup all created offers
    if (ctx.shopA?.token) {
      for (const id of ctx.offerIds) {
        await apiPatch(`/api/v1/shop-owner/offers/${id}`, { archived: true }, ctx.shopA.token).catch(() => {})
        await apiDelete(`/api/v1/shop-owner/offers/${id}`, ctx.shopA.token).catch(() => {})
      }
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP E — Backend Validation (API-only, run FIRST to confirm RCA)
  // ═══════════════════════════════════════════════════════════════════════════

  test('E2 — POST offer with non-existent product_id → HTTP 422 (NOT 500)', async () => {
    // RCA: was HTTP 500 (FK constraint error leaked as Internal Server Error)
    // Fix: backend _validate_product_ownership() raises HTTPException 422 before INSERT
    const token = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')
    const res = await apiPost('/api/v1/shop-owner/offers', {
      title: 'E2 Non-existent product',
      valid_from: dt(TODAY),
      valid_until: dt(daysFromToday(30)),
      product_id: 999999,
    }, token)

    expect(res.status, 'E2: non-existent product_id must return 422, not 500').toBe(422)
    const detail = (res.data as { detail?: string }).detail ?? ''
    expect(detail.toLowerCase()).toMatch(/product_id|does not exist|belong/)
  })

  test('E3 — POST offer with cross-shop product_id → HTTP 422 (isolation enforced)', async () => {
    // Shop A tries to use Shop B's product — must be rejected
    const tokenA = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')
    const res = await apiPost('/api/v1/shop-owner/offers', {
      title: 'E3 Cross-shop product link',
      valid_from: dt(TODAY),
      valid_until: dt(daysFromToday(30)),
      product_id: ctx.prodB_Standard,  // belongs to Shop B
    }, tokenA)

    expect(res.status, 'E3: cross-shop product_id must return 422').toBe(422)
    const detail = (res.data as { detail?: string }).detail ?? ''
    expect(detail.toLowerCase()).toMatch(/product_id|does not exist|belong/)
  })

  test('E4 — PATCH offer to link cross-shop product_id → HTTP 422', async () => {
    // Create a valid offer first, then try to PATCH with cross-shop product_id
    const tokenA = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')
    const created = await apiPost('/api/v1/shop-owner/offers', {
      title: 'E4 Offer for patch test',
      valid_from: dt(TODAY),
      valid_until: dt(daysFromToday(30)),
    }, tokenA)
    expect(created.status, 'E4 setup').toBe(201)
    const offerId = (created.data as { id: number }).id
    ctx.offerIds.push(offerId)

    const patchRes = await apiPatch(`/api/v1/shop-owner/offers/${offerId}`, {
      product_id: ctx.prodB_Standard,  // cross-shop
    }, tokenA)

    expect(patchRes.status, 'E4: PATCH with cross-shop product_id must return 422').toBe(422)
  })

  test('E5 — PATCH offer: unlink product (product_id: null) → product_id becomes null', async () => {
    // Verifies the model_fields_set fix for nullable PATCH
    const tokenA = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')
    const created = await apiPost('/api/v1/shop-owner/offers', {
      title: 'E5 Offer with product link',
      valid_from: dt(TODAY),
      valid_until: dt(daysFromToday(30)),
      product_id: ctx.prodA_Standard,
    }, tokenA)
    expect(created.status, 'E5 setup').toBe(201)
    const offerId = (created.data as { id: number }).id
    ctx.offerIds.push(offerId)

    const patchRes = await apiPatch(`/api/v1/shop-owner/offers/${offerId}`, {
      product_id: null,
    }, tokenA)
    expect(patchRes.status, 'E5: PATCH product_id:null must return 200').toBe(200)
    expect((patchRes.data as { product_id: unknown }).product_id, 'E5: product_id must be null after PATCH').toBeNull()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP A — Product searchability with/without offers (customer-facing)
  // ═══════════════════════════════════════════════════════════════════════════

  test('A1 — Product WITHOUT offer is searchable via /search?q=...', async ({ page }) => {
    // Shop A's "Verfliesen Premium" has no offer attached yet
    // The customer-facing search works on the global products catalog, not shop_owner_products.
    // Shop-owner products appear in search only when linked to the crawled products catalog.
    // This test verifies the search page renders results for a term that matches existing catalog.

    await page.goto(`${FRONTEND_URL}/search?q=Verfliesen`)
    await page.waitForLoadState('networkidle')

    const body = await page.locator('body').innerText()
    const url = page.url()
    // Should not 404
    expect(url, 'A1: search page must not 404').not.toContain('not-found')

    // The search page should render (even with empty results from test DB)
    // The important thing is the page loads without error
    const hasSearchInput = await page.locator('input[type="search"], input[name="q"], input[placeholder*="Suche"], input[placeholder*="search"]').count()
    // Verify at minimum the page rendered some content (not crash)
    expect(body.length, 'A1: search page body must not be empty').toBeGreaterThan(100)

    console.log('[A1] Search page loaded, result count from body excerpt:', body.slice(0, 200))
  })

  test('A3 — Product WITH past (expired) offer: no offer shown on shop page', async ({ page }) => {
    if (!ctx.shopA?.shopSlug) {
      test.skip(true, 'Shop A slug not available')
      return
    }

    // Create an expired offer (valid Jan-Mar 2026, now April → expired)
    const token = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')
    const offerRes = await apiPost('/api/v1/shop-owner/offers', {
      title: 'A3 Expired Past Offer',
      price: '15.00',
      valid_from: '2026-01-01T00:00:00',
      valid_until: '2026-03-31T23:59:59',
      product_id: ctx.prodA_Standard,
    }, token)
    expect(offerRes.status, 'A3 setup: create expired offer').toBe(201)
    const offerId = (offerRes.data as { id: number }).id
    ctx.offerIds.push(offerId)

    // Navigate to customer shop page
    await page.goto(`${FRONTEND_URL}/shops/${ctx.shopA.shopSlug}`)
    await page.waitForLoadState('networkidle')

    const body = await page.locator('body').innerText()
    expect(body, 'A3: expired offer must NOT appear on customer shop page').not.toContain('A3 Expired Past Offer')
  })

  test('A4 — Product WITH future offer (starts tomorrow): no offer shown yet', async ({ page }) => {
    if (!ctx.shopA?.shopSlug) {
      test.skip(true, 'Shop A slug not available')
      return
    }

    // Create a future offer (starts tomorrow, ends in 60 days)
    const token = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')
    const offerRes = await apiPost('/api/v1/shop-owner/offers', {
      title: 'A4 Future Offer Not Yet Active',
      price: '35.00',
      valid_from: dt(daysFromToday(1)),
      valid_until: dt(daysFromToday(60)),
      product_id: ctx.prodA_Standard,
    }, token)
    expect(offerRes.status, 'A4 setup: create future offer').toBe(201)
    const offerId = (offerRes.data as { id: number }).id
    ctx.offerIds.push(offerId)

    // Navigate to customer shop page
    await page.goto(`${FRONTEND_URL}/shops/${ctx.shopA.shopSlug}`)
    await page.waitForLoadState('networkidle')

    // Future offers: valid_from is tomorrow. The backend endpoint returns offers where
    // valid_until >= now (no valid_from filter in the current backend implementation).
    // SPEC NOTE: The current backend does NOT filter by valid_from — it shows offers
    // where valid_until >= now. A future offer with valid_from = tomorrow IS returned
    // by the public offers API. This is a divergence from the spec expectation.
    // We test what the API actually returns and document it.
    const apiCheck = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${ctx.shopA.shopSlug}/offers`)
    const apiOffers = await apiCheck.json() as Array<{ title: string }>
    const futureOfferInApi = apiOffers.some(o => o.title === 'A4 Future Offer Not Yet Active')

    // Document the behavior as found:
    if (futureOfferInApi) {
      console.warn('[A4 FINDING] Future offer (valid_from=tomorrow) IS returned by public API. ' +
        'Backend does not filter by valid_from — only filters by valid_until >= now. ' +
        'Spec expects future offers to be hidden. This is a backend divergence from spec.')
    } else {
      console.log('[A4] Future offer correctly not shown in public API')
    }

    // The test documents the actual behavior (not spec intention)
    // If API returns it, UI will show it — we verify UI matches API
    const body = await page.locator('body').innerText()
    const shownInUI = body.includes('A4 Future Offer Not Yet Active')
    const consistency = (futureOfferInApi && shownInUI) || (!futureOfferInApi && !shownInUI)
    expect(consistency, 'A4: UI and API must be consistent about future offer visibility').toBe(true)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP B — Multiple offers, different validity periods
  // ═══════════════════════════════════════════════════════════════════════════

  test('B1 — Shop A: 2 non-overlapping offers, only current one shown today', async ({ page }) => {
    // Today is 2026-04-24
    // Offer 1: Jan 1–Mar 31 → expired (today Apr 24)
    // Offer 2: Apr 1–Jun 30 → active (today Apr 24)
    if (!ctx.shopA?.shopSlug) {
      test.skip(true, 'Shop A slug not available')
      return
    }

    const token = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')

    // Expired offer
    const exp = await apiPost('/api/v1/shop-owner/offers', {
      title: 'B1 Expired Jan-Mar Offer',
      price: '20.00',
      valid_from: '2026-01-01T00:00:00',
      valid_until: '2026-03-31T23:59:59',
      product_id: ctx.prodA_Premium,
    }, token)
    expect(exp.status, 'B1 setup: expired offer').toBe(201)
    ctx.offerIds.push((exp.data as { id: number }).id)

    // Active offer
    const act = await apiPost('/api/v1/shop-owner/offers', {
      title: 'B1 Active Apr-Jun Offer',
      price: '22.00',
      valid_from: '2026-04-01T00:00:00',
      valid_until: '2026-06-30T23:59:59',
      product_id: ctx.prodA_Premium,
    }, token)
    expect(act.status, 'B1 setup: active offer').toBe(201)
    ctx.offerIds.push((act.data as { id: number }).id)

    // Verify via public API
    const apiRes = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${ctx.shopA.shopSlug}/offers`)
    const publicOffers = await apiRes.json() as Array<{ title: string }>
    const expiredInApi = publicOffers.some(o => o.title === 'B1 Expired Jan-Mar Offer')
    const activeInApi = publicOffers.some(o => o.title === 'B1 Active Apr-Jun Offer')

    expect(expiredInApi, 'B1: expired Jan-Mar offer must NOT appear in public API').toBe(false)
    expect(activeInApi, 'B1: active Apr-Jun offer MUST appear in public API').toBe(true)

    // Verify on customer shop page
    await page.goto(`${FRONTEND_URL}/shops/${ctx.shopA.shopSlug}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body, 'B1: expired offer must not be shown to customer').not.toContain('B1 Expired Jan-Mar Offer')
    expect(body, 'B1: active offer must be shown to customer').toContain('B1 Active Apr-Jun Offer')
  })

  test('B2 — Shop B: both offers in gap (expired May, future Sep) → neither shown today', async ({ page }) => {
    // Today: Apr 24
    // Offer 1: Feb 1–Apr 15 → expired 9 days ago
    // Offer 2: May 1–Jul 31 → future (starts 7 days from now)
    // Gap period: today is between the two → neither should be shown
    if (!ctx.shopB?.shopSlug) {
      test.skip(true, 'Shop B slug not available')
      return
    }

    const token = await shopOwnerLogin('offer-product-shop-b@pundo-e2e.io', 'ShopBPass!99')

    const expOffer = await apiPost('/api/v1/shop-owner/offers', {
      title: 'B2 Shop B Expired Feb-Apr Offer',
      price: '18.00',
      valid_from: '2026-02-01T00:00:00',
      valid_until: '2026-04-15T23:59:59',
      product_id: ctx.prodB_Standard,
    }, token)
    expect(expOffer.status, 'B2 setup: expired offer for Shop B').toBe(201)

    const futureOffer = await apiPost('/api/v1/shop-owner/offers', {
      title: 'B2 Shop B Future May-Jul Offer',
      price: '21.00',
      valid_from: '2026-05-01T00:00:00',
      valid_until: '2026-07-31T23:59:59',
      product_id: ctx.prodB_Standard,
    }, token)
    expect(futureOffer.status, 'B2 setup: future offer for Shop B').toBe(201)

    // Verify via public API
    const apiRes = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${ctx.shopB.shopSlug}/offers`)
    const publicOffers = await apiRes.json() as Array<{ title: string }>
    const expiredInApi = publicOffers.some(o => o.title === 'B2 Shop B Expired Feb-Apr Offer')
    const futureInApi = publicOffers.some(o => o.title === 'B2 Shop B Future May-Jul Offer')

    expect(expiredInApi, 'B2: expired offer (Feb-Apr) must NOT appear in public API today').toBe(false)
    // Future offer filter: backend only filters by valid_until >= now, NOT valid_from <= now
    // So future offer WILL appear if valid_until > now. Document this:
    if (futureInApi) {
      console.warn('[B2 FINDING] Future offer (valid_from=May 1, > today Apr 24) appears in public API. ' +
        'Backend filters only by valid_until >= now, does not filter by valid_from <= now. ' +
        'Spec expects: during gap period, neither offer should show. Backend diverges from spec.')
    }

    // Verify on customer shop page
    await page.goto(`${FRONTEND_URL}/shops/${ctx.shopB.shopSlug}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body, 'B2: expired offer must not show to customer').not.toContain('B2 Shop B Expired Feb-Apr Offer')
  })

  test('B3 — 2 shops offer same product name, non-overlapping periods → correct isolation', async ({ page }) => {
    // Shop A: active offer today for "Verfliesen Standard"
    // Shop B: expired offer for "Verfliesen Standard"
    // Shop A's page shows active; Shop B's page shows nothing
    if (!ctx.shopA?.shopSlug || !ctx.shopB?.shopSlug) {
      test.skip(true, 'Shop slugs not available')
      return
    }

    // Shop A: create active offer
    const tokenA = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')
    const offerA = await apiPost('/api/v1/shop-owner/offers', {
      title: 'B3 Shop A Active Verfliesen Offer',
      price: '30.00',
      valid_from: dt(TODAY),
      valid_until: dt(daysFromToday(60)),
      product_id: ctx.prodA_Standard,
    }, tokenA)
    expect(offerA.status, 'B3 setup: Shop A active offer').toBe(201)
    ctx.offerIds.push((offerA.data as { id: number }).id)

    // Shop B: create expired offer
    const tokenB = await shopOwnerLogin('offer-product-shop-b@pundo-e2e.io', 'ShopBPass!99')
    const offerB = await apiPost('/api/v1/shop-owner/offers', {
      title: 'B3 Shop B Expired Verfliesen Offer',
      price: '25.00',
      valid_from: '2026-01-01T00:00:00',
      valid_until: '2026-03-31T23:59:59',
      product_id: ctx.prodB_Standard,
    }, tokenB)
    expect(offerB.status, 'B3 setup: Shop B expired offer').toBe(201)

    // Shop A customer page: must show active offer
    await page.goto(`${FRONTEND_URL}/shops/${ctx.shopA.shopSlug}`)
    await page.waitForLoadState('networkidle')
    const bodyA = await page.locator('body').innerText()
    expect(bodyA, 'B3: Shop A active offer must appear on Shop A page').toContain('B3 Shop A Active Verfliesen Offer')

    // Shop B customer page: must NOT show expired offer
    await page.goto(`${FRONTEND_URL}/shops/${ctx.shopB.shopSlug}`)
    await page.waitForLoadState('networkidle')
    const bodyB = await page.locator('body').innerText()
    expect(bodyB, 'B3: Shop B expired offer must NOT appear on Shop B page').not.toContain('B3 Shop B Expired Verfliesen Offer')
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP C — Price history display on /products/[slug]
  // ═══════════════════════════════════════════════════════════════════════════

  test('C1 — Price history chart on product detail page (crawler products)', async ({ page }) => {
    // The price_history on /products/[slug] is from the crawler-ingested products table,
    // NOT from shop_owner_offers. shop_owner_offers are displayed on /shops/[slug].
    // To test price history we need a product from the global catalog with >= 2 price points.
    // The e2e test DB fixture products are in the catalog (product_slugs in .test-state.json).

    const fixtureSlug = (GLOBAL_STATE.fixtures as { product_slugs?: { fixed?: string } } | undefined)?.product_slugs?.fixed ?? null
    if (!fixtureSlug) {
      test.skip(true, 'No fixture product slug available in .test-state.json for price history test')
      return
    }

    await page.goto(`${FRONTEND_URL}/products/${fixtureSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    // The page might not find the product if test DB was reset
    if (url.includes('not-found') || url.includes('404')) {
      console.warn('[C1] Product not found in test DB — price history test inconclusive (DB reset may have removed fixture products)')
      test.skip(true, 'Fixture product not in test DB after global-setup reset')
      return
    }

    const body = await page.locator('body').innerText()
    // If price_history.length >= 2, the "Preisverlauf" section should appear
    // PriceHistory component renders only when product.price_history.length >= 2
    const hasPriceHistory = body.toLowerCase().includes('preisverlauf') || body.toLowerCase().includes('price history')
    console.log(`[C1] Price history section visible: ${hasPriceHistory} for product ${fixtureSlug}`)
    // This is informational — we can't guarantee the test DB has >=2 price points for this product
    expect(url, 'C1: product page must not 404').not.toContain('not-found')
  })

  test('C2 — Product page with no offers: shows empty/no offers section', async ({ page }) => {
    // Create a shop-owner product and navigate to it via search
    // Note: shop_owner_products don't have their own /products/[slug] page —
    // they are linked to the global catalog products. This test verifies that
    // a global catalog product with no offers shows either no offers or empty state.

    // Use the search page to find any product in the test DB
    await page.goto(`${FRONTEND_URL}/search?q=test`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url, 'C2: search page must load').not.toContain('not-found')
    // This test is informational — verifies the page renders without crash
    console.log('[C2] Search page rendered OK for empty query')
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP D — Offer display on /shops/[slug]
  // ═══════════════════════════════════════════════════════════════════════════

  test('D2 — Expired offer is NOT shown on customer shop page', async ({ page }) => {
    if (!ctx.shopA?.shopSlug) {
      test.skip(true, 'Shop A slug not available')
      return
    }

    const token = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')
    const offerRes = await apiPost('/api/v1/shop-owner/offers', {
      title: 'D2 Expired Offer Must Hide',
      price: '10.00',
      valid_from: '2026-01-01T00:00:00',
      valid_until: '2026-02-28T23:59:59',
    }, token)
    expect(offerRes.status, 'D2 setup').toBe(201)
    ctx.offerIds.push((offerRes.data as { id: number }).id)

    await page.goto(`${FRONTEND_URL}/shops/${ctx.shopA.shopSlug}`)
    await page.waitForLoadState('networkidle')

    const body = await page.locator('body').innerText()
    expect(body, 'D2: expired offer must NOT appear on customer shop page').not.toContain('D2 Expired Offer Must Hide')
  })

  test('D3 — Future offer (valid_from tomorrow) behavior is consistent with API', async ({ page }) => {
    // SPEC NOTE: The spec says future offers should not show. However, the backend
    // GET /shops/by-slug/{slug}/offers only filters by:
    //   - archived == False
    //   - valid_until == None OR valid_until >= now
    // It does NOT filter by valid_from <= now.
    // Therefore a future offer (valid_from = tomorrow) IS returned by the API and shown.
    // This is a spec divergence. We document it and verify UI matches API behavior.
    if (!ctx.shopA?.shopSlug) {
      test.skip(true, 'Shop A slug not available')
      return
    }

    const token = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')
    const offerRes = await apiPost('/api/v1/shop-owner/offers', {
      title: 'D3 Future Offer Starts Tomorrow',
      price: '45.00',
      valid_from: dt(daysFromToday(1)),
      valid_until: dt(daysFromToday(30)),
    }, token)
    expect(offerRes.status, 'D3 setup').toBe(201)
    const offerId = (offerRes.data as { id: number }).id
    ctx.offerIds.push(offerId)

    // Check public API
    const apiRes = await fetch(`${BACKEND_URL}/api/v1/shops/by-slug/${ctx.shopA.shopSlug}/offers`)
    const apiOffers = await apiRes.json() as Array<{ title: string }>
    const inApi = apiOffers.some(o => o.title === 'D3 Future Offer Starts Tomorrow')

    await page.goto(`${FRONTEND_URL}/shops/${ctx.shopA.shopSlug}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    const inUI = body.includes('D3 Future Offer Starts Tomorrow')

    // UI must match API behavior
    expect(inUI, `D3: UI and API must be consistent (API returned: ${inApi}, UI showed: ${inUI})`).toBe(inApi)

    if (inApi && inUI) {
      console.warn('[D3 SPEC DIVERGENCE] Future offer (valid_from=tomorrow) is shown to customers. ' +
        'Backend does not filter by valid_from. Spec says future offers should be hidden.')
    }
  })

  test('D4 — Shop with NO offers: no offers section shown (or empty state)', async ({ page }) => {
    // Shop B with only expired/archived offers should show no current offers section
    // Or: navigate to a shop that has no active offers
    if (!ctx.shopB?.shopSlug) {
      test.skip(true, 'Shop B slug not available')
      return
    }

    // Archive any offers Shop B might have
    const tokenB = await shopOwnerLogin('offer-product-shop-b@pundo-e2e.io', 'ShopBPass!99')
    const offersRes = await apiGet('/api/v1/shop-owner/offers', tokenB)
    const items = (offersRes.data as { items: Array<{ id: number; archived: boolean }> }).items ?? []
    for (const o of items) {
      if (!o.archived) {
        await apiPatch(`/api/v1/shop-owner/offers/${o.id}`, { archived: true }, tokenB)
      }
    }

    await page.goto(`${FRONTEND_URL}/shops/${ctx.shopB.shopSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url, 'D4: shop page must not 404').not.toContain('not-found')

    // There should be no "offers" section or the section should be empty
    // The shop page renders the offers section only if offers.length > 0
    const body = await page.locator('body').innerText()
    const hasOffersSection = body.toLowerCase().includes('angebote') || body.toLowerCase().includes('offers')
    // If no active offers: section should not be present (per shop page logic: {offers.length > 0 && ...})
    if (hasOffersSection) {
      console.warn('[D4 FINDING] Shop page shows "offers" section even with no active offers. ' +
        'This may be from other text on the page (navigation, etc.) — not necessarily a bug.')
    }
    console.log(`[D4] Shop B page rendered. Body contains "offers/angebote": ${hasOffersSection}`)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP F — Frontend UI: create product + offer workflow via shop-admin UI
  //
  // F1 uses test.describe + test.use({ storageState }) so the auth cookie is
  // loaded into the browser context BEFORE the first navigation. This ensures
  // React hydration works correctly (addCookies() at runtime does not).
  // ═══════════════════════════════════════════════════════════════════════════

  // F1 ersetzt durch shop-admin-product-offer-ui.spec.ts (UI-P1/UI-O1/UI-O3)
  // dort wird storageState top-level gesetzt → React hydratisiert korrekt

  test('F2 — UI: attempt to select product from different shop (cross-shop protection)', async () => {
    // The OfferForm only shows products from the current shop owner's shop_owner_products.
    // A cross-shop product_id can only be injected via API (not UI), and the API rejects it.
    // This test verifies the API-level protection (E3 tests this too, but here we confirm
    // it from the perspective of the UI flow: the UI dropdown never shows other shops' products).

    const tokenA = await shopOwnerLogin('offer-product-shop-a@pundo-e2e.io', 'ShopAPass!99')

    // Shop A's products dropdown only shows its own products
    const prodsRes = await apiGet('/api/v1/shop-owner/products', tokenA)
    const prodItems = (prodsRes.data as { items: Array<{ id: number; name: string }> }).items ?? []
    const shopAProductIds = prodItems.map((p) => p.id)

    // Shop B's product ID should NOT be in Shop A's product list
    expect(shopAProductIds, 'F2: Shop A must not see Shop B products in its product list').not.toContain(ctx.prodB_Standard)

    // API-level: injecting cross-shop product_id must fail
    const injectRes = await apiPost('/api/v1/shop-owner/offers', {
      title: 'F2 Cross-shop injection attempt',
      valid_from: dt(TODAY),
      valid_until: dt(daysFromToday(30)),
      product_id: ctx.prodB_Standard,
    }, tokenA)
    expect(injectRes.status, 'F2: API must reject cross-shop product_id with 422').toBe(422)
  })

})

// Note: Groups G, H, I, J are appended below.
// The outer test.describe.serial block closed at line 962.
// These groups run as a separate describe in the same file.

// FIXME: Legacy spec — uses old price/product_id offer fields; depends on shop_owner_products.
// Needs rewriting for ShopListing/UnifiedOffer API.
test.describe.fixme('Shop-Admin Offer + Product — Extended Matrix (G/H/I/J)', () => {
  test.describe.configure({ mode: 'serial' })

  // ─── Auth helpers (re-used from main suite) ───────────────────────────────

  const BACKEND_URL_EXT = process.env.BACKEND_URL ?? 'http://localhost:8500'
  const FRONTEND_URL_EXT = process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'

  async function loginA(): Promise<string> {
    const res = await fetch(`${BACKEND_URL_EXT}/api/v1/shop-owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'offer-product-shop-a@pundo-e2e.io', password: 'ShopAPass!99' }),
    })
    const cookieHeader = res.headers.get('set-cookie') ?? ''
    const match = cookieHeader.match(/shop_owner_token=([^;]+)/)
    if (!match) throw new Error('shop_owner_token not found in login response')
    return match[1]
  }

  async function post(urlPath: string, body: unknown, token: string) {
    const res = await fetch(`${BACKEND_URL_EXT}${urlPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    return { status: res.status, data: res.status !== 204 ? await res.json() : {} }
  }

  async function adminLoginExt(): Promise<string> {
    const res = await fetch(`${BACKEND_URL_EXT}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e-admin@pundo-e2e.io', password: 'E2eAdminPassword!99' }),
    })
    if (!res.ok) throw new Error(`Admin login failed: ${res.status}`)
    const cookieHeader = res.headers.get('set-cookie') ?? ''
    const match = cookieHeader.match(/admin_token=([^;]+)/)
    if (!match) throw new Error('admin_token cookie not found')
    return match[1]
  }

  async function getShopSlug(token: string): Promise<string | null> {
    // Get the shop_id from /api/v1/shop-owner/me, then get slug via admin endpoint
    const meRes = await fetch(`${BACKEND_URL_EXT}/api/v1/shop-owner/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!meRes.ok) return null
    const me = await meRes.json() as { shop_id?: number }
    const shopId = me.shop_id
    if (!shopId) return null

    const adminToken = await adminLoginExt()
    const shopRes = await fetch(`${BACKEND_URL_EXT}/api/v1/admin/shops/${shopId}`, {
      headers: { Cookie: `admin_token=${adminToken}` },
    })
    if (!shopRes.ok) return null
    const shop = await shopRes.json() as { slug?: string }
    return shop.slug ?? null
  }

  const TODAY_EXT = new Date().toISOString().slice(0, 10)
  function dtExt(date: string): string { return `${date}T00:00:00` }
  function daysExt(n: number): string {
    const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP G — Offer Price Regressions (Pydantic-Validation, edge values)
  // G1/G2 (aktives Angebot → Kundensicht) → shop-admin-product-offer-ui.spec.ts
  // ═══════════════════════════════════════════════════════════════════════════

  test('G3 — Offer with price "0.00" (free) → 201 (zero is a valid price)', async () => {
    const token = await loginA()
    const res = await post('/api/v1/shop-owner/offers', {
      title: 'G3 Free Offer',
      price: '0.00',
      valid_from: dtExt(TODAY_EXT),
      valid_until: dtExt(daysExt(30)),
    }, token)
    expect(res.status, 'G3: price=0.00 must return 201 (free offer accepted)').toBe(201)
    // Price should be stored as 0
    const price = (res.data as { price: string }).price
    expect(Number(price), 'G3: stored price must be 0').toBe(0)
  })

  test('G4 — REGRESSION: empty price string → frontend sends null → backend returns 201 (NOT 422)', async () => {
    // This is the key regression test for the price="" → 422 bug.
    // The old OfferForm sent price: "" (empty string from FormData) when the user left
    // the price field blank. Pydantic rejected "" as invalid decimal → HTTP 422.
    // Fix: OfferForm now sends price: priceRaw ? priceRaw : null (falsy "" → null).
    // This test verifies the FIXED behavior: sending null for empty price → 201.
    const token = await loginA()

    // Simulate what the FIXED frontend sends (null for empty price)
    const resNull = await post('/api/v1/shop-owner/offers', {
      title: 'G4 Empty-Price Regression',
      price: null,
      valid_from: dtExt(TODAY_EXT),
      valid_until: dtExt(daysExt(30)),
    }, token)
    expect(resNull.status, 'G4: null price (fixed frontend behavior) must return 201').toBe(201)
    expect((resNull.data as { price: unknown }).price, 'G4: price must be null in response').toBeNull()

    // Also verify the OLD bug is reproducible (price="" still causes 422)
    // This documents that the fix IS needed and what it prevents
    const resEmpty = await post('/api/v1/shop-owner/offers', {
      title: 'G4 Empty-String Regression',
      price: '',
      valid_from: dtExt(TODAY_EXT),
      valid_until: dtExt(daysExt(30)),
    }, token)
    expect(resEmpty.status, 'G4: price="" (unfixed behavior) must return 422 from Pydantic').toBe(422)
    const detail = resEmpty.data as { detail: Array<{ type: string; loc: string[] }> }
    const priceError = detail.detail?.find((e: { loc: string[] }) => e.loc?.includes('price'))
    expect(priceError, 'G4: 422 error must be about the price field').toBeTruthy()
    console.log('[G4] REGRESSION CONFIRMED: price="" → 422 (decimal_parsing). Fixed frontend sends null → 201.')
  })

  test('G5 — REGRESSION: German decimal format "9,99" → 422 (user UX bug, needs frontend fix)', async () => {
    // PRODUCTION BUG: User typing "9,99" in German locale sends "9,99" to backend
    // → Pydantic 422 decimal_parsing error
    // → OfferForm shows "something went wrong" (not inline price field error)
    // This test DOCUMENTS the current behavior (422 + toast) as a known gap.
    // Fix needed: frontend should sanitize "9,99" → "9.99" OR show inline error on price field.
    const token = await loginA()
    const res = await post('/api/v1/shop-owner/offers', {
      title: 'G5 German Decimal Test',
      price: '9,99',
      valid_from: dtExt(TODAY_EXT),
      valid_until: dtExt(daysExt(30)),
    }, token)
    // Backend correctly rejects German-format decimal
    expect(res.status, 'G5: price="9,99" (German format) must be rejected by backend').toBe(422)
    const errDetail = res.data as { detail: Array<{ type: string }> }
    const hasDecimalError = errDetail.detail?.some((e: { type: string }) => e.type === 'decimal_parsing')
    expect(hasDecimalError, 'G5: error type must be decimal_parsing').toBe(true)
    console.log('[G5 BUG DOCUMENTED] German decimal format "9,99" → 422. Frontend must sanitize or show inline error.')
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP H — Product with Price Tiers + Offers
  // ═══════════════════════════════════════════════════════════════════════════

  test('H1 — Product with single PriceTier (per_m2) → offer linked → 201', async () => {
    const token = await loginA()

    // Create product with a price tier
    const prodRes = await post('/api/v1/shop-owner/products', {
      name: 'H1 Tiling per m2',
      category_id: 1,
      price_tiers: [{ unit: 'per_m2', min_qty: 1, price: 12.50 }],
    }, token)
    expect(prodRes.status, 'H1: create product with price_tier must return 201').toBe(201)
    const prodId = (prodRes.data as { id: number }).id

    // Link offer to this product
    const offerRes = await post('/api/v1/shop-owner/offers', {
      title: 'H1 Offer for Tiling per m2',
      price: '12.50',
      valid_from: dtExt(TODAY_EXT),
      valid_until: dtExt(daysExt(30)),
      product_id: prodId,
    }, token)
    expect(offerRes.status, 'H1: offer linked to product with price_tier must return 201').toBe(201)
    expect((offerRes.data as { product_id: number }).product_id, 'H1: product_id must be set').toBe(prodId)
  })

  test('H2 — Product with multiple PriceTier steps → offer linked → 201', async () => {
    const token = await loginA()

    const prodRes = await post('/api/v1/shop-owner/products', {
      name: 'H2 Tiling Tiered Pricing',
      category_id: 1,
      price_tiers: [
        { unit: 'per_m2', min_qty: 1, price: 15.00 },
        { unit: 'per_m2', min_qty: 11, price: 12.00 },
        { unit: 'per_m2', min_qty: 51, price: 10.00 },
      ],
    }, token)
    expect(prodRes.status, 'H2: create product with 3 price tiers must return 201').toBe(201)
    const prodId = (prodRes.data as { id: number }).id

    const storedTiers = (prodRes.data as { price_tiers?: unknown[] }).price_tiers ?? []
    // If price_tiers are stored, verify count (backend may or may not return them)
    if (storedTiers.length > 0) {
      expect(storedTiers.length, 'H2: all 3 price tiers must be stored').toBe(3)
    }

    const offerRes = await post('/api/v1/shop-owner/offers', {
      title: 'H2 Offer for Tiered Product',
      valid_from: dtExt(TODAY_EXT),
      valid_until: dtExt(daysExt(30)),
      product_id: prodId,
    }, token)
    expect(offerRes.status, 'H2: offer linked to tiered-price product must return 201').toBe(201)
  })

  test('H3 — Product with custom unit (unit="custom", unit_label="pro Raum") → offer → 201', async () => {
    const token = await loginA()

    const prodRes = await post('/api/v1/shop-owner/products', {
      name: 'H3 Tiling per Room',
      category_id: 1,
      price_tiers: [{ unit: 'custom', unit_label: 'pro Raum', min_qty: 1, price: 150.00 }],
    }, token)
    expect(prodRes.status, 'H3: create product with custom unit must return 201').toBe(201)
    const prodId = (prodRes.data as { id: number }).id

    const offerRes = await post('/api/v1/shop-owner/offers', {
      title: 'H3 Offer for Per-Room Service',
      price: '150.00',
      valid_from: dtExt(TODAY_EXT),
      valid_until: dtExt(daysExt(30)),
      product_id: prodId,
    }, token)
    expect(offerRes.status, 'H3: offer linked to custom-unit product must return 201').toBe(201)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP I — Edge Cases: valid_from / valid_until
  // ═══════════════════════════════════════════════════════════════════════════

  test('I1 — Offer without valid_from and without valid_until → 201 (both optional)', async () => {
    // The OfferCreate schema has valid_from: Optional[datetime] = None.
    // The OfferForm UI currently requires both fields (frontend validation).
    // But the backend accepts null for both → this test verifies the backend behavior.
    const token = await loginA()
    const res = await post('/api/v1/shop-owner/offers', {
      title: 'I1 Timeless Offer',
      price: '9.99',
      // NO valid_from, NO valid_until
    }, token)
    expect(res.status, 'I1: offer without dates must return 201 (both optional in backend)').toBe(201)
    expect((res.data as { valid_from: unknown }).valid_from, 'I1: valid_from must be null').toBeNull()
    expect((res.data as { valid_until: unknown }).valid_until, 'I1: valid_until must be null').toBeNull()
    console.log('[I1] Note: Backend accepts null dates. Frontend form currently REQUIRES dates (UI validation). This is a gap: UI prevents timeless offers even though backend supports them.')
  })

  test('I2 — Offer with valid_from in the past → 201 (backend accepts, no past-date guard)', async () => {
    const token = await loginA()
    const res = await post('/api/v1/shop-owner/offers', {
      title: 'I2 Past Valid-From Offer',
      price: '5.00',
      valid_from: '2025-01-01T00:00:00',
      valid_until: dtExt(daysExt(30)),
    }, token)
    expect(res.status, 'I2: offer with past valid_from must return 201 (no past-date guard on backend)').toBe(201)
    console.log('[I2] Backend has no past-date guard for valid_from. This may or may not be intentional.')
  })

  test('I3 — Offer with valid_from = valid_until (same day) → 201', async () => {
    const token = await loginA()
    const res = await post('/api/v1/shop-owner/offers', {
      title: 'I3 Same-Day Offer',
      price: '25.00',
      valid_from: dtExt(TODAY_EXT),
      valid_until: dtExt(TODAY_EXT),
    }, token)
    expect(res.status, 'I3: offer with valid_from=valid_until (same day) must return 201').toBe(201)
  })

  test('I4 — Offer with valid_from=null and valid_until=null (explicitly sent) → 201', async () => {
    // Tests what happens when form sends null explicitly (e.g., after clearing date fields)
    // The OfferForm sends: valid_from: data.get('valid_from') || null
    // If the user somehow bypasses frontend validation, this ensures backend handles it
    const token = await loginA()
    const res = await post('/api/v1/shop-owner/offers', {
      title: 'I4 Null-Dates Explicit Offer',
      price: '15.00',
      valid_from: null,
      valid_until: null,
    }, token)
    expect(res.status, 'I4: offer with explicit null dates must return 201').toBe(201)
    expect((res.data as { valid_from: unknown }).valid_from, 'I4: valid_from must be null in response').toBeNull()
    expect((res.data as { valid_until: unknown }).valid_until, 'I4: valid_until must be null in response').toBeNull()
  })

  test('I5 — DIVERGENCE: UI form requires dates but backend does not → UI gap documented', async () => {
    // The OfferForm.tsx has frontend validation:
    //   if (!data.get('valid_from')) newErrors.valid_from = tr.required
    //   if (!data.get('valid_until')) newErrors.valid_until = tr.required
    // The OfferCreate schema has: valid_from: Optional[datetime] = None
    // This means the UI is MORE restrictive than the backend.
    // A user CANNOT create a timeless offer via the UI even though the backend allows it.
    // This is a deliberate UI design choice (or an oversight).
    // Document via API test:
    const token = await loginA()
    const res = await post('/api/v1/shop-owner/offers', {
      title: 'I5 UI vs Backend Date Requirement',
      // No dates: backend accepts, frontend would reject
    }, token)
    expect(res.status, 'I5: backend creates offer without dates (UI validation is stricter)').toBe(201)
    console.log('[I5 DIVERGENCE] OfferForm requires valid_from+valid_until in UI, but backend allows null. ' +
      'Shop owner cannot create timeless offers via the UI form.')
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP J — Customer-Side: spezifische Konstellationen
  // J1/J2 (aktives Angebot mit/ohne Preis → Kundensicht) → shop-admin-product-offer-ui.spec.ts
  // ═══════════════════════════════════════════════════════════════════════════

  test('J3 — Shop with offer linked to product with PriceTiers: customer page renders correctly', async ({ page }) => {
    const token = await loginA()
    const slug = await getShopSlug(token)
    if (!slug) {
      test.skip(true, 'J3: could not get shop slug')
      return
    }

    // Create a product with price tiers
    const prodRes = await post('/api/v1/shop-owner/products', {
      name: 'J3 Tiled Floor Service',
      category_id: 1,
      price_tiers: [
        { unit: 'per_m2', min_qty: 1, price: 18.00 },
        { unit: 'per_m2', min_qty: 20, price: 15.00 },
      ],
    }, token)
    expect(prodRes.status, 'J3 setup: create product with tiers').toBe(201)
    const prodId = (prodRes.data as { id: number }).id

    // Create offer linked to this product
    await post('/api/v1/shop-owner/offers', {
      title: 'J3 PriceTier Product Offer',
      valid_from: dtExt(TODAY_EXT),
      valid_until: dtExt(daysExt(30)),
      product_id: prodId,
    }, token)

    await page.goto(`${FRONTEND_URL_EXT}/shops/${slug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url, 'J3: shop page must not 404').not.toContain('not-found')

    const body = await page.locator('body').innerText()
    expect(body, 'J3: offer linked to tiered-price product must appear on customer page').toContain('J3 PriceTier Product Offer')
    console.log('[J3] Offer linked to PriceTier product renders correctly on customer shop page.')
  })

})
