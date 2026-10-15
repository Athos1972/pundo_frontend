/**
 * F4100 Favoriten-Fixes — E2E-Tests
 * ACs aus 01-design.md: 1-3 (Fix a), 5-7 (Fix b), 8-10 (Fix c)
 */

import { waitForPageHydrated, clickHydrated } from './journeys/_helpers/hydration'
import { test, expect } from './fixtures'
import { BASE_URL, BACKEND_URL } from './env'


if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

// F8950 T31: kein fester Prod-Kopie-Slug mehr. Das Produkt wird im beforeAll per API in einem eigenen Spec-Shop
// angelegt (Marker-Item + Listing + Angebot) und im afterAll samt Shop geloescht.
let PRODUCT_SLUG = ''

// Customer credentials — register fresh per run
import { randomUUID } from 'crypto'
import { RUN_ID } from './journeys/_helpers/test-data'
import { specShop, type WorkerShop } from './journeys/_helpers/worker-shop'
const UUID = randomUUID().slice(0, 8)
// B8950-012: Marker-Konvention e2e-<run>-… (verankerter Selektor für das Cleanup-Skript)
const CUSTOMER_EMAIL = `e2e-${RUN_ID}-favtest-${UUID}@pundo.com`
const CUSTOMER_PASSWORD = 'FavTestPw!99'

async function customerApi(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) {
  const res = await fetch(`${BACKEND_URL}/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  })
  const setCookie = res.headers.get('set-cookie') ?? ''
  const tokenMatch = setCookie.match(/customer_token=([^;]+)/)
  const cookieToken = tokenMatch ? tokenMatch[1] : null
  return {
    status: res.status,
    data: res.status !== 204 ? await res.json().catch(() => null) : null,
    cookieToken,
  }
}

// Shared state
let shop: WorkerShop | undefined
const ctx = {
  customerId: null as number | null,
  customerToken: null as string | null,  // raw JWT value from cookie
  firstItemId: null as number | null,
}

// ─── Setup: Register + verify customer ─────────────────────────────────────

test.beforeAll(async () => {
  // Seed: Produkt mit Listing und Festpreis-Angebot im eigenen Spec-Shop
  shop = await specShop('FAVORITEN')
  const item = await shop.createItem('FAVORITEN', 'heart', { listing: true })
  const offer = await shop.api('POST', '/offers', {
    shop_listing_id: item.listingId, price_type: 'fixed',
    price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 4.5, currency: 'EUR' }] }],
  })
  expect(offer.status, offer.text).toBe(201)
  PRODUCT_SLUG = item.slug

  // Register — @pundo.com emails are auto-verified (no OTP needed)
  const regRes = await customerApi('POST', '/customer/auth/signup', {
    email: CUSTOMER_EMAIL,
    password: CUSTOMER_PASSWORD,
    display_name: `FavTest-${UUID}`,
  })
  ctx.customerId = regRes.data?.id ?? null

  // Login — returns customer_token as Set-Cookie
  const loginRes = await customerApi('POST', '/customer/auth/login', {
    email: CUSTOMER_EMAIL,
    password: CUSTOMER_PASSWORD,
  })
  ctx.customerToken = loginRes.cookieToken

  // Item-ID fuer die Favoriten-API-Tests: das Seed-Item
  ctx.firstItemId = item.id
})

test.afterAll(async () => {
  await shop?.destroy()
  // Best-effort cleanup
  if (ctx.customerToken && ctx.customerId) {
    await customerApi('DELETE', '/customer/auth/account', undefined, {
      Cookie: `customer_token=${ctx.customerToken}`,
    }).catch(() => {})
  }
})

// ─── Helper: inject customer_token cookie into browser ─────────────────────

async function withCustomerAuth(page: import('@playwright/test').Page) {
  if (!ctx.customerToken) return
  await page.context().addCookies([{
    name: 'customer_token',
    value: ctx.customerToken,
    domain: new URL(BASE_URL).hostname,
    path: '/',
    httpOnly: true,
    secure: false,
  }])
}

// ═══════════════════════════════════════════════════════════════════════════
// Fix a: Herz auf Produktdetailseite
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Fix a: FavoriteButton im Produkt-Hero', () => {

  test('AC1: Herz-Button im Hero sichtbar (anon)', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/products/${PRODUCT_SLUG}`)

    // Hero-specific: FavoriteButton neben H1 (size="md" → p-2)
    const heroBtn = page.locator('h1:visible').locator('..').locator('button[aria-pressed]')
    await expect(heroBtn).toBeVisible()
    // Und das ist der einzige Button direkt neben dem H1 (nicht im Carousel)
    const heroParent = page.locator('.flex.items-start.justify-between:visible').first()
    await expect(heroParent.locator('h1')).toBeVisible()
    await expect(heroParent.locator('button[aria-pressed]')).toBeVisible()
  })

  test('AC2: Angemeldeter User — Herz togglet Favorit', async ({ page }) => {
    if (!ctx.customerToken) {
      test.skip(true, 'Kein Customer-Token — Auth-Setup übersprungen')
      return
    }
    await withCustomerAuth(page)
    await page.goto(`${BASE_URL}/en/products/${PRODUCT_SLUG}`)
    await waitForPageHydrated(page)

    const heroParent = page.locator('.flex.items-start.justify-between:visible').first()
    const heroBtn = heroParent.locator('button[aria-pressed]')
    await expect(heroBtn).toBeVisible()
    const initialPressed = await heroBtn.getAttribute('aria-pressed')
    // Toggle
    await clickHydrated(heroBtn)
    // F8950 T22: statt waitForTimeout(500) auf den Zustandswechsel warten
    await expect.poll(() => heroBtn.getAttribute('aria-pressed')).not.toBe(initialPressed)
  })

  test('AC3: Anon → Klick auf Herz → Redirect zu /auth/login', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/products/${PRODUCT_SLUG}`)
    await waitForPageHydrated(page)

    const heroParent = page.locator('.flex.items-start.justify-between:visible').first()
    const heroBtn = heroParent.locator('button[aria-pressed]')
    await heroBtn.click()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

})

// ═══════════════════════════════════════════════════════════════════════════
// Fix b: Kein /products/undefined aus My Favorites
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Fix b: Korrekter Produktlink aus Favoriten-Liste', () => {

  test('AC6: GET /favorites liefert product_slug (kein undefined)', async () => {
    if (!ctx.customerToken || !ctx.firstItemId) {
      test.skip(true, 'Kein Token oder Item-ID')
      return
    }
    // Add a favorite via API
    await customerApi('POST', `/customer/favorites/${ctx.firstItemId}`, undefined, {
      Cookie: `customer_token=${ctx.customerToken}`,
    })
    // Fetch favorites list
    const listRes = await customerApi('GET', '/customer/favorites', undefined, {
      Cookie: `customer_token=${ctx.customerToken}`,
    })
    expect(listRes.status).toBe(200)
    const items = listRes.data?.items ?? []
    expect(items.length).toBeGreaterThan(0)
    // Every item must have a non-empty product_slug
    for (const item of items) {
      expect(item.product_slug).toBeTruthy()
      expect(item.product_slug).not.toBe('undefined')
      expect(item.product_slug).not.toBe('null')
      expect(typeof item.product_slug).toBe('string')
    }
    // Cleanup
    await customerApi('DELETE', `/customer/favorites/${ctx.firstItemId}`, undefined, {
      Cookie: `customer_token=${ctx.customerToken}`,
    })
  })

  test('AC7: /account — kein Link auf /products/undefined', async ({ page }) => {
    if (!ctx.customerToken || !ctx.firstItemId) {
      test.skip(true, 'Kein Token oder Item-ID')
      return
    }
    // Add favorite
    await customerApi('POST', `/customer/favorites/${ctx.firstItemId}`, undefined, {
      Cookie: `customer_token=${ctx.customerToken}`,
    })
    await withCustomerAuth(page)
    // Navigate directly to /account/favorites (Fix c — eigene Route) statt Tab-Klick
    // der durch das Sprachauswahl-Modal blockiert werden kann
    await page.goto(`${BASE_URL}/account/favorites`)
    await waitForPageHydrated(page)

    // No /products/undefined links
    const badLinks = page.locator('a[href*="/products/undefined"], a[href*="/products/null"]')
    await expect(badLinks).toHaveCount(0)

    // Product links should contain valid slug
    const productLinks = page.locator('a[href*="/products/"]')
    const count = await productLinks.count()
    if (count > 0) {
      const href = await productLinks.first().getAttribute('href')
      expect(href).toMatch(/\/products\/[a-z0-9][a-z0-9\-]+$/)
    }
    // Cleanup
    await customerApi('DELETE', `/customer/favorites/${ctx.firstItemId}`, undefined, {
      Cookie: `customer_token=${ctx.customerToken}`,
    })
  })

})

// ═══════════════════════════════════════════════════════════════════════════
// Fix c: My Favorites Direktlink im Dropdown + eigene Route
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Fix c: My Favorites Dropdown + /account/favorites Route', () => {

  test('AC8: My Favorites im User-Dropdown sichtbar', async ({ page }) => {
    if (!ctx.customerToken) {
      test.skip(true, 'Kein Token')
      return
    }
    await withCustomerAuth(page)
    await page.goto(`${BASE_URL}/en/`)
    await waitForPageHydrated(page)

    const userMenuBtn = page.locator('button[aria-haspopup="true"]')
    await expect(userMenuBtn).toBeVisible()
    await userMenuBtn.click()

    const favLink = page.locator('[role="menu"] a[href="/account/favorites"]')
    await expect(favLink).toBeVisible()
  })

  test('AC9a: Klick auf My Favorites → /account/favorites', async ({ page }) => {
    if (!ctx.customerToken) {
      test.skip(true, 'Kein Token')
      return
    }
    await withCustomerAuth(page)
    await page.goto(`${BASE_URL}/en/`)
    await waitForPageHydrated(page)

    const userMenuBtn = page.locator('button[aria-haspopup="true"]')
    await userMenuBtn.click()
    const favLink = page.locator('[role="menu"] a[href="/account/favorites"]')
    await favLink.click()
    await expect(page).toHaveURL(/\/account\/favorites/)
  })

  test('T0b: /account/favorites zeigt FavoritesTab sofort', async ({ page }) => {
    if (!ctx.customerToken) {
      test.skip(true, 'Kein Token')
      return
    }
    await withCustomerAuth(page)
    await page.goto(`${BASE_URL}/account/favorites`)
    await waitForPageHydrated(page)

    expect(page.url()).toContain('/account/favorites')
    // getByRole: waehrend des Streamings liegt kurz eine versteckte Kopie (<div hidden id="S:0">) im DOM (F8950 T22)
    const heading = page.getByRole('heading', { name: /Favorites|Favoriten|Избранн|Αγαπημέν|مفضل|מועדפ/ })
    await expect(heading).toBeVisible()
  })

  test('AC10: My Favorites Link korrekt für alle Sprachen (Translations)', async () => {
    // Verify the favorites_tab key exists for all 6 languages in translations
    // This is a static check (no browser needed)
    const { execSync } = await import('child_process')
    const result = execSync('grep -c "favorites_tab" src/lib/i18n/community.ts', {
      cwd: process.cwd(),
      encoding: 'utf-8',
    }).trim()
    // Should have at least 6 entries (one per language block)
    expect(parseInt(result)).toBeGreaterThanOrEqual(6)
  })

})
