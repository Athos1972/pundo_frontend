/**
 * E2E-Tests: System-Admin Portal
 *
 * - E2E-11/12/19: ohne Auth (Login-Seite, Auth-Guard, URL-Struktur)
 * - E2E-13-18, E2E-20: authentifiziert per `storageState` (`e2e/.auth/admin.json`, vom Global Setup
 *   aus dem Admin-Token geschrieben, T2/F8950). Ein fehlendes oder ungueltiges Token laesst die Tests
 *   FEHLSCHLAGEN (Redirect auf /admin/login), es gibt keinen stillen Skip mehr.
 * - Der Formular-Login wird nur in E2E-11 geprueft (dort ist er Pruefgegenstand).
 */

import { test, expect, type Page } from '@playwright/test'
import { waitForPageHydrated, clickHydrated } from './journeys/_helpers/hydration'
import { E2E_ADMIN_STATE_FILE as ADMIN_STATE } from './state'

const ADMIN_EMAIL = 'e2e-admin@pundo-e2e.io'
const ADMIN_PASSWORD = 'E2eAdminPassword!99'

// Admin-storageState, vom Global Setup geschrieben (e2e/global-setup.ts, writeAdminStorageState)

// ── E2E-11: Admin Login Page ──────────────────────────────────────────────────

test.describe('E2E-11: Admin Login Page', () => {
  test('admin login page renders with 200', async ({ page }) => {
    const response = await page.goto('/admin/login')
    expect(response?.status()).toBe(200)
  })

  test('admin login page shows email and password inputs', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('admin login page has submit button', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('button', { name: /sign in|login|anmelden/i })).toBeVisible()
  })

  test('no JS errors on admin login page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed')) errors.push(err.message)
    })
    await page.goto('/admin/login')
    await waitForPageHydrated(page)
    expect(errors).toHaveLength(0)
  })

  test('valid credentials log in and reach /admin/dashboard', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/admin/login')
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL)
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /sign in|login|anmelden/i }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 })
  })

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/admin/login')
    await waitForPageHydrated(page)
    await page.locator('input[type="email"]').fill('invalid@example.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in|login|anmelden/i }).click()
    // Should stay on login page and show an error (F8950 T22: statt waitForTimeout(2000) auf p[role=alert] warten)
    await expect(page.locator('p[role="alert"]')).toBeVisible({ timeout: 10_000 })
    expect(page.url()).toContain('/admin/login')
  })
})

// ── E2E-12: Admin Auth Guard (Unauthenticated) ────────────────────────────────

test.describe('E2E-12: Admin Auth Guard', { tag: '@smoke' }, () => {
  const PROTECTED_PATHS = [
    '/admin/dashboard',
    '/admin/shops',
    '/admin/products',
    '/admin/brands',
    '/admin/offers',
    '/admin/categories',
  ]

  for (const path of PROTECTED_PATHS) {
    test(`unauthenticated ${path} redirects to /admin/login`, async ({ page }) => {
      await page.goto(path)
      // After redirect, URL must contain /admin/login
      expect(page.url()).toContain('/admin/login')
    })
  }
})

// ── Authentifizierte Tests (E2E-13–18, E2E-20) ───────────────────────────────
// Navigation mit storageState. Landet die Seite auf /admin/login (Token fehlt/ungueltig), schlaegt
// die URL-Assertion fehl - kein Skip.
async function gotoAdmin(page: Page, adminPath: string): Promise<void> {
  await page.goto(adminPath)
  await expect(page).not.toHaveURL(/\/admin\/login/)
}

// ── E2E-13: Admin Shops Page ──────────────────────────────────────────────────

test.describe('E2E-13: Admin Shops Page', () => {
  test.use({ storageState: ADMIN_STATE })

  test('shops list renders when authenticated', async ({ page }) => {
    await gotoAdmin(page, '/admin/shops')
    expect(page.url()).toContain('/admin/shops')
  })

  test('shops list has ID search field (input[name="id"])', async ({ page }) => {
    await gotoAdmin(page, '/admin/shops')
    const idInput = page.locator('input[name="id"]')
    await expect(idInput).toBeVisible()
    expect(await idInput.getAttribute('type')).toBe('number')
  })

  test('shops list has text search field (input[name="q"])', async ({ page }) => {
    await gotoAdmin(page, '/admin/shops')
    await expect(page.locator('input[name="q"]')).toBeVisible()
  })

  test('shops list has + New link', async ({ page }) => {
    await gotoAdmin(page, '/admin/shops')
    await expect(page.getByRole('link', { name: /\+|new|hinzufügen/i }).first()).toBeVisible()
  })
})

// ── E2E-14: Admin Products Page ───────────────────────────────────────────────

test.describe('E2E-14: Admin Products Page', () => {
  test.use({ storageState: ADMIN_STATE })

  test('products list renders when authenticated', async ({ page }) => {
    await gotoAdmin(page, '/admin/products')
    expect(page.url()).toContain('/admin/products')
  })

  test('products list has ID search field (input[name="id"])', async ({ page }) => {
    await gotoAdmin(page, '/admin/products')
    const idInput = page.locator('input[name="id"]')
    await expect(idInput).toBeVisible()
    expect(await idInput.getAttribute('type')).toBe('number')
  })

  test('products list has text search field (input[name="q"])', async ({ page }) => {
    await gotoAdmin(page, '/admin/products')
    await expect(page.locator('input[name="q"]')).toBeVisible()
  })
})

// ── E2E-15: Admin Brands Page ─────────────────────────────────────────────────

test.describe('E2E-15: Admin Brands Page', () => {
  test.use({ storageState: ADMIN_STATE })

  test('brands list renders when authenticated', async ({ page }) => {
    await gotoAdmin(page, '/admin/brands')
    expect(page.url()).toContain('/admin/brands')
  })

  test('brands list has ID search field (input[name="id"])', async ({ page }) => {
    await gotoAdmin(page, '/admin/brands')
    const idInput = page.locator('input[name="id"]')
    await expect(idInput).toBeVisible()
    expect(await idInput.getAttribute('type')).toBe('number')
  })

  test('brands list has text search field (input[name="q"])', async ({ page }) => {
    await gotoAdmin(page, '/admin/brands')
    await expect(page.locator('input[name="q"]')).toBeVisible()
  })
})

// ── E2E-16: Admin Offers Page ─────────────────────────────────────────────────

test.describe('E2E-16: Admin Offers Page', () => {
  test.use({ storageState: ADMIN_STATE })

  test('offers list renders when authenticated', async ({ page }) => {
    await gotoAdmin(page, '/admin/offers')
    expect(page.url()).toContain('/admin/offers')
  })

  test('offers list has product search field (input[name="q"])', async ({ page }) => {
    await gotoAdmin(page, '/admin/offers')
    await expect(page.locator('input[name="q"]')).toBeVisible()
  })

  test('offers list has shop_listing_id field (input[name="shop_listing_id"])', async ({ page }) => {
    await gotoAdmin(page, '/admin/offers')
    const shopListingIdInput = page.locator('input[name="shop_listing_id"]')
    await expect(shopListingIdInput).toBeVisible()
    expect(await shopListingIdInput.getAttribute('type')).toBe('number')
  })
})

// ── E2E-17: Admin Categories Page (Tree View + 3-field search) ───────────────

test.describe('E2E-17: Admin Categories Page', () => {
  test.use({ storageState: ADMIN_STATE })

  test('categories page renders when authenticated', async ({ page }) => {
    await gotoAdmin(page, '/admin/categories')
    expect(page.url()).toContain('/admin/categories')
  })

  test('categories page has 3-field search: q + id + taxonomy_type', async ({ page }) => {
    await gotoAdmin(page, '/admin/categories')
    await expect(page.locator('input[name="q"]')).toBeVisible()
    await expect(page.locator('input[name="id"]')).toBeVisible()
    await expect(page.locator('select[name="taxonomy_type"]')).toBeVisible()
  })

  test('categories page shows Tree/Table toggle links', async ({ page }) => {
    await gotoAdmin(page, '/admin/categories')
    await expect(page.getByRole('link', { name: /^tree$/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /^table$/i })).toBeVisible()
  })

  test('categories tree view has expand/collapse all buttons', async ({ page }) => {
    await gotoAdmin(page, '/admin/categories?view=tree')
    // pundo_test ist eine Prod-Kopie und hat Kategorien; "No categories" waere ein Datenfehler (kein Skip).
    await expect(page.locator('text=No categories')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: /expand all|alle aufklappen/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /collapse all|alle zuklappen/i })
    ).toBeVisible()
  })

  test('categories table view renders when ?view=table', async ({ page }) => {
    await gotoAdmin(page, '/admin/categories?view=table')
    expect(page.url()).toContain('view=table')
  })

  test('categories taxonomy_type search works', async ({ page }) => {
    await gotoAdmin(page, '/admin/categories?taxonomy_type=google&view=table')
    expect(page.url()).toContain('taxonomy_type=google')
  })
})

// ── E2E-18: Admin Navigation ──────────────────────────────────────────────────

test.describe('E2E-18: Admin Navigation', () => {
  test.use({ storageState: ADMIN_STATE })

  test('admin nav links are present when authenticated', async ({ page }) => {
    await gotoAdmin(page, '/admin/dashboard')
    await expect(page.getByRole('link', { name: /shops/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /products|produkte/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /brands|marken/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /offers|angebote/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /categories|kategorien/i }).first()).toBeVisible()
  })

  test('admin dashboard shows category-attribute-definitions link', async ({ page }) => {
    await gotoAdmin(page, '/admin/dashboard')
    // category-attribute-definitions is a dashboard entity card (not in the sidebar nav)
    await expect(page.getByRole('link', { name: /attribute def/i }).first()).toBeVisible()
  })

  test('admin nav shows logout button', async ({ page }) => {
    await gotoAdmin(page, '/admin/dashboard')
    const logoutEl = page.getByRole('button', { name: /logout|sign out|ausloggen/i })
    await expect(logoutEl.first()).toBeVisible()
  })
})

// ── E2E-19: Admin ID Search Smoke Tests (unauthenticated — page structure only) ──
// These tests verify URL structure only; auth guard behavior is tested in E2E-12

test.describe('E2E-19: Admin URL Structure', () => {
  test('admin/shops URL loads (redirects to login when unauth)', async ({ page }) => {
    await page.goto('/admin/shops')
    // Either on shops or redirected to login — neither is a crash
    expect(page.url()).toMatch(/\/(admin\/shops|admin\/login)/)
  })

  test('admin/products URL loads (redirects to login when unauth)', async ({ page }) => {
    await page.goto('/admin/products')
    expect(page.url()).toMatch(/\/(admin\/products|admin\/login)/)
  })

  test('admin/brands URL loads (redirects to login when unauth)', async ({ page }) => {
    await page.goto('/admin/brands')
    expect(page.url()).toMatch(/\/(admin\/brands|admin\/login)/)
  })

  test('admin/offers URL loads (redirects to login when unauth)', async ({ page }) => {
    await page.goto('/admin/offers')
    expect(page.url()).toMatch(/\/(admin\/offers|admin\/login)/)
  })

  test('admin/categories URL loads (redirects to login when unauth)', async ({ page }) => {
    await page.goto('/admin/categories')
    expect(page.url()).toMatch(/\/(admin\/categories|admin\/login)/)
  })

  test('admin/categories?view=table URL is syntactically valid', async ({ page }) => {
    // Just navigate — no crash expected regardless of auth state
    const resp = await page.goto('/admin/categories?view=table')
    expect([200, 307, 404]).toContain(resp?.status())
  })

  test('admin/categories?view=tree URL is syntactically valid', async ({ page }) => {
    const resp = await page.goto('/admin/categories?view=tree')
    expect([200, 307, 404]).toContain(resp?.status())
  })
})


// ── E2E-20: Admin Shop Edit — Spoken Languages ────────────────────────────────

test.describe('E2E-20: Admin Shop Edit — Spoken Languages', () => {
  test.use({ storageState: ADMIN_STATE })

  test('LanguageSelector renders all 6 language buttons on shop edit page', async ({ page }) => {
    // Navigate to any shop's edit page (shop 91 exists in test DB copied from prod)
    await gotoAdmin(page, '/admin/shops/91/edit')

    // All 6 language buttons must be visible (exact: true avoids matching Next.js dev tools button)
    for (const lang of ['EN', 'DE', 'EL', 'RU', 'AR', 'HE']) {
      await expect(page.getByRole('button', { name: lang, exact: true })).toBeVisible()
    }
  })

  test('language button toggles aria-pressed on click', async ({ page }) => {
    await gotoAdmin(page, '/admin/shops/91/edit')

    const enBtn = page.getByRole('button', { name: 'EN', exact: true })
    await expect(enBtn).toBeVisible()
    const before = await enBtn.getAttribute('aria-pressed')
    await clickHydrated(enBtn)
    await expect.poll(() => enBtn.getAttribute('aria-pressed')).not.toBe(before)
  })

  test('label "Spoken languages" is visible on shop edit page', async ({ page }) => {
    await gotoAdmin(page, '/admin/shops/91/edit')
    await expect(page.getByText('Spoken languages')).toBeVisible()
  })
})
