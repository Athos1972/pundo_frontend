/**
 * Journey: Shop-Owner Admin-Approval via Browser-UI
 * Runbook: e2e/journeys/shop-owner-admin-approval-flow.md
 *
 * Regression-Guard für:
 * - AdminShopOwnerResponse.shop_id: int (nicht Optional) → 500 → Admin-Liste leer
 * - pre_signup fehlte im Admin-Filter-Dropdown
 * - (portal)/layout.tsx redirectete pre_signup nicht auf Onboarding
 *
 * Fixture-Tabelle:
 * | Fixture            | Zweck                                          |
 * |--------------------|------------------------------------------------|
 * | e2e-approval-{uuid}  | pending owner + shop → Haupt-Approval-Flow    |
 * | e2e-presignup-{uuid} | pending → via PATCH auf pre_signup gesetzt    |
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'
import { adminLogin as adminApiLogin, shopOwnerLogin } from './_helpers'
import fs from 'fs'
import path from 'path'

// ─── Port safety ──────────────────────────────────────────────────────────────

const BASE_URL = process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'
const BACKEND_URL = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('[shop-owner-admin-approval-flow] Safety: NEVER run against prod ports 3000/8000!')
}

// ─── Identity ─────────────────────────────────────────────────────────────────

const UUID = randomUUID().slice(0, 8)
const PASSWORD = 'E2eApprovalPw!99'

// ─── Context ──────────────────────────────────────────────────────────────────

interface StepLog { step: number; desc: string; expected: string; actual: string; status: 'PASS' | 'FAIL' | 'SKIP' }
interface Fixture { name: string; id: number | null; built: boolean; deleted: boolean }

const ctx = {
  adminToken: null as string | null,
  // Fixture A: pending owner with shop
  approvalEmail: `e2e-approval-${UUID}@pundo-e2e.io`,
  approvalOwnerId: null as number | null,
  approvalShopId: null as number | null,
  // Fixture B: pre_signup owner (no shop)
  presignupEmail: `e2e-presignup-${UUID}@pundo-e2e.io`,
  presignupOwnerId: null as number | null,
  stepLog: [] as StepLog[],
  fixtures: [] as Fixture[],
  startedAt: new Date().toISOString(),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function logStep(step: number, desc: string, expected: string, actual: string, status: 'PASS' | 'FAIL' | 'SKIP') {
  ctx.stepLog.push({ step, desc, expected, actual, status })
  console.log(`[approval-flow] Step ${step} [${status}]: ${desc} | expected: ${expected} | actual: ${actual}`)
}

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

function adminHeaders(): Record<string, string> {
  if (!ctx.adminToken) throw new Error('adminToken not set')
  return { Cookie: `admin_token=${ctx.adminToken}` }
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe.serial('Shop-Owner Admin-Approval via Browser-UI', () => {

  // ── PHASE 1 — Setup via API ──────────────────────────────────────────────────

  test.beforeAll(async () => {
    test.setTimeout(120_000)

    ctx.fixtures.push({ name: `e2e-approval-${UUID}`, id: null, built: false, deleted: false })
    ctx.fixtures.push({ name: `e2e-presignup-${UUID}`, id: null, built: false, deleted: false })

    // Health-Check
    const health = await fetch(`${BACKEND_URL}/api/v1/products?limit=1`)
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)

    // Admin-Token
    ctx.adminToken = await adminApiLogin()

    // Fixture A: Pending owner with shop (via legacy register endpoint)
    const regA = await apiFetch('POST', '/api/v1/shop-owner/register', {
      email: ctx.approvalEmail,
      password: PASSWORD,
      name: `E2E Approval Owner ${UUID}`,
      shop_name: `e2e-approval-shop-${UUID}`,
      shop_address: 'Finikoudes Beach, Larnaca, Cyprus',
    }) as { ok: boolean; status: number; data: unknown }

    if (!regA.ok) {
      throw new Error(`SETUP BROKEN: Register fixture A failed: ${regA.status} ${JSON.stringify(regA.data)}`)
    }
    const regAData = regA.data as { id: number; shop_id?: number }
    ctx.approvalOwnerId = regAData.id
    ctx.approvalShopId = regAData.shop_id ?? null
    ctx.fixtures[0].id = regAData.id
    ctx.fixtures[0].built = true

    console.log(`[approval-flow] Fixture A: owner_id=${ctx.approvalOwnerId} shop_id=${ctx.approvalShopId}`)

    // Fixture B: pre_signup owner — register then patch to pre_signup
    const regB = await apiFetch('POST', '/api/v1/shop-owner/register', {
      email: ctx.presignupEmail,
      password: PASSWORD,
      name: `E2E Presignup Owner ${UUID}`,
      shop_name: `e2e-presignup-shop-${UUID}`,
      shop_address: 'Makenzie Beach, Larnaca, Cyprus',
    })
    if (!regB.ok) {
      throw new Error(`SETUP BROKEN: Register fixture B failed: ${regB.status} ${JSON.stringify(regB.data)}`)
    }
    const regBData = regB.data as { id: number }
    ctx.presignupOwnerId = regBData.id
    ctx.fixtures[1].id = regBData.id

    // Patch fixture B to pre_signup (admin allows this since we added it to allowed set)
    const patchB = await apiFetch(
      'PATCH',
      `/api/v1/admin/shop-owners/${ctx.presignupOwnerId}`,
      { status: 'pre_signup' },
      adminHeaders()
    )
    if (!patchB.ok) {
      throw new Error(`SETUP BROKEN: PATCH fixture B to pre_signup failed: ${patchB.status}`)
    }
    ctx.fixtures[1].built = true
    console.log(`[approval-flow] Fixture B: owner_id=${ctx.presignupOwnerId} status=pre_signup`)
  })

  // ── PHASE 2 — Admin-UI Browser ───────────────────────────────────────────────

  // AC-1: Admin-Login via Browser-Formular
  test('AC-1: Admin-Login via Browser-Formular', async ({ page }) => {
    test.setTimeout(30_000)
    await page.goto(`${BASE_URL}/admin/login`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="email"]', 'e2e-admin@pundo-e2e.io')
    await page.fill('input[name="password"]', 'E2eAdminPassword!99')
    await page.click('button[type="submit"]')

    // Wait for redirect (to dashboard or shop-owners)
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 10_000 })
    const finalUrl = page.url()
    expect(finalUrl).not.toContain('/admin/login')

    // Verify cookie is set by navigating to a protected page
    const cookie = await page.context().cookies()
    const adminCookie = cookie.find(c => c.name === 'admin_token')
    expect(adminCookie, 'admin_token Cookie muss gesetzt sein').toBeTruthy()

    logStep(1, 'Admin-Login via Formular', 'Cookie admin_token gesetzt + Redirect', finalUrl, 'PASS')
  })

  // AC-2: Shop-Owner-Liste lädt (Regression-Guard 500-Bug)
  test('AC-2: Shop-Owner-Liste lädt ohne 500 (Regression-Guard)', async ({ page }) => {
    test.setTimeout(20_000)

    // Set cookie directly (faster than re-login)
    await page.context().addCookies([{
      name: 'admin_token',
      value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/shop-owners`)
    await page.waitForLoadState('networkidle')

    // Must show at least one row (our fixtures exist)
    // The old bug caused a 500 when any pre_signup account existed → catch → 0 rows
    const rows = page.locator('table tbody tr, [data-testid="entity-row"]')
    const rowCount = await rows.count()
    expect(rowCount, 'Mindestens 1 Zeile muss sichtbar sein (500-Regression)').toBeGreaterThan(0)

    logStep(2, 'Shop-Owner-Liste lädt', `>0 Zeilen`, `${rowCount} Zeilen`, 'PASS')
  })

  // AC-3: Filter pending zeigt Fixture A
  test('AC-3: Filter "pending" zeigt Fixture A', async ({ page }) => {
    test.setTimeout(20_000)

    await page.context().addCookies([{
      name: 'admin_token', value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname, path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/shop-owners?status=pending`)
    await page.waitForLoadState('networkidle')

    // Fixture A email should appear
    const emailCell = page.locator('td, [data-testid="entity-cell"]').filter({ hasText: `e2e-approval-${UUID}` })
    await expect(emailCell.first(), `Fixture A (${ctx.approvalEmail}) muss in pending-Filter sichtbar sein`).toBeVisible({ timeout: 5_000 })

    logStep(3, 'Filter pending', 'Fixture A sichtbar', ctx.approvalEmail, 'PASS')
  })

  // AC-4: Filter pre_signup zeigt Fixture B (Regression-Guard fehlender Filter)
  test('AC-4: Filter "pre_signup" zeigt Fixture B (Regression-Guard)', async ({ page }) => {
    test.setTimeout(20_000)

    await page.context().addCookies([{
      name: 'admin_token', value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname, path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/shop-owners?status=pre_signup`)
    await page.waitForLoadState('networkidle')

    const emailCell = page.locator('td, [data-testid="entity-cell"]').filter({ hasText: `e2e-presignup-${UUID}` })
    await expect(emailCell.first(), `Fixture B (${ctx.presignupEmail}) muss in pre_signup-Filter sichtbar sein`).toBeVisible({ timeout: 5_000 })

    logStep(4, 'Filter pre_signup', 'Fixture B sichtbar', ctx.presignupEmail, 'PASS')
  })

  // AC-5+6: Approve via Edit-Seite
  test('AC-5+6: Approve Fixture A via Browser-UI', async ({ page }) => {
    test.setTimeout(30_000)

    if (!ctx.approvalOwnerId) test.skip(true, 'Fixture A nicht aufgebaut')

    await page.context().addCookies([{
      name: 'admin_token', value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname, path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/shop-owners/${ctx.approvalOwnerId}/edit`)
    await page.waitForLoadState('networkidle')

    // Status-Badge muss 'pending' zeigen
    const statusBadge = page.locator('span').filter({ hasText: /^pending$/i })
    await expect(statusBadge.first()).toBeVisible({ timeout: 5_000 })
    logStep(5, 'Edit-Seite öffnet mit Status pending', 'pending-Badge sichtbar', await statusBadge.first().textContent() ?? '', 'PASS')

    // Approve-Button klicken
    const approveBtn = page.locator('button').filter({ hasText: /approve/i })
    await expect(approveBtn).toBeVisible()
    await approveBtn.click()

    // Kurz warten auf Status-Update
    await page.waitForTimeout(1_500)

    // Status-Badge muss 'approved' zeigen
    const approvedBadge = page.locator('span').filter({ hasText: /^approved$/i })
    await expect(approvedBadge.first(), 'Status-Badge muss nach Approve auf approved wechseln').toBeVisible({ timeout: 8_000 })
    logStep(5, 'Approve-Button geklickt', 'approved-Badge', await approvedBadge.first().textContent() ?? '', 'PASS')

    // API-Verifikation
    const verify = await apiFetch('GET', `/api/v1/admin/shop-owners/${ctx.approvalOwnerId}`, undefined, adminHeaders())
    const verifyData = verify.data as { status: string }
    expect(verifyData.status, 'API muss status=approved bestätigen').toBe('approved')
    logStep(6, 'API-Verifikation status=approved', 'approved', verifyData.status, 'PASS')

    // In approved-Liste sichtbar
    await page.goto(`${BASE_URL}/admin/shop-owners?status=approved`)
    await page.waitForLoadState('networkidle')
    const approvedRow = page.locator('td, [data-testid="entity-cell"]').filter({ hasText: `e2e-approval-${UUID}` })
    await expect(approvedRow.first()).toBeVisible({ timeout: 5_000 })
    logStep(6, 'In approved-Filter sichtbar', 'Fixture A in approved-Liste', ctx.approvalEmail, 'PASS')
  })

  // AC-7: Admin-Logout
  test('AC-7: Admin-Logout → Cookie gelöscht, Redirect auf Login', async ({ page }) => {
    test.setTimeout(20_000)

    // Desktop viewport: sidebar uses hidden md:flex (768px breakpoint)
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.context().addCookies([{
      name: 'admin_token', value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname, path: '/',
    }])

    await page.goto(`${BASE_URL}/admin/shop-owners`)
    await page.waitForLoadState('networkidle')

    // Logout-Button ist in der Desktop-Sidebar (hidden md:flex)
    // tr.logout = 'Sign out' (en) — kein 'Logout'!
    const logoutBtn = page.locator('aside button').filter({ hasText: /sign out/i })
    await logoutBtn.scrollIntoViewIfNeeded()
    await expect(logoutBtn).toBeVisible({ timeout: 5_000 })
    await logoutBtn.click()

    // Muss auf /admin/login redirecten
    await page.waitForURL(/\/admin\/login/, { timeout: 8_000 })
    expect(page.url()).toContain('/admin/login')

    // admin_token Cookie muss weg sein
    const cookiesAfter = await page.context().cookies()
    const adminCookieAfter = cookiesAfter.find(c => c.name === 'admin_token')
    expect(adminCookieAfter, 'admin_token Cookie muss nach Logout gelöscht sein').toBeFalsy()

    // Direktzugriff auf Shop-Owner-Liste → Redirect auf Login
    await page.goto(`${BASE_URL}/admin/shop-owners`)
    await page.waitForURL(/\/admin\/login/, { timeout: 5_000 })
    expect(page.url()).toContain('/admin/login')

    logStep(7, 'Admin-Logout + Auth-Guard', '/admin/login', page.url(), 'PASS')
  })

  // ── PHASE 3 — Shop-Owner-Login nach Approval ──────────────────────────────────

  // AC-8: Shop-Owner-Login → Dashboard (kein Redirect auf Onboarding/Pending)
  test('AC-8: Shop-Owner-Login → Dashboard nach Approval', async ({ page }) => {
    test.setTimeout(30_000)

    // Login via Formular (kein OAuth)
    await page.goto(`${BASE_URL}/shop-admin/login`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="email"]', ctx.approvalEmail)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('button[type="submit"]')

    // Muss auf Dashboard landen (kein /onboarding, kein /pending-approval)
    await page.waitForURL(/\/shop-admin\/dashboard/, { timeout: 10_000 })
    const finalUrl = page.url()
    expect(finalUrl).toContain('/shop-admin/dashboard')
    expect(finalUrl).not.toContain('/onboarding')
    expect(finalUrl).not.toContain('/pending-approval')

    logStep(8, 'Shop-Owner-Login nach Approval', '/shop-admin/dashboard', finalUrl, 'PASS')
  })

  // AC-9: Shop-Profil nicht leer
  test('AC-9: Shop-Profil zeigt Shop-Daten (nicht leer)', async ({ page }) => {
    test.setTimeout(20_000)

    // Set shop_owner_token via API-Login (vermeidet UI-Formular-Timeout)
    const ownerToken = await shopOwnerLogin(ctx.approvalEmail, PASSWORD)
    await page.context().addCookies([{
      name: 'shop_owner_token',
      value: ownerToken,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    await page.goto(`${BASE_URL}/shop-admin/profile`)
    await page.waitForLoadState('networkidle')

    // input[name="name"] muss einen Wert haben (Shop-Name aus Registration)
    const nameInput = page.locator('input[name="name"]')
    await expect(nameInput, 'Profil-Name-Feld muss sichtbar sein').toBeVisible({ timeout: 8_000 })
    const nameValue = await nameInput.inputValue()
    expect(nameValue, 'Shop-Name darf nicht leer sein (silent-catch-Regression)').not.toBe('')

    logStep(9, 'Profil-Feld name nicht leer', 'non-empty', nameValue, 'PASS')
  })

  // ── PHASE 4 — Cleanup ────────────────────────────────────────────────────────

  test.afterAll(async () => {
    const endedAt = new Date().toISOString()
    const date = endedAt.slice(0, 10)

    // Cleanup: reject beide Fixtures
    for (const [id, name] of [
      [ctx.approvalOwnerId, 'approval'],
      [ctx.presignupOwnerId, 'presignup'],
    ] as [number | null, string][]) {
      if (id && ctx.adminToken) {
        try {
          await apiFetch(
            'PATCH',
            `/api/v1/admin/shop-owners/${id}`,
            { status: 'rejected' },
            adminHeaders()
          )
          const fixture = ctx.fixtures.find(f => f.name.includes(name))
          if (fixture) fixture.deleted = true
          console.log(`[approval-flow] Cleanup: owner ${id} → rejected`)
        } catch (e) {
          console.warn(`[approval-flow] Cleanup failed for ${name} (id=${id}):`, e)
        }
      }
    }

    // Report schreiben
    const overallStatus = ctx.stepLog.some(s => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    const findings = ctx.stepLog.filter(s => s.status === 'FAIL')

    const report = [
      `## Journey: Shop-Owner Admin-Approval via Browser-UI — ${overallStatus}`,
      `Datum: ${endedAt.slice(0, 16).replace('T', ' ')} UTC`,
      '',
      '### Test-Daten',
      '| Fixture | ID | Aufgebaut | Gelöscht |',
      '|---|---|---|---|',
      ...ctx.fixtures.map(f => `| ${f.name} | ${f.id ?? 'N/A'} | ${f.built ? 'ja' : 'FEHLER'} | ${f.deleted ? 'ja' : 'nein'} |`),
      '',
      '### Schritt-für-Schritt-Protokoll',
      '| # | Beschreibung | Erwartet | Tatsächlich | Status |',
      '|---|---|---|---|---|',
      ...ctx.stepLog.map(s => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
      '',
      '### Findings',
      findings.length === 0 ? '_keine_' : '| Schritt | Erwartet | Tatsächlich |',
      ...(findings.length > 0 ? ['|---|---|---|', ...findings.map(f => `| ${f.step} | ${f.expected} | ${f.actual} |`)] : []),
    ].join('\n')

    const reportsDir = path.join(__dirname, 'reports')
    fs.mkdirSync(reportsDir, { recursive: true })
    fs.writeFileSync(
      path.join(reportsDir, `shop-owner-admin-approval-flow-${date}.md`),
      report,
      'utf8'
    )
    console.log(`[approval-flow] Report geschrieben: shop-owner-admin-approval-flow-${date}.md`)
  })
})
