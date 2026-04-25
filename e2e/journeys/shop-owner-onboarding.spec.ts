/**
 * Journey: Shop-Owner Onboarding (Register → Verify Email → Pending Approval → Login)
 *
 * Covers the complete onboarding path that was missing from the journey suite.
 * The /shop-admin/register/check-email route was fixed (was 404) — this spec
 * ensures the fix does not regress.
 *
 * Token extraction: DB query via Python (Option A from architecture) — no SMTP needed.
 *   See e2e/journeys/_helpers/dev-token.ts
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'
import { getVerificationToken } from './_helpers/dev-token'

// ─── Port safety ──────────────────────────────────────────────────────────────

const BASE_URL = process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'
const BACKEND_URL = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[shop-owner-onboarding] Safety: NEVER run against prod ports 3000/8000!')
}

// ─── Test identity ────────────────────────────────────────────────────────────

const UUID = randomUUID().slice(0, 8)
const PREFIX = `e2e-onboard-${UUID}`

// ─── Shared context ───────────────────────────────────────────────────────────

const ctx = {
  email: `${PREFIX}@pundo-e2e.io`,
  password: 'E2eOnboardPw!99',
  name: `E2E Onboarding Owner ${UUID}`,
  shopName: `${PREFIX}-shop`,
  shopAddress: 'Finikoudes Beach, Larnaca, Cyprus',
  ownerId: null as number | null,
  verificationToken: null as string | null,
  adminToken: null as string | null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(
  method: string,
  urlPath: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = urlPath.startsWith('http') ? urlPath : `${BACKEND_URL}${urlPath}`
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json', ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data: unknown = {}
  try { if (res.status !== 204) data = await res.json() } catch { /* empty */ }
  return { ok: res.ok, status: res.status, data }
}

async function getAdminToken(): Promise<string> {
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

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe.serial('Shop-Owner Onboarding: Register → Verify → Approve → Login', () => {

  test.afterAll(async () => {
    // Cleanup: reject the owner to free up the email for re-runs
    if (!ctx.ownerId || !ctx.adminToken) return
    try {
      await apiFetch(
        'PATCH',
        `/api/v1/admin/shop-owners/${ctx.ownerId}`,
        { status: 'rejected' },
        { Cookie: `admin_token=${ctx.adminToken}` }
      )
      console.log(`[onboarding-cleanup] Owner ${ctx.ownerId} set to rejected`)
    } catch (err) {
      console.warn(`[onboarding-cleanup] Could not reject owner ${ctx.ownerId}:`, err)
    }
  })

  // ── Test 1: Register form UI ───────────────────────────────────────────────

  test('T1 — Register-Formular ausfüllen + Submit → Redirect auf /register/check-email', async ({ page }) => {
    await page.goto(BASE_URL + '/shop-admin/register')
    await page.waitForLoadState('networkidle')

    // Fill the registration form
    await page.fill('input[name="name"]', ctx.name)
    await page.fill('input[name="email"]', ctx.email)
    await page.fill('input[name="password"]', ctx.password)
    await page.fill('input[name="shop_name"]', ctx.shopName)
    await page.fill('input[name="shop_address"]', ctx.shopAddress)

    await page.click('button[type="submit"]')

    // Expect redirect to check-email (not 404!)
    await page.waitForURL(/\/shop-admin\/register\/check-email/, { timeout: 15_000 })

    const url = page.url()
    expect(url, 'Must redirect to /register/check-email after submit').toContain('/register/check-email')
    expect(url, '/register/check-email must not 404').not.toContain('not-found')
    expect(url, '/register/check-email must not 404').not.toContain('404')

    // Also confirm the admin knows about this owner (needed for ownerId)
    ctx.adminToken = await getAdminToken()
    const listRes = await apiFetch('GET', '/api/v1/admin/shop-owners?limit=100', undefined, {
      Cookie: `admin_token=${ctx.adminToken}`,
    })
    const owners = ((listRes.data as { items?: Array<{ id: number; email: string }> })?.items ?? [])
    const found = owners.find(o => o.email === ctx.email)
    if (found) ctx.ownerId = found.id
  })

  // ── Test 2: Check-Email page content ──────────────────────────────────────

  test('T2 — /register/check-email Seite: Titel "Check your inbox" sichtbar', async ({ page }) => {
    await page.goto(BASE_URL + '/shop-admin/register/check-email')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url, 'check-email page must not redirect to 404').not.toContain('not-found')

    // The page should show the check_email_title translation key value ("Check your inbox" in EN)
    const body = await page.locator('body').innerText()
    const hasTitle =
      /check your inbox|e-mail prüfen|Έλεγξε|Проверьте/i.test(body)
    expect(hasTitle, 'check-email title text must be visible on the page').toBe(true)
  })

  // ── Test 3: Fetch verification token from DB ───────────────────────────────

  test('T3 — Verification-Token aus Test-DB lesen', async () => {
    // The backend writes the token to the shop_owners table when SMTP_HOST is not set
    // (it logs it instead of sending an email). We query it directly via Python + SQLAlchemy.
    const token = await getVerificationToken(ctx.email)
    expect(token, 'email_verification_token must be non-empty').toBeTruthy()
    expect(token.length, 'email_verification_token must have reasonable length').toBeGreaterThan(8)
    ctx.verificationToken = token
  })

  // ── Test 4: Verify email UI ────────────────────────────────────────────────

  test('T4 — /verify-email?token=... → Zeigt Success + Link zu /pending-approval', async ({ page }) => {
    if (!ctx.verificationToken) throw new Error('PREREQUISITE BROKEN: verificationToken not set — T3 failed')

    await page.goto(BASE_URL + `/shop-admin/verify-email?token=${ctx.verificationToken}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url, 'verify-email page must not 404').not.toContain('not-found')
    expect(url, 'verify-email page must not 404').not.toContain('404')

    // The verify-email page is a server component that shows a success message + link.
    // It does NOT auto-redirect — it shows a "Go to pending-approval" link.
    // Check that success state is shown (not error state).
    const body = await page.locator('body').innerText()
    const hasError = /invalid|expired|error/i.test(body)
    expect(hasError, `T4: verify-email page shows error — token may have expired or is invalid. Body: ${body.slice(0, 300)}`).toBe(false)

    // Click the link to pending-approval (shown on success)
    const pendingLink = page.locator('a[href*="pending-approval"]')
    const hasPendingLink = await pendingLink.count() > 0
    expect(hasPendingLink, 'T4: "pending-approval" link must be visible after successful email verification').toBe(true)

    // Navigate via the link
    await pendingLink.first().click()
    await page.waitForURL(/\/shop-admin\/pending-approval/, { timeout: 10_000 })

    const finalUrl = page.url()
    expect(finalUrl, 'After clicking link: must land on /pending-approval').toContain('/shop-admin/pending-approval')
  })

  // ── Test 5: Admin approves owner ──────────────────────────────────────────

  test('T5 — Admin approved den Owner', async () => {
    if (!ctx.ownerId) {
      // Try to find owner again — T1 might have set it after registration but before T5
      if (!ctx.adminToken) ctx.adminToken = await getAdminToken()
      const listRes = await apiFetch('GET', '/api/v1/admin/shop-owners?limit=100', undefined, {
        Cookie: `admin_token=${ctx.adminToken}`,
      })
      const owners = ((listRes.data as { items?: Array<{ id: number; email: string }> })?.items ?? [])
      const found = owners.find(o => o.email === ctx.email)
      if (found) ctx.ownerId = found.id
    }
    if (!ctx.ownerId) throw new Error('SETUP BROKEN: ownerId not available — registration in T1 may have failed')

    if (!ctx.adminToken) ctx.adminToken = await getAdminToken()

    const res = await apiFetch(
      'PATCH',
      `/api/v1/admin/shop-owners/${ctx.ownerId}`,
      { status: 'approved' },
      { Cookie: `admin_token=${ctx.adminToken}` }
    )
    expect(res.ok, `Approve owner failed: ${res.status} ${JSON.stringify(res.data)}`).toBe(true)

    // Verify status is now approved
    const detailRes = await apiFetch(
      'GET',
      `/api/v1/admin/shop-owners/${ctx.ownerId}`,
      undefined,
      { Cookie: `admin_token=${ctx.adminToken}` }
    )
    const ownerData = detailRes.data as { status?: string }
    expect(ownerData.status, 'Owner status must be approved after PATCH').toBe('approved')
  })

  // ── Test 6: Owner login after approval ────────────────────────────────────

  test('T6 — Owner-Login nach Approval → /shop-admin/dashboard erreichbar', async ({ page }) => {
    await page.goto(BASE_URL + '/shop-admin/login')
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="email"]', ctx.email)
    await page.fill('input[name="password"]', ctx.password)
    await page.click('button[type="submit"]')

    // After successful login the owner should be redirected to dashboard or portal
    await page.waitForURL(/\/shop-admin\/(dashboard|offers|profile)/, { timeout: 15_000 })

    const url = page.url()
    expect(url, 'After login: must be inside shop-admin area').toContain('/shop-admin/')
    expect(url, 'After login: must not be on login page still').not.toContain('/login')
    expect(url, 'After login: must not 404').not.toContain('not-found')
  })

})
