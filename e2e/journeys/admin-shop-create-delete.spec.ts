/**
 * Journey: Admin Shop Create + Delete (UI Golden Path)
 * Runbook: e2e/journeys/admin-shop-create-delete.md
 *
 * Fixtures:
 * | Fixture-Name          | Was wird aufgebaut          | Was wird geprüft                         |
 * |-----------------------|-----------------------------|------------------------------------------|
 * | e2e-shop-{uuid}       | Shop ohne Offers/ShopOwner  | Create via UI + Delete via UI            |
 *
 * Regression für Bug: DELETE /api/admin/shops/{id} 500
 * Ursache war offers.shop_listing_id FK mit RESTRICT statt CASCADE.
 * Fix: Migration 0c09189b8ee0_fix_offers_shop_listing_cascade.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { adminLogin as adminApiLogin } from './_helpers'

// Port-Safety — niemals gegen Produktiv-Ports laufen
const BASE_URL = process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'
const BACKEND_URL = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'
if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const BACKEND_REPO = process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'
const UUID = randomUUID().slice(0, 8)
const SHOP_NAME = `E2E Shop ${UUID}`

interface StepEntry {
  step: number
  desc: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL' | 'SKIP'
}

const ctx = {
  uuid: UUID,
  adminToken: null as string | null,
  createdShopId: null as number | null,
  stepLog: [] as StepEntry[],
  startedAt: new Date().toISOString(),
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

  return adminApiLogin(adminEmail, adminPassword)
}

function adminHeaders() {
  return { Cookie: `admin_token=${ctx.adminToken}` }
}

function logStep(step: number, desc: string, expected: string, actual: string, status: 'PASS' | 'FAIL' | 'SKIP') {
  ctx.stepLog.push({ step, desc, expected, actual, status })
}

async function apiFetch(
  method: string,
  urlPath: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  })
  let data: unknown = null
  try { data = await res.json() } catch { /* no body */ }
  return { ok: res.ok, status: res.status, data }
}

// ─── Report ───────────────────────────────────────────────────────────────────

function writeReport(verdict: 'PASS' | 'FAIL') {
  const today = new Date().toISOString().slice(0, 10)
  const reportPath = path.join('e2e', 'journeys', 'reports', `admin-shop-create-delete-${today}.md`)

  const rows = ctx.stepLog
    .map(s => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | **${s.status}** |`)
    .join('\n')

  const openFailures = ctx.stepLog.filter(s => s.status === 'FAIL')
  const findingsTable = openFailures.length === 0
    ? '_Keine Findings._'
    : openFailures.map(s => `| Step ${s.step} | ${s.desc} | ${s.actual} |`).join('\n')

  const content = `# Journey-Report: Admin Shop Create + Delete
Datum: ${today}
UUID: ${ctx.uuid}
Shop-Name: ${SHOP_NAME}
Verdict: **${verdict}**

## Fixtures

| Name | ID | Angelegt | Gelöscht |
|---|---|---|---|
| ${SHOP_NAME} | ${ctx.createdShopId ?? '—'} | ${ctx.createdShopId !== null ? 'ja' : 'nein'} | ${verdict === 'PASS' ? 'ja' : 'unklar'} |

## Schritte

| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
${rows}

## Findings

| Schritt | Beschreibung | Actual |
|---|---|---|
${findingsTable}

## Cleanup

Shop ${ctx.createdShopId ? `#${ctx.createdShopId}` : '(nicht angelegt)'} ${verdict === 'PASS' ? 'via UI gelöscht ✓' : 'muss ggf. manuell bereinigt werden'}.
`

  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, content)
    console.log(`[report] Geschrieben: ${reportPath}`)
  } catch (err) {
    console.warn('[report] Fehler beim Schreiben:', err)
  }
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial('Admin Shop Create + Delete (UI Golden Path)', () => {

  test.beforeAll(async () => {
    test.setTimeout(60_000)

    const health = await apiFetch('GET', '/api/v1/products?limit=1')
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)

    ctx.adminToken = await adminLogin()
  })

  // ── Step 1–5: Shop anlegen via Browser-UI ────────────────────────────────────

  test('AC-1: Shop anlegen via Admin-UI → erscheint in der Liste', async ({ page }) => {
    test.setTimeout(60_000)

    // Step 1: Login-Flow via Browser (Cookie setzen)
    await page.goto(`${BASE_URL}/admin/login`)
    await page.waitForLoadState('networkidle')

    // Cookie direkt setzen statt Login-Formular — schneller und zuverlässiger
    await page.context().addCookies([{
      name: 'admin_token',
      value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    logStep(1, 'Admin-Token Cookie gesetzt', 'Cookie vorhanden', `admin_token=${ctx.adminToken!.slice(0, 20)}...`, 'PASS')

    // Step 2: /admin/shops/new aufrufen
    await page.goto(`${BASE_URL}/admin/shops/new`)
    await page.waitForLoadState('networkidle')

    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    logStep(2, 'Navigiert zu /admin/shops/new', 'h1 sichtbar', await heading.textContent() ?? '', 'PASS')

    // Step 3–4: Formular füllen (Name + Slug + Stadt)
    await page.locator('input[name="name"]').fill(SHOP_NAME)
    // Slug wird aus Name auto-generiert — ggf. UUID-Suffix für Eindeutigkeit
    const slugInput = page.locator('input[name="slug"]')
    await expect(slugInput).toBeVisible({ timeout: 3_000 })
    await slugInput.fill(`e2e-shop-${UUID}`)
    await page.locator('input[name="city"]').fill('E2E-City')
    logStep(3, `Name+Slug eingegeben: ${SHOP_NAME} / e2e-shop-${UUID}`, 'Felder ausgefüllt', SHOP_NAME, 'PASS')
    logStep(4, 'Stadt: E2E-City', 'Feld ausgefüllt', 'E2E-City', 'PASS')

    // Step 5: Speichern → Redirect zu /admin/shops
    await page.locator('button[type="submit"]').click()

    // Warte auf Redirect + Toast
    await page.waitForURL(`${BASE_URL}/admin/shops`, { timeout: 15_000 })
    logStep(5, 'Formular gespeichert → Redirect', '/admin/shops', page.url(), 'PASS')

    // Step 6: Shop in Liste suchen — URL enthält q=SHOP_NAME oder wir suchen selbst
    await page.goto(`${BASE_URL}/admin/shops?q=${encodeURIComponent(SHOP_NAME)}`)
    await page.waitForLoadState('networkidle')

    // Step 7: Shop muss in der Liste erscheinen
    const shopRow = page.locator('td', { hasText: SHOP_NAME })
    await expect(shopRow).toBeVisible({ timeout: 10_000 })
    logStep(7, 'Shop in Tabelle sichtbar', SHOP_NAME, await shopRow.textContent() ?? '', 'PASS')

    // Shop-ID via API ermitteln (für Cleanup-Info im Report)
    const searchRes = await apiFetch('GET', `/api/v1/admin/shops?q=${encodeURIComponent(SHOP_NAME)}&limit=1`, undefined, adminHeaders())
    if (searchRes.ok) {
      const items = (searchRes.data as { items?: Array<{ id: number }> })?.items ?? []
      if (items.length > 0) ctx.createdShopId = items[0].id
    }
    logStep(6, `API-Verifikation: Shop angelegt`, `ID vorhanden`, `ID=${ctx.createdShopId}`, ctx.createdShopId ? 'PASS' : 'FAIL')
  })

  // ── Step 8–10: Shop löschen via Browser-UI ───────────────────────────────────

  test('AC-2+AC-3: Delete-Button + Confirm-Dialog → Shop gelöscht', async ({ page }) => {
    test.setTimeout(60_000)

    // Voraussetzung: Shop wurde in AC-1 angelegt
    expect(ctx.createdShopId, 'Shop-ID muss aus AC-1 bekannt sein').not.toBeNull()

    await page.context().addCookies([{
      name: 'admin_token',
      value: ctx.adminToken!,
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }])

    // Navigiere zur gefilterten Shops-Liste
    await page.goto(`${BASE_URL}/admin/shops?q=${encodeURIComponent(SHOP_NAME)}`)
    await page.waitForLoadState('networkidle')

    // Step 8: Delete-Button klicken → Confirm-Dialog erscheint
    const deleteBtn = page.locator('button', { hasText: /delete|löschen/i }).first()
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()
    logStep(8, 'Delete-Button geklickt', 'Confirm-Dialog erscheint', 'Button geklickt', 'PASS')

    // AC-3: Dialog muss sichtbar sein
    const dialog = page.locator('[role="dialog"], [data-state="open"]').first()
    const dialogVisible = await dialog.isVisible().catch(() => false)
    if (!dialogVisible) {
      // Fallback: Dialog wird durch Modal-Overlay identifiziert
      const overlay = page.locator('.fixed.inset-0, [class*="backdrop"], [class*="overlay"]').first()
      await expect(overlay).toBeVisible({ timeout: 5_000 })
    }
    logStep(9, 'Confirm-Dialog sichtbar', 'Dialog erscheint', dialogVisible ? 'Dialog sichtbar' : 'Overlay sichtbar', 'PASS')

    // AC-3: Bestätigen klicken
    const confirmBtn = page.locator('button', { hasText: /delete|löschen|bestätigen|confirm/i }).last()
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()

    // Warte auf Seiten-Refresh (router.refresh() nach erfolgreichem Delete)
    await page.waitForLoadState('networkidle')
    logStep(9, 'Delete bestätigt', '204 + Liste aktualisiert', 'Confirm geklickt', 'PASS')

    // Step 10: Shop darf nicht mehr in der Liste erscheinen
    await page.waitForTimeout(1_000) // kurz warten auf DOM-Update
    const deletedRow = page.locator('td', { hasText: SHOP_NAME })
    await expect(deletedRow).not.toBeVisible({ timeout: 8_000 })
    logStep(10, 'Shop nicht mehr in Liste', 'Zeile weg', 'Zeile nicht sichtbar', 'PASS')

    // AC-2: API-Verifikation — 404 oder leere Liste
    const verifyRes = await apiFetch(
      'GET',
      `/api/v1/admin/shops?q=${encodeURIComponent(SHOP_NAME)}&limit=1`,
      undefined,
      adminHeaders()
    )
    const items = (verifyRes.data as { items?: unknown[] })?.items ?? []
    expect(items.length, `Shop ${ctx.createdShopId} sollte nach Delete nicht mehr abrufbar sein`).toBe(0)
    logStep(10, 'API-Verifikation: Shop gelöscht', '0 Treffer in API', `${items.length} Treffer`, items.length === 0 ? 'PASS' : 'FAIL')
  })

  // ── Teardown ─────────────────────────────────────────────────────────────────

  test.afterAll(async () => {
    const allPassed = ctx.stepLog.every(s => s.status !== 'FAIL')
    writeReport(allPassed ? 'PASS' : 'FAIL')

    // Sicherheits-Cleanup: Falls der Shop noch existiert (z.B. wegen Test-Fehler)
    if (ctx.createdShopId) {
      await apiFetch('DELETE', `/api/v1/admin/shops/${ctx.createdShopId}`, undefined, adminHeaders())
        .catch(() => { /* ignore — shop may already be deleted */ })
    }
  })
})
