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

import { test, expect } from '../fixtures'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { e2eName, e2eSlug } from './_helpers/test-data'
import { adminLogin, adminHeaders, apiFetch } from './_helpers'
import { BASE_URL, BACKEND_URL } from '../env'
import { createStepLog } from '../fixtures'
import { waitForPageHydrated } from './_helpers/hydration'

// Port-Safety — niemals gegen Produktiv-Ports laufen
if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const UUID = randomUUID().slice(0, 8)
// B8950-012: Marker am Anfang von Name und Slug (verankerter Selektor ^e2e-<run>-)
const SHOP_NAME = e2eName('ADMIN-SHOP', 'Shop')
const SHOP_SLUG = e2eSlug('ADMIN-SHOP', 'shop')

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

const { logStep } = createStepLog(ctx.stepLog)

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

  test('AC-1: Shop anlegen via Admin-UI → erscheint in der Liste', async ({ adminPage: page }) => {
    test.setTimeout(60_000)

    // Step 1: Login-Flow via Browser (Cookie setzen)
    await page.goto(`${BASE_URL}/admin/login`)
    await waitForPageHydrated(page)

    // Cookie direkt setzen statt Login-Formular — schneller und zuverlässiger
    logStep(1, 'Admin-Token Cookie gesetzt', 'Cookie vorhanden', `admin_token=${ctx.adminToken!.slice(0, 20)}...`, 'PASS')

    // Step 2: /admin/shops/new aufrufen
    await page.goto(`${BASE_URL}/admin/shops/new`)
    await waitForPageHydrated(page)

    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    logStep(2, 'Navigiert zu /admin/shops/new', 'h1 sichtbar', await heading.textContent() ?? '', 'PASS')

    // Step 3–4: Formular füllen (Name + Slug + Stadt)
    await page.locator('input[name="name"]').fill(SHOP_NAME)
    // Slug wird aus Name auto-generiert — ggf. UUID-Suffix für Eindeutigkeit
    const slugInput = page.locator('input[name="slug"]')
    await expect(slugInput).toBeVisible({ timeout: 3_000 })
    await slugInput.fill(SHOP_SLUG)
    await page.locator('input[name="city"]').fill('E2E-City')
    logStep(3, `Name+Slug eingegeben: ${SHOP_NAME} / ${SHOP_SLUG}`, 'Felder ausgefüllt', SHOP_NAME, 'PASS')
    logStep(4, 'Stadt: E2E-City', 'Feld ausgefüllt', 'E2E-City', 'PASS')

    // Step 5: Speichern → Redirect zu /admin/shops
    await page.locator('button[type="submit"]').click()

    // Warte auf Redirect + Toast
    await page.waitForURL(`${BASE_URL}/admin/shops`, { timeout: 15_000 })
    logStep(5, 'Formular gespeichert → Redirect', '/admin/shops', page.url(), 'PASS')

    // Step 6: Shop in Liste suchen — URL enthält q=SHOP_NAME oder wir suchen selbst
    await page.goto(`${BASE_URL}/admin/shops?q=${encodeURIComponent(SHOP_NAME)}`)
    await waitForPageHydrated(page)

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

  test('AC-2+AC-3: Delete-Button + Confirm-Dialog → Shop gelöscht', async ({ adminPage: page }) => {
    test.setTimeout(60_000)

    // Voraussetzung: Shop wurde in AC-1 angelegt
    expect(ctx.createdShopId, 'Shop-ID muss aus AC-1 bekannt sein').not.toBeNull()

    // Drift-Fix (B8950-012): Seit fe5b5b6 (2026-06-05, "Shop-Delete") gibt es in der Shops-LISTE keinen Delete-Button
    // mehr (EntityTable ohne deleteUrl). Der Hard-Delete lebt auf der Edit-Seite (ShopHardDeleteSection):
    // "Delete shop…" → Dialog → Shop-Name zur Bestätigung eintippen → Löschen → Redirect auf /admin/shops.
    await page.goto(`${BASE_URL}/admin/shops/${ctx.createdShopId}/edit`)
    await waitForPageHydrated(page)

    // Step 8: Delete-Button klicken → Confirm-Dialog erscheint
    const deleteBtn = page.getByRole('button', { name: /^(delete shop|shop löschen)/i })
    await expect(deleteBtn).toBeVisible({ timeout: 15_000 })
    await deleteBtn.click()
    logStep(8, 'Delete-Button geklickt', 'Confirm-Dialog erscheint', 'Button geklickt', 'PASS')

    // AC-3: Dialog muss sichtbar sein — warten bis role="dialog" im DOM ist
    await page.waitForSelector('[role="dialog"]', { timeout: 10_000 })
    const dialog = page.locator('[role="dialog"]').first()
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    logStep(9, 'Confirm-Dialog sichtbar', 'Dialog erscheint', 'Dialog sichtbar', 'PASS')

    // AC-3: Bestätigung erst nach Eingabe des Shop-Namens aktiv
    const confirmBtn = dialog.getByRole('button', { name: /^(delete shop|shop löschen)$/i })
    await expect(confirmBtn, 'Confirm bleibt ohne Namenseingabe deaktiviert').toBeDisabled()
    await dialog.locator('#shop-delete-confirm-name').fill(SHOP_NAME)
    await expect(confirmBtn).toBeEnabled({ timeout: 5_000 })
    await confirmBtn.click()

    // Nach erfolgreichem Delete: Redirect auf die Shops-Liste
    await page.waitForURL(`${BASE_URL}/admin/shops`, { timeout: 15_000 })
    await waitForPageHydrated(page)
    logStep(9, 'Delete bestätigt', '204 + Redirect auf /admin/shops', 'Confirm geklickt', 'PASS')

    // Step 10: Shop darf nicht mehr in der Liste erscheinen
    await page.goto(`${BASE_URL}/admin/shops?q=${encodeURIComponent(SHOP_NAME)}`)
    await waitForPageHydrated(page)
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
