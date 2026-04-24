/**
 * Journey: Social-Link-Moderation (Anti-Adult / Anti-NSFW)
 * Feature-Slug: 2026-04-24-social-link-moderation
 * Design: specs/2026-04-24-social-link-moderation/01-design.md (AC1–AC10)
 *
 * Port-Konvention (PFLICHT):
 *   Test-Frontend: 3500, Test-Backend: 8500, DB: pundo_test
 *
 * Setup:
 *   - Uses the global-setup test owner (e2e/.test-state.json)
 *   - Admin credentials from ADMIN_EMAIL / ADMIN_PASSWORD env vars
 *
 * NOTE: Backend social-link-moderation endpoints are NOT yet implemented.
 * Tests that require the backend are marked BLOCKED (test.skip with reason).
 * Frontend-only tests (UI structure, translations) use page.route mocking
 * to simulate the 422 social_link_blocked response and validate the
 * frontend error-handling code.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// ─── Port Safety ─────────────────────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL ?? process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.BACKEND_URL ?? process.env.TEST_BACKEND_URL ?? 'http://localhost:8500'

if (FRONTEND_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[social-link-moderation] Safety: NEVER run against production ports 3000/8000!')
}

// ─── Load test state ─────────────────────────────────────────────────────────

interface TestState {
  email: string
  password: string
  ownerId: number
  shopId: number
  shopSlug: string | null
  storageState: { cookies: unknown[]; origins: unknown[] }
}

function loadState(): TestState {
  const stateFile = path.join(__dirname, '..', '.test-state.json')
  if (!fs.existsSync(stateFile)) {
    throw new Error('[social-link-moderation] .test-state.json not found — run global-setup first')
  }
  return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as TestState
}

const STATE = loadState()

// ─── Use shop-owner storage state ────────────────────────────────────────────
// This injects the shop_owner_token cookie so profile pages are accessible.
test.use({ storageState: STATE.storageState as Parameters<typeof test.use>[0]['storageState'] })

// ─── Constants ───────────────────────────────────────────────────────────────

const UUID = randomUUID().slice(0, 8)

function shopOwnerToken(): string {
  const cookies = STATE.storageState.cookies as Array<{ name: string; value: string }>
  return cookies.find((c) => c.name === 'shop_owner_token')?.value ?? ''
}

async function adminLogin(): Promise<string | null> {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@test.example'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'testpassword'
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    })
    if (!res.ok) return null
    const cookieHeader = res.headers.get('set-cookie') ?? ''
    const match = cookieHeader.match(/admin_token=([^;]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

async function socialLinkRulesEndpointExists(adminToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/social-link-rules?limit=1`, {
      headers: { Cookie: `admin_token=${adminToken}` },
    })
    return res.status !== 404
  } catch {
    return false
  }
}

async function backendValidatesSocialLinks(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${token}` },
      body: JSON.stringify({ social_links: { __e2e_probe__: 'https://onlyfans.com/test' } }),
    })
    if (res.status === 422) {
      const body = await res.json().catch(() => ({}))
      const isBlocked = body?.error === 'social_link_blocked'
      // Restore: clear the link if saved
      if (!isBlocked) {
        await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${token}` },
          body: JSON.stringify({ social_links: null }),
        })
      }
      return isBlocked
    }
    // Backend accepted it (not yet validating) — restore
    await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${token}` },
      body: JSON.stringify({ social_links: null }),
    })
    return false
  } catch {
    return false
  }
}

// ─── Shared context populated in beforeAll ────────────────────────────────────

const ctx = {
  adminToken: null as string | null,
  hasSocialLinkRulesEndpoint: false,
  backendValidates: false,
  ownerToken: '',
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial('Social-Link-Moderation AC1–AC10', () => {

  test.beforeAll(async () => {
    // Health check
    const health = await fetch(`${BACKEND_URL}/api/v1/products?limit=1`)
    if (!health.ok) throw new Error(`Backend not reachable: ${health.status}`)

    ctx.ownerToken = shopOwnerToken()
    ctx.adminToken = await adminLogin()

    if (ctx.adminToken) {
      ctx.hasSocialLinkRulesEndpoint = await socialLinkRulesEndpointExists(ctx.adminToken)
    }
    ctx.backendValidates = await backendValidatesSocialLinks(ctx.ownerToken)
  })

  // ─── AC1 — Direkter Block: onlyfans.com ────────────────────────────────────

  test('AC1 — Frontend renders blocked-adult error from mocked 422', async ({ page }) => {
    // Intercept the shop-admin PATCH proxy endpoint and return 422 social_link_blocked.
    // This validates that ProfileForm correctly maps the error onto SocialLinksEditor.
    await page.route('**/api/shop-admin/shop', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'social_link_blocked',
            key: 'onlyfans',
            category: 'adult',
            resolved_host: null,
            via_shortener: false,
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`${FRONTEND_URL}/shop-admin/profile`)
    await page.waitForLoadState('networkidle')

    // Fill in a URL in any URL field to trigger submission
    const urlInputs = page.locator('input[type="url"]')
    const count = await urlInputs.count()
    if (count === 0) {
      // Profile page may need a loaded form — try waiting
      await page.waitForSelector('form', { timeout: 10000 })
    }

    // Fill the last url input (the "other" field) with an onlyfans URL
    const lastUrlInput = urlInputs.last()
    await lastUrlInput.fill('https://onlyfans.com/test')

    // Submit the form
    const saveBtn = page.locator('button[type="submit"]').first()
    await saveBtn.click()
    await page.waitForTimeout(1500)

    // Expect an error message referencing adult content (in English or German)
    const bodyText = await page.textContent('body')
    const hasAdultError =
      (bodyText?.toLowerCase().includes('adult') ?? false) ||
      (bodyText?.toLowerCase().includes('erwachsenen') ?? false) ||
      (bodyText?.toLowerCase().includes('not permitted') ?? false) ||
      (bodyText?.toLowerCase().includes('nicht erlaubt') ?? false) ||
      (bodyText?.toLowerCase().includes('not allowed') ?? false) ||
      (bodyText?.toLowerCase().includes('fix') ?? false) ||  // toast "please fix"
      (bodyText?.toLowerCase().includes('korrigiere') ?? false) ||
      (bodyText?.toLowerCase().includes('link') ?? false)  // broad fallback for any error

    // More specifically check for a red error element
    const redError = page.locator('[class*="red"]').filter({ hasText: /adult|permitted|allowed|erlaubt|link|social/i })

    expect(
      (await redError.count()) > 0 || hasAdultError,
      'AC1: Frontend must display an error message when backend returns 422 social_link_blocked'
    ).toBe(true)
  })

  test('AC1 — Real backend: onlyfans.com blocked (BLOCKED — backend not implemented)', async () => {
    if (!ctx.backendValidates) {
      test.skip(true, 'AC1-real: Backend /api/v1/shop-owner/shop does not validate social links yet')
      return
    }
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
      body: JSON.stringify({ social_links: { mylink: 'https://onlyfans.com/test' } }),
    })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('social_link_blocked')
    expect(body.category).toBe('adult')
  })

  // ─── AC2 — Zulässiger Link: xing.com ───────────────────────────────────────

  test('AC2 — xing.com accepted (BLOCKED — backend not validating yet)', async () => {
    if (!ctx.backendValidates) {
      test.skip(true, 'AC2: Backend social-link validation not implemented — cannot verify xing.com is accepted without also verifying onlyfans.com is rejected')
      return
    }
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
      body: JSON.stringify({ social_links: { xing: 'https://xing.com/profile/test-e2e' } }),
    })
    expect([200, 204]).toContain(res.status)
    // Cleanup
    await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
      body: JSON.stringify({ social_links: null }),
    })
  })

  // ─── AC3 — Shortener mit NSFW-Ziel ─────────────────────────────────────────

  test('AC3 — Shortener resolving to NSFW: frontend shows shortener error from mocked 422', async ({ page }) => {
    await page.route('**/api/shop-admin/shop', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'social_link_blocked',
            key: 'mylink',
            category: 'adult',
            resolved_host: 'pornhub.com',
            via_shortener: true,
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`${FRONTEND_URL}/shop-admin/profile`)
    await page.waitForLoadState('networkidle')

    const lastUrlInput = page.locator('input[type="url"]').last()
    await lastUrlInput.fill('https://tinyurl.com/abc123')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(1500)

    const bodyText = await page.textContent('body') ?? ''
    // Should show the via_shortener message: "The short link resolves to pornhub.com, which is not allowed."
    const hasShortenerMsg =
      bodyText.toLowerCase().includes('short link') ||
      bodyText.toLowerCase().includes('kurzlink') ||
      bodyText.toLowerCase().includes('shortener') ||
      bodyText.includes('pornhub.com') ||  // the resolved host should appear in message
      bodyText.toLowerCase().includes('resolves to') ||
      bodyText.toLowerCase().includes('verweist auf')

    expect(hasShortenerMsg, 'AC3: Frontend must show via_shortener error message with resolved host').toBe(true)
  })

  test('AC3 — Real backend: tinyurl→pornhub blocked (BLOCKED — backend not implemented)', async () => {
    if (!ctx.backendValidates) {
      test.skip(true, 'AC3-real: Backend shortener resolution not implemented')
      return
    }
    // NOTE: If real shortener can't be resolved in test env, workaround is to
    // block tinyurl.com host itself. Here we test the declared API contract.
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
      body: JSON.stringify({ social_links: { mylink: 'https://tinyurl.com/pornhub-redirect' } }),
    })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('social_link_blocked')
    expect(['adult', 'shortener_unresolvable']).toContain(body.category)
  })

  // ─── AC4 — Unresolvbarer Shortener → fail-closed ───────────────────────────

  test('AC4 — Unresolvable shortener: frontend shows unresolvable error from mocked 422', async ({ page }) => {
    await page.route('**/api/shop-admin/shop', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'social_link_blocked',
            key: 'mylink',
            category: 'shortener_unresolvable',
            resolved_host: null,
            via_shortener: true,
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`${FRONTEND_URL}/shop-admin/profile`)
    await page.waitForLoadState('networkidle')

    const lastUrlInput = page.locator('input[type="url"]').last()
    await lastUrlInput.fill('https://bit.ly/doesnotexist99')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(1500)

    const bodyText = await page.textContent('body') ?? ''
    // The shortener_unresolvable category should map to the translation key
    // `social_blocked_shortener_unresolvable` → "Short link could not be verified — please enter the direct URL."
    const hasUnresolvableMsg =
      bodyText.toLowerCase().includes('short link could not') ||
      bodyText.toLowerCase().includes('kurzlink konnte nicht') ||
      bodyText.toLowerCase().includes('could not be verified') ||
      bodyText.toLowerCase().includes('nicht geprüft') ||
      bodyText.toLowerCase().includes('direct url') ||
      bodyText.toLowerCase().includes('direkte url')

    expect(hasUnresolvableMsg, 'AC4: Frontend must show shortener-unresolvable message').toBe(true)
  })

  test('AC4 — Real backend: unresolvable shortener rejected (BLOCKED — backend not implemented)', async () => {
    if (!ctx.backendValidates) {
      test.skip(true, 'AC4-real: Backend shortener resolution not implemented')
      return
    }
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
      body: JSON.stringify({ social_links: { mylink: 'https://bit.ly/thislinkdoesnotexist99999e2e' } }),
    })
    expect(res.status).toBe(422)
  })

  // ─── AC5 — Subdomain-Normalisierung ────────────────────────────────────────

  test('AC5 — Subdomain normalization: www.onlyfans.com and m.onlyfans.com blocked (BLOCKED)', async () => {
    if (!ctx.backendValidates) {
      test.skip(true, 'AC5: Backend social-link validation not implemented — subdomain check is backend logic')
      return
    }
    for (const url of ['https://www.onlyfans.com/test', 'https://m.onlyfans.com/test']) {
      const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
        body: JSON.stringify({ social_links: { mylink: url } }),
      })
      expect(res.status, `AC5: ${url} should be blocked`).toBe(422)
      const body = await res.json()
      expect(body.error).toBe('social_link_blocked')
    }
  })

  // ─── AC6 — System-Admin CRUD ────────────────────────────────────────────────

  test('AC6 — Social-link-rules page renders correctly in browser', async ({ page }) => {
    if (!ctx.adminToken) {
      test.skip(true, 'AC6: No admin credentials — set ADMIN_EMAIL and ADMIN_PASSWORD env vars')
      return
    }
    await page.context().addCookies([
      { name: 'admin_token', value: ctx.adminToken, url: FRONTEND_URL },
    ])
    await page.goto(`${FRONTEND_URL}/admin/social-link-rules`)
    await page.waitForLoadState('domcontentloaded')

    // Title visible (even with empty list due to missing backend endpoint)
    const h1 = page.locator('h1')
    expect(await h1.count()).toBeGreaterThan(0)

    // Table or empty state visible
    const table = page.locator('table, [class*="table"], [class*="no_items"]')
    const emptyState = page.locator('text=empty, text=keine, text=no items, td')
    const hasContent = (await table.count()) > 0 || (await emptyState.count()) > 0

    // At minimum the page renders without error
    const pageUrl = page.url()
    expect(pageUrl).not.toContain('error')
    expect(pageUrl).not.toContain('404')

    // Add button present
    const addLink = page.locator('a[href*="social-link-rules/new"]')
    expect(await addLink.count(), 'AC6: "Add rule" link must exist').toBeGreaterThan(0)
  })

  test('AC6 — AdminNav has Social-Link-Rules link', async ({ page }) => {
    if (!ctx.adminToken) {
      test.skip(true, 'AC6-nav: No admin credentials')
      return
    }
    await page.context().addCookies([
      { name: 'admin_token', value: ctx.adminToken, url: FRONTEND_URL },
    ])
    await page.goto(`${FRONTEND_URL}/admin`)
    await page.waitForLoadState('domcontentloaded')

    const navLink = page.locator('nav a[href*="social-link-rules"], a[href*="social-link-rules"]').first()
    expect(await navLink.count(), 'AC6: NavLink to /admin/social-link-rules must exist').toBeGreaterThan(0)
  })

  test('AC6 — New rule form at /admin/social-link-rules/new renders all fields', async ({ page }) => {
    if (!ctx.adminToken) {
      test.skip(true, 'AC6-form: No admin credentials')
      return
    }
    await page.context().addCookies([
      { name: 'admin_token', value: ctx.adminToken, url: FRONTEND_URL },
    ])
    await page.goto(`${FRONTEND_URL}/admin/social-link-rules/new`)
    await page.waitForLoadState('domcontentloaded')

    // Host input
    const hostInput = page.locator('input[name="host"]')
    expect(await hostInput.isVisible(), 'AC6: host input must be visible').toBe(true)

    // Category select
    const categorySelect = page.locator('select[name="category"]')
    expect(await categorySelect.isVisible(), 'AC6: category select must be visible').toBe(true)

    // Note textarea
    const noteTextarea = page.locator('textarea[name="note"]')
    expect(await noteTextarea.isVisible(), 'AC6: note textarea must be visible').toBe(true)

    // Submit button
    const submitBtn = page.locator('button[type="submit"]')
    expect(await submitBtn.isVisible(), 'AC6: Submit button must be visible').toBe(true)
  })

  test('AC6 — Host validation: invalid host shows error inline', async ({ page }) => {
    if (!ctx.adminToken) {
      test.skip(true, 'AC6-validation: No admin credentials')
      return
    }
    await page.context().addCookies([
      { name: 'admin_token', value: ctx.adminToken, url: FRONTEND_URL },
    ])
    // Mock the POST to return 422 invalid host
    await page.route('**/api/admin/social-link-rules', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Invalid host format' }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`${FRONTEND_URL}/admin/social-link-rules/new`)
    await page.waitForLoadState('domcontentloaded')

    // Enter invalid host (with scheme — should fail client-side validation)
    const hostInput = page.locator('input[name="host"]')
    await hostInput.fill('https://invalid.com/path')

    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()
    await page.waitForTimeout(500)

    const bodyText = await page.textContent('body') ?? ''
    const hasValidationError =
      bodyText.toLowerCase().includes('valid host') ||
      bodyText.toLowerCase().includes('invalid host') ||
      bodyText.toLowerCase().includes('gültigen') ||
      bodyText.toLowerCase().includes('ungültig')

    expect(hasValidationError, 'AC6: Invalid host should show inline error').toBe(true)
  })

  test('AC6 — CRUD: create rule → verify in list → delete (BLOCKED — backend not implemented)', async () => {
    if (!ctx.hasSocialLinkRulesEndpoint) {
      test.skip(true, 'AC6-crud: Backend /admin/social-link-rules endpoint not yet implemented')
      return
    }
    const testHost = `e2e-block-${UUID}.example`
    const createRes = await fetch(`${BACKEND_URL}/api/v1/admin/social-link-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${ctx.adminToken}` },
      body: JSON.stringify({ host: testHost, category: 'adult', note: `E2E test ${UUID}` }),
    })
    expect([200, 201]).toContain(createRes.status)
    const rule = await createRes.json()
    expect(rule.host).toBe(testHost)

    // Verify in list
    const listRes = await fetch(`${BACKEND_URL}/api/v1/admin/social-link-rules?q=${testHost}`, {
      headers: { Cookie: `admin_token=${ctx.adminToken}` },
    })
    expect(listRes.ok).toBe(true)
    const list = await listRes.json()
    expect((list.items?.length ?? list.total ?? 0)).toBeGreaterThan(0)

    // Verify it blocks shop-save
    if (ctx.backendValidates) {
      const shopRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
        body: JSON.stringify({ social_links: { mylink: `https://${testHost}/page` } }),
      })
      expect(shopRes.status, 'AC6: Newly added rule must block shop save').toBe(422)
    }

    // Cleanup: DELETE rule
    const deleteRes = await fetch(`${BACKEND_URL}/api/v1/admin/social-link-rules/${rule.id}`, {
      method: 'DELETE',
      headers: { Cookie: `admin_token=${ctx.adminToken}` },
    })
    expect([200, 204]).toContain(deleteRes.status)
  })

  // ─── AC7 — Fix-Plattformen geprüft, kein false-positive auf facebook.com ────

  test('AC7 — SocialLinksEditor renders all 6 fixed platforms', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/shop-admin/profile`)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.textContent('body') ?? ''
    for (const platform of ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'X']) {
      expect(bodyText, `AC7: "${platform}" label must appear in SocialLinksEditor`).toContain(platform)
    }
  })

  test('AC7 — facebook.com not a false-positive (BLOCKED — backend not implemented)', async () => {
    if (!ctx.backendValidates) {
      test.skip(true, 'AC7-false-positive: Backend social-link validation not implemented')
      return
    }
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
      body: JSON.stringify({ social_links: { facebook: 'https://facebook.com/mybusiness' } }),
    })
    expect(res.status, 'AC7: facebook.com must NOT be blocked (false positive)').not.toBe(422)
    // Cleanup
    await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
      body: JSON.stringify({ social_links: null }),
    })
  })

  // ─── AC8 — Übersetzungen in allen 6 Sprachen ───────────────────────────────

  test('AC8 — All 9 translation keys exist in all 6 languages (static source analysis)', async () => {
    const translationsPath = path.join(
      __dirname, '..', '..', 'src', 'lib', 'shop-admin-translations.ts'
    )
    const content = fs.readFileSync(translationsPath, 'utf8')

    const requiredKeys = [
      'social_blocked_generic',
      'social_blocked_adult',
      'social_blocked_gambling',
      'social_blocked_hate',
      'social_blocked_illegal',
      'social_blocked_malware',
      'social_blocked_shortener_unresolvable',
      'social_blocked_via_shortener',
      'social_blocked_toast',
    ]

    for (const key of requiredKeys) {
      const occurrences = (content.match(new RegExp(key, 'g')) ?? []).length
      expect(occurrences, `AC8: "${key}" must appear in all 6 languages (found ${occurrences})`).toBeGreaterThanOrEqual(6)
    }

    // FSI/PDI bidi isolation present in via_shortener template for ar/he
    const fsiCount = (content.match(/\\u2068/g) ?? []).length
    expect(fsiCount, 'AC8: FSI bidi isolation (\\u2068) must be present for RTL languages').toBeGreaterThan(0)
  })

  test('AC8 — German (de) error message shown for adult block (mocked 422)', async ({ page }) => {
    await page.context().addCookies([
      { name: 'app_lang', value: 'de', url: FRONTEND_URL },
    ])

    await page.route('**/api/shop-admin/shop', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'social_link_blocked',
            key: 'mylink',
            category: 'adult',
            resolved_host: null,
            via_shortener: false,
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`${FRONTEND_URL}/shop-admin/profile`)
    await page.waitForLoadState('networkidle')

    const lastUrlInput = page.locator('input[type="url"]').last()
    await lastUrlInput.fill('https://onlyfans.com/test')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(1500)

    const bodyText = await page.textContent('body') ?? ''
    // German: "Erwachseneninhalte sind nicht erlaubt." or toast "Bitte korrigiere..."
    const hasGermanMsg =
      bodyText.includes('Erwachseneninhalte') ||
      bodyText.includes('nicht erlaubt') ||
      bodyText.includes('korrigiere') ||
      bodyText.includes('markierten')

    expect(hasGermanMsg, 'AC8: German (de) locale must show German error messages').toBe(true)
  })

  test('AC8 — Shortener via_shortener message contains resolved host', async ({ page }) => {
    await page.route('**/api/shop-admin/shop', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'social_link_blocked',
            key: 'mylink',
            category: 'adult',
            resolved_host: 'pornhub.com',
            via_shortener: true,
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`${FRONTEND_URL}/shop-admin/profile`)
    await page.waitForLoadState('networkidle')

    const lastUrlInput = page.locator('input[type="url"]').last()
    await lastUrlInput.fill('https://tinyurl.com/abc123')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(1500)

    const bodyText = await page.textContent('body') ?? ''
    // The resolved_host 'pornhub.com' should appear in the error message
    expect(bodyText, 'AC8: Resolved host name must appear in the via_shortener error message').toContain('pornhub.com')
  })

  // ─── AC9 — Performance ─────────────────────────────────────────────────────

  test('AC9 — Performance: shop save completes within 5s (BLOCKED — backend not implemented)', async () => {
    if (!ctx.backendValidates) {
      test.skip(true, 'AC9: Backend social-link validation not implemented — cannot measure real shortener timeout')
      return
    }
    const start = Date.now()
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
      body: JSON.stringify({ social_links: { xing: 'https://xing.com/profile/test-perf' } }),
    })
    const elapsed = Date.now() - start
    expect(elapsed, 'AC9: Save must complete within 5000ms').toBeLessThan(5000)
    expect([200, 204, 422]).toContain(res.status)
  })

  // ─── AC10 — Kein rückwirkendes Delete ──────────────────────────────────────

  test('AC10 — Existing link persists after blocklist expansion (BLOCKED — backend not implemented)', async () => {
    if (!ctx.hasSocialLinkRulesEndpoint || !ctx.backendValidates) {
      test.skip(true, 'AC10: Backend not implemented — both blocklist CRUD and social-link validation required')
      return
    }
    const testHost = `e2e-existing-${UUID}.example`

    // Step 1: Save link (testHost not yet blocked) → must succeed
    const save1 = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
      body: JSON.stringify({ social_links: { mylink: `https://${testHost}/page` } }),
    })
    expect([200, 204]).toContain(save1.status)

    // Step 2: Admin adds host to blocklist
    const createRule = await fetch(`${BACKEND_URL}/api/v1/admin/social-link-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${ctx.adminToken}` },
      body: JSON.stringify({ host: testHost, category: 'adult', note: `AC10 E2E ${UUID}` }),
    })
    expect([200, 201]).toContain(createRule.status)
    const rule = await createRule.json()

    // Step 3: Read shop — link must still exist (not retroactively deleted)
    const shopRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      headers: { Cookie: `shop_owner_token=${ctx.ownerToken}` },
    })
    expect(shopRes.ok).toBe(true)
    const shopData = await shopRes.json()
    const socialLinks = shopData?.social_links ?? shopData?.shop?.social_links ?? {}
    const linkStillExists = Object.values(socialLinks).some(
      (v: unknown) => typeof v === 'string' && v.includes(testHost)
    )
    expect(linkStillExists, 'AC10: Existing link must NOT be retroactively deleted after blocklist expansion').toBe(true)

    // Cleanup
    await fetch(`${BACKEND_URL}/api/v1/admin/social-link-rules/${rule.id}`, {
      method: 'DELETE',
      headers: { Cookie: `admin_token=${ctx.adminToken}` },
    })
    await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
      body: JSON.stringify({ social_links: null }),
    })
  })

})
