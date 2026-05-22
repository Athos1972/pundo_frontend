/**
 * F4100 Favoriten-Fixes — E2E-Tests
 * ACs aus 01-design.md: 1-3 (Fix a), 5-7 (Fix b), 8-10 (Fix c)
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3500'
const BACKEND_URL = process.env.TEST_BACKEND_URL ?? 'http://localhost:8500'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

// Known product slug from pundo_test
const PRODUCT_SLUG = 'schesir-schesir-cat-baby-kitten-salmon-chicken-mousse-pouch-12x70gr'

// Customer credentials — register fresh per run
import { randomUUID } from 'crypto'
const UUID = randomUUID().slice(0, 8)
const CUSTOMER_EMAIL = `fav-test-${UUID}@pundo.com`
const CUSTOMER_PASSWORD = 'FavTestPw!99'

async function apiFetch(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) {
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
const ctx = {
  customerId: null as number | null,
  customerToken: null as string | null,  // raw JWT value from cookie
  firstItemId: null as number | null,
}

// ─── Setup: Register + verify customer ─────────────────────────────────────

test.beforeAll(async () => {
  // Register — @pundo.com emails are auto-verified (no OTP needed)
  const regRes = await apiFetch('POST', '/customer/auth/signup', {
    email: CUSTOMER_EMAIL,
    password: CUSTOMER_PASSWORD,
    display_name: `FavTest-${UUID}`,
  })
  ctx.customerId = regRes.data?.id ?? null

  // Login — returns customer_token as Set-Cookie
  const loginRes = await apiFetch('POST', '/customer/auth/login', {
    email: CUSTOMER_EMAIL,
    password: CUSTOMER_PASSWORD,
  })
  ctx.customerToken = loginRes.cookieToken

  // Get first available item ID
  const itemsRes = await apiFetch('GET', '/products?limit=1')
  ctx.firstItemId = itemsRes.data?.items?.[0]?.id ?? itemsRes.data?.[0]?.id ?? null
})

test.afterAll(async () => {
  // Best-effort cleanup
  if (ctx.customerToken && ctx.customerId) {
    await apiFetch('DELETE', '/customer/auth/account', undefined, {
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
    domain: 'localhost',
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
    await page.waitForLoadState('networkidle')

    // Hero-specific: FavoriteButton neben H1 (size="md" → p-2)
    const heroBtn = page.locator('h1').locator('..').locator('button[aria-pressed]')
    await expect(heroBtn).toBeVisible()
    // Und das ist der einzige Button direkt neben dem H1 (nicht im Carousel)
    const heroParent = page.locator('.flex.items-start.justify-between').first()
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
    await page.waitForLoadState('networkidle')

    const heroParent = page.locator('.flex.items-start.justify-between').first()
    const heroBtn = heroParent.locator('button[aria-pressed]')
    await expect(heroBtn).toBeVisible()
    const initialPressed = await heroBtn.getAttribute('aria-pressed')
    // Toggle
    await heroBtn.click()
    await page.waitForTimeout(500)
    const afterPressed = await heroBtn.getAttribute('aria-pressed')
    expect(afterPressed).not.toBe(initialPressed)
  })

  test('AC3: Anon → Klick auf Herz → Redirect zu /auth/login', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/products/${PRODUCT_SLUG}`)
    await page.waitForLoadState('networkidle')

    const heroParent = page.locator('.flex.items-start.justify-between').first()
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
    await apiFetch('POST', `/customer/favorites/${ctx.firstItemId}`, undefined, {
      Cookie: `customer_token=${ctx.customerToken}`,
    })
    // Fetch favorites list
    const listRes = await apiFetch('GET', '/customer/favorites', undefined, {
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
    await apiFetch('DELETE', `/customer/favorites/${ctx.firstItemId}`, undefined, {
      Cookie: `customer_token=${ctx.customerToken}`,
    })
  })

  test('AC7: /account — kein Link auf /products/undefined', async ({ page }) => {
    if (!ctx.customerToken || !ctx.firstItemId) {
      test.skip(true, 'Kein Token oder Item-ID')
      return
    }
    // Add favorite
    await apiFetch('POST', `/customer/favorites/${ctx.firstItemId}`, undefined, {
      Cookie: `customer_token=${ctx.customerToken}`,
    })
    await withCustomerAuth(page)
    // Navigate directly to /account/favorites (Fix c — eigene Route) statt Tab-Klick
    // der durch das Sprachauswahl-Modal blockiert werden kann
    await page.goto(`${BASE_URL}/account/favorites`)
    await page.waitForLoadState('networkidle')

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
    await apiFetch('DELETE', `/customer/favorites/${ctx.firstItemId}`, undefined, {
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
    await page.waitForLoadState('networkidle')

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
    await page.waitForLoadState('networkidle')

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
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('/account/favorites')
    const heading = page.locator('h2').filter({ hasText: /Favorites|Favoriten|Избранн|Αγαπημέν|مفضل|מועדפ/ })
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
