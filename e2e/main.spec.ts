import { test, expect } from '@playwright/test'

// ─── E2E-01: Startseite ───────────────────────────────────────────────────────

test.describe('E2E-01: Startseite', () => {
  test('loads with 200 and shows search input', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.locator('input')).toBeVisible()
  })

  test('no JS errors on homepage', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── E2E-02: Suche ───────────────────────────────────────────────────────────

test.describe('E2E-02: Suche', () => {
  test('search navigates to /search?q=...', async ({ page }) => {
    await page.goto('/')
    const input = page.locator('input').first()
    await input.fill('cat food')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/search\?q=/)
  })

  test('empty search does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/search?q=xyzxyz123notexist')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('search results page renders without crash', async ({ page }) => {
    await page.goto('/search?q=cat')
    await page.waitForLoadState('networkidle')
    const status = await page.evaluate(() => document.readyState)
    expect(status).toBe('complete')
  })
})

// ─── E2E-03: RTL-Layout ───────────────────────────────────────────────────────
// Language is set via pundo_lang cookie (not URL param)

test.describe('E2E-03: RTL-Layout', () => {
  async function setLang(page: import('@playwright/test').Page, lang: string) {
    await page.context().addCookies([{
      name: 'pundo_lang', value: lang, domain: 'localhost', path: '/',
    }])
  }

  test('Arabic (ar) sets dir=rtl', async ({ page }) => {
    await setLang(page, 'ar')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('Hebrew (he) sets dir=rtl', async ({ page }) => {
    await setLang(page, 'he')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('English (en) sets dir=ltr', async ({ page }) => {
    await setLang(page, 'en')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })

  test('German (de) sets dir=ltr', async ({ page }) => {
    await setLang(page, 'de')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })

  test('Greek (el) sets dir=ltr', async ({ page }) => {
    await setLang(page, 'el')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })

  test('Russian (ru) sets dir=ltr', async ({ page }) => {
    await setLang(page, 'ru')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })
})

// ─── E2E-04: Produkt-Detailseite ─────────────────────────────────────────────

test.describe('E2E-04: Produkt-Detailseite', () => {
  test('unknown slug returns 404 or renders without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    const response = await page.goto('/products/this-product-does-not-exist-xyz')
    // Either 200 (with empty state) or 404 — not 500
    expect([200, 404]).toContain(response?.status())
    expect(errors).toHaveLength(0)
  })
})

// ─── E2E-05: Shop-Seite ───────────────────────────────────────────────────────

test.describe('E2E-05: Shop-Seite', () => {
  test('unknown shop slug returns 404 or renders without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    const response = await page.goto('/shops/nonexistent-shop-xyz')
    expect([200, 404]).toContain(response?.status())
    expect(errors).toHaveLength(0)
  })
})

// ─── E2E-06: Responsive Mobile ───────────────────────────────────────────────

test.describe('E2E-06: Responsive Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('homepage has no horizontal overflow', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // 1px tolerance
  })

  test('search input is present and usable on mobile', async ({ page }) => {
    await page.goto('/')
    const input = page.locator('input').first()
    await expect(input).toBeVisible()
    const box = await input.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(36) // touch-friendly
  })
})

// ─── E2E-07: Auth Redirect ────────────────────────────────────────────────────

test.describe('E2E-07: Auth & Shop-Admin Redirect', () => {
  test('unauthenticated user on /shop-admin/dashboard redirects to /shop-admin/login', async ({ page }) => {
    // No shop_owner_token cookie → proxy redirects to login
    await page.goto('/shop-admin/dashboard')
    // After redirect (proxy or server-side), should be on login
    expect(page.url()).toContain('/shop-admin/login')
  })

  test('shop-admin login page renders', async ({ page }) => {
    const response = await page.goto('/shop-admin/login')
    expect(response?.status()).toBe(200)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('shop-admin register page renders', async ({ page }) => {
    const response = await page.goto('/shop-admin/register')
    expect(response?.status()).toBe(200)
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})

// ─── E2E-07b: Fehler-Handling ────────────────────────────────────────────────

test.describe('E2E-07b: Fehler-Handling', () => {
  test('404 page for completely unknown route', async ({ page }) => {
    const response = await page.goto('/this/route/does/not/exist/at/all')
    expect(response?.status()).toBe(404)
  })
})
