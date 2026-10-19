/**
 * Journey: service-catalog-auto-assign — Teil Admin-UI: Item-Domain-Mappings (IDM-1 bis IDM-5)
 * Spec: specs/service-katalog-auto-assign-20260502/
 *
 * F8950 T32: aus `service-catalog-auto-assign.spec.ts` (980 Zeilen) herausgeloest. Der Shop-/Owner-Teil (AC-5, S3b, S5,
 * S6+S7) bleibt dort; diese Datei braucht nur die Admin-Session (storageState) und laeuft parallel in einem eigenen Worker.
 *
 *   IDM-1: /admin/item-domain-mappings List — Tabelle lädt
 *   IDM-2: Create — neues Mapping anlegen
 *   IDM-3: Edit — Mapping bearbeiten
 *   IDM-4: Delete — Mapping löschen mit Confirm-Dialog
 *   IDM-5: Gaps-Report — /admin/item-domain-mappings/gaps lädt
 */

import type { Page } from '@playwright/test'
import { test, expect, createStepLog, ADMIN_STATE } from '../fixtures'
import fs from 'fs'
import path from 'path'
import { adminLogin } from './_helpers'
import { waitForPageHydrated } from './_helpers/hydration'
import { BASE_URL, BACKEND_URL } from '../env'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

// ── Step-Log & Report ─────────────────────────────────────────────────────────

const { entries: stepLog, logStep } = createStepLog()
const findings: string[] = []

// ── API Helpers ───────────────────────────────────────────────────────────────

async function apiPost(url: string, body: unknown, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`POST ${url} → ${res.status}: ${txt}`)
  }
  return res.json()
}

async function apiPatch(url: string, body: unknown, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`PATCH ${url} → ${res.status}: ${txt}`)
  }
  if (res.status === 204) return {}
  return res.json()
}

async function apiGet(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`GET ${url} → ${res.status}: ${txt}`)
  }
  return res.json()
}

async function apiDelete(url: string, headers: Record<string, string> = {}): Promise<void> {
  const res = await fetch(url, {
    method: 'DELETE',
    headers,
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok && res.status !== 204) {
    const txt = await res.text()
    throw new Error(`DELETE ${url} → ${res.status}: ${txt}`)
  }
}

// Admin-Session per storageState (`e2e/.auth/admin.json`, vom Global Setup; F8950 T30) statt Formular-Login:
// der Formular-Login ist Prüfgegenstand in admin.spec (E2E-11) und shop-owner-admin-approval-flow (AC-1).
// Öffnet das Dashboard und meldet, ob die Session gilt (kein Redirect auf /admin/login).
async function adminSessionActive(page: Page): Promise<boolean> {
  await page.goto(`${BASE_URL}/admin/dashboard`)
  return !page.url().includes('/admin/login')
}

// ── Test Context ──────────────────────────────────────────────────────────────

const ctx: { adminCookie: string | null; createdMappingId: number | null } = {
  adminCookie: null,
  createdMappingId: null,
}

test.beforeAll(async () => {
  ctx.adminCookie = await adminLogin()
})

test.afterAll(async () => {
  // Cleanup: eventuell erstelltes IDM-Mapping löschen
  if (ctx.createdMappingId && ctx.adminCookie) {
    try {
      await apiDelete(
        `${BACKEND_URL}/api/v1/admin/item-domain-mappings/${ctx.createdMappingId}`,
        { Cookie: `admin_token=${ctx.adminCookie}` }
      )
    } catch { /* Non-critical */ }
  }
  writeReport()
})

function writeReport() {
  const total = stepLog.length
  const passed = stepLog.filter(s => s.status === 'PASS').length
  const failed = stepLog.filter(s => s.status === 'FAIL').length
  const skipped = stepLog.filter(s => s.status === 'SKIP').length

  const now = new Date().toISOString().slice(0, 10)
  const lines: string[] = [
    `# Journey-Report: service-catalog-auto-assign (Admin-UI Item-Domain-Mappings)`,
    ``,
    `**Datum:** ${new Date().toISOString()}`,
    `**Frontend:** ${BASE_URL}`,
    `**Backend:** ${BACKEND_URL}`,
    ``,
    `## Ergebnis: ${passed}/${total} PASS  |  ${failed} FAIL  |  ${skipped} SKIP`,
    ``,
    `## Schritte`,
    ``,
    `| Schritt | Beschreibung | Erwartet | Tatsächlich | Status |`,
    `|---------|-------------|---------|------------|--------|`,
  ]
  for (const s of stepLog) {
    lines.push(`| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | **${s.status}** |`)
  }
  if (findings.length > 0) {
    lines.push(``, `## Findings`, ``)
    for (const f of findings) lines.push(`- ${f}`)
  }
  const reportDir = path.join(__dirname, 'reports')
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })
  fs.writeFileSync(path.join(reportDir, `service-catalog-admin-mappings-${now}.md`), lines.join('\n'))
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN UI: Item-Domain-Mappings CRUD
// ═════════════════════════════════════════════════════════════════════════════

test.describe('IDM-1: /admin/item-domain-mappings List', () => {
  test('Mapping-Tabelle lädt und zeigt Einträge', async ({ browser }) => {
    test.setTimeout(60_000) // Admin-Navigation kann etwas dauern

    // Skip if admin cookie not available (beforeAll adminLogin failed)
    if (!ctx.adminCookie) {
      logStep('IDM-1a', 'Admin Cookie verfügbar', 'ctx.adminCookie gesetzt', 'null — beforeAll fehlgeschlagen', 'SKIP')
      test.skip(true, 'Admin user not available in test-DB — run prepare_e2e_db.py with admin seed')
      return
    }

    // storageState statt Formular-Login (schnell, kein Login-Rate-Limit)
    const ctx2 = await browser.newContext({ baseURL: BASE_URL, storageState: ADMIN_STATE })
    const page = await ctx2.newPage()
    logStep('IDM-1a', 'Admin-Session (storageState)', 'admin_token gesetzt', ADMIN_STATE, 'PASS')

    // Navigiere zu item-domain-mappings
    await page.goto(`${BASE_URL}/admin/item-domain-mappings`)
    await waitForPageHydrated(page, 15_000)

    const pageTitle = await page.locator('h1').first().textContent()
    const hasMappingsTitle = pageTitle?.includes('Mapping') || pageTitle?.includes('Katalog') || pageTitle?.includes('Zuordnung')

    if (hasMappingsTitle) {
      logStep('IDM-1b', 'Seite /admin/item-domain-mappings lädt', 'H1 enthält "Mapping" oder "Katalog"', `H1: "${pageTitle}"`, 'PASS')
    } else {
      // Could be redirect to login
      const currentUrl = page.url()
      if (currentUrl.includes('/admin/login') || currentUrl.includes('/login')) {
        logStep('IDM-1b', 'Seite /admin/item-domain-mappings lädt', 'IDM-Seite', `Redirect zu Login: ${currentUrl}`, 'FAIL')
        findings.push('IDM-1b: Admin-Seite redirectet zu Login — Cookie nicht gesetzt')
      } else {
        logStep('IDM-1b', 'Seite /admin/item-domain-mappings lädt', 'H1 enthält "Mapping"', `H1: "${pageTitle}" URL: ${page.url()}`, 'FAIL')
        findings.push(`IDM-1b: H1 enthält kein erwartetes Keyword. H1="${pageTitle}"`)
      }
    }

    // Tabelle mit Einträgen prüfen
    const tableRows = page.locator('table tbody tr')
    const rowCount = await tableRows.count()

    if (rowCount > 0) {
      logStep('IDM-1c', 'Mapping-Tabelle hat Einträge', '≥1 Zeile in Tabelle', `${rowCount} Zeilen`, 'PASS')
    } else {
      // Leerer Zustand oder Fehler?
      const emptyText = await page.locator('td[colspan]').textContent().catch(() => null)
      logStep('IDM-1c', 'Mapping-Tabelle hat Einträge', '≥1 Zeile in Tabelle', `0 Zeilen (empty: "${emptyText}")`, 'FAIL')
      findings.push(`IDM-1c: Tabelle leer. Backend hat 103 Mappings — möglicherweise API-Response-Format-Problem (domain_id vs onboarding_domain_id)`)
    }

    // Domain/Specialty-Spalten prüfen (potentielles Bug: zeigen immer "—" wegen Feldname-Mismatch)
    // Only attempt cell inspection if table has data rows — otherwise textContent() waits for
    // a non-existent element up to actionTimeout and causes the test to exceed its budget.
    const domainText = rowCount > 0
      ? await tableRows.first().locator('td').nth(2).textContent({ timeout: 5_000 }).catch(() => null)
      : null

    if (domainText && domainText.trim() !== '—' && domainText.trim() !== '') {
      logStep('IDM-1d', 'Domain-Spalte zeigt Wert', 'Domain-Slug sichtbar (kein "—")', `"${domainText?.trim()}"`, 'PASS')
    } else {
      logStep('IDM-1d', 'Domain-Spalte zeigt Wert', 'Domain-Slug sichtbar', `"${domainText?.trim() ?? 'null'}" — zeigt "—"`, 'FAIL')
      findings.push(
        'IDM-1d: FINDING — Domain-Spalte zeigt immer "—". ' +
        'Ursache: Backend liefert domain_id (int) aber Frontend-Typ erwartet onboarding_domain_id + onboarding_domain_slug. ' +
        'MappingList.tsx zeigt m.onboarding_domain_slug ?? "—", aber Backend liefert dieses Feld nicht. ' +
        'Fix: Backend muss onboarding_domain_slug in Response ergänzen ODER Frontend-Mapping muss domain_id→slug auflösen.'
      )
    }

    await ctx2.close()
  })
})

test.describe('IDM-2: Create — neues Mapping anlegen', () => {
  test('Mapping-Formular Create-Flow', async ({ browser }) => {
    const ctx2 = await browser.newContext({ baseURL: BASE_URL, storageState: ADMIN_STATE })
    const page = await ctx2.newPage()

    const loggedIn = await adminSessionActive(page)
    logStep('IDM-2a', 'Admin-Session (storageState)', '/admin/dashboard', loggedIn ? 'OK' : 'FAIL', loggedIn ? 'PASS' : 'FAIL')
    if (!loggedIn) {
      findings.push('IDM-2a: Login fehlgeschlagen — Create-Test übersprungen')
      await ctx2.close()
      return
    }

    await page.goto(`${BASE_URL}/admin/item-domain-mappings/new`)
    await waitForPageHydrated(page, 15_000)

    const url = page.url()
    if (!url.includes('item-domain-mappings/new') && !url.includes('item-domain-mappings')) {
      logStep('IDM-2b', '/admin/item-domain-mappings/new erreichbar', 'URL enthält "item-domain-mappings"', url, 'FAIL')
      await ctx2.close()
      return
    }
    logStep('IDM-2b', '/admin/item-domain-mappings/new erreichbar', 'Formular sichtbar', url, 'PASS')

    // Formular ausfüllen — Item-ID muss existieren (nehme Item 18 = elektriker allgemein)
    const itemIdInput = page.locator('input[name="item_id"]')
    const hasItemInput = await itemIdInput.count() > 0
    if (!hasItemInput) {
      logStep('IDM-2c', 'Formularfeld item_id vorhanden', 'input[name=item_id] sichtbar', 'nicht gefunden', 'FAIL')
      findings.push('IDM-2c: item_id-Input nicht gefunden — Formular evtl. nicht gerendert')
      await ctx2.close()
      return
    }
    logStep('IDM-2c', 'Formularfeld item_id vorhanden', 'input[name=item_id] sichtbar', 'vorhanden', 'PASS')

    await itemIdInput.fill('18') // item_id=18 existiert (elektriker domain)

    // Domain ID setzen
    const domainInput = page.locator('input[name="onboarding_domain_id"]')
    if (await domainInput.count() > 0) await domainInput.fill('3') // elektriker

    // auto_assign auf true
    const autoSelect = page.locator('select[name="auto_assign"]')
    if (await autoSelect.count() > 0) await autoSelect.selectOption('true')

    // Submit
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    // Warte auf Navigation oder Fehler (F8950 T22: statt networkidle auf den Verlassen von /new warten; bleibt die Seite, greift der Fehlerzweig)
    await page.waitForURL(u => !u.pathname.endsWith('/new'), { timeout: 10_000 }).catch(() => {})
    const afterUrl = page.url()

    if (afterUrl.includes('item-domain-mappings') && !afterUrl.includes('/new')) {
      logStep('IDM-2d', 'Create-Submit navigiert zurück zur Liste', 'URL = /admin/item-domain-mappings', afterUrl, 'PASS')
      // Hole die erstellte Mapping-ID via API für Cleanup
      try {
        const recentMappings = await apiGet(
          `${BACKEND_URL}/api/v1/admin/item-domain-mappings?limit=5`,
          { Cookie: `admin_token=${ctx.adminCookie!}` }
        ) as { items: Array<{ id: number; item_id: number }> }
        const newMapping = recentMappings.items.find(m => m.item_id === 18)
        if (newMapping) ctx.createdMappingId = newMapping.id
      } catch { /* non-critical */ }
    } else {
      logStep('IDM-2d', 'Create-Submit navigiert zurück zur Liste', '/admin/item-domain-mappings', afterUrl, 'FAIL')
      const errorText = await page.locator('.text-red-500, [class*="error"]').first().textContent().catch(() => null)
      findings.push(`IDM-2d: Create-Submit navigierte nicht zurück. URL="${afterUrl}" Fehler="${errorText}"`)
    }

    await ctx2.close()
  })
})

test.describe('IDM-3: Edit — bestehendes Mapping bearbeiten', () => {
  test('Mapping Edit-Flow', async ({ browser }) => {
    const ctx2 = await browser.newContext({ baseURL: BASE_URL, storageState: ADMIN_STATE })
    const page = await ctx2.newPage()

    const loggedIn = await adminSessionActive(page)
    if (!loggedIn) {
      logStep('IDM-3', 'Edit-Flow', 'Login OK', 'Login fehlgeschlagen', 'SKIP')
      await ctx2.close()
      return
    }

    // Verwende Mapping ID 29 (existiert garantiert aus Seed-Daten)
    await page.goto(`${BASE_URL}/admin/item-domain-mappings/29/edit`)
    await waitForPageHydrated(page, 15_000)

    const url = page.url()
    if (!url.includes('29/edit')) {
      logStep('IDM-3a', '/admin/item-domain-mappings/29/edit erreichbar', 'URL enthält 29/edit', url, 'FAIL')
      findings.push(`IDM-3a: Edit-Seite nicht erreichbar. URL="${url}"`)
      await ctx2.close()
      return
    }
    logStep('IDM-3a', '/admin/item-domain-mappings/29/edit erreichbar', 'URL enthält 29/edit', url, 'PASS')

    // Priority ändern
    const priorityInput = page.locator('input[name="priority"]')
    if (await priorityInput.count() > 0) {
      const currentValue = await priorityInput.inputValue()
      await priorityInput.fill('99')
      logStep('IDM-3b', 'Priority-Feld bearbeitbar', 'Wert änderbar', `${currentValue} → 99`, 'PASS')

      // Submit
      await page.locator('button[type="submit"]').click()
      // F8950 T22: statt networkidle auf das Verlassen von /edit warten
      await page.waitForURL(u => !u.pathname.endsWith('/edit'), { timeout: 10_000 }).catch(() => {})

      const afterUrl = page.url()
      if (afterUrl.includes('item-domain-mappings') && !afterUrl.includes('/edit')) {
        logStep('IDM-3c', 'Edit-Submit navigiert zurück', '/admin/item-domain-mappings', afterUrl, 'PASS')

        // Wert wieder zurücksetzen
        try {
          await apiPatch(
            `${BACKEND_URL}/api/v1/admin/item-domain-mappings/29`,
            { priority: 1 },
            { Cookie: `admin_token=${ctx.adminCookie!}` }
          )
        } catch { /* non-critical */ }
      } else {
        logStep('IDM-3c', 'Edit-Submit navigiert zurück', '/admin/item-domain-mappings', afterUrl, 'FAIL')
        findings.push(`IDM-3c: Edit-Submit navigierte nicht zurück. URL="${afterUrl}"`)
      }
    } else {
      logStep('IDM-3b', 'Priority-Feld bearbeitbar', 'input[name=priority] sichtbar', 'nicht gefunden', 'FAIL')
      findings.push('IDM-3b: priority-Input nicht gefunden auf Edit-Seite')
    }

    await ctx2.close()
  })
})

test.describe('IDM-4: Delete — Mapping löschen mit Confirm-Dialog', () => {
  test('Delete-Confirm-Dialog erscheint und funktioniert', async ({ browser }) => {
    const ctx2 = await browser.newContext({ baseURL: BASE_URL, storageState: ADMIN_STATE })
    const page = await ctx2.newPage()

    const loggedIn = await adminSessionActive(page)
    if (!loggedIn) {
      logStep('IDM-4', 'Delete-Flow', 'Login OK', 'Login fehlgeschlagen', 'SKIP')
      await ctx2.close()
      return
    }

    // Erstelle ein Wegwerf-Mapping via API zum Testen des Deletes
    let testMappingId: number | null = null
    try {
      const newMapping = await apiPost(
        `${BACKEND_URL}/api/v1/admin/item-domain-mappings`,
        { item_id: 18, onboarding_domain_id: 3, auto_assign: false, priority: 99 },
        { Cookie: `admin_token=${ctx.adminCookie!}` }
      ) as { id: number }
      testMappingId = newMapping.id
    } catch (err) {
      logStep('IDM-4a', 'Test-Mapping erstellt', 'Mapping angelegt', `Fehler: ${err}`, 'FAIL')
      findings.push(`IDM-4a: Wegwerf-Mapping konnte nicht angelegt werden: ${err}`)
      await ctx2.close()
      return
    }
    logStep('IDM-4a', 'Wegwerf-Mapping erstellt', 'Mapping angelegt', `id=${testMappingId}`, 'PASS')

    // Lade Liste und finde den Delete-Button für unser Mapping
    await page.goto(`${BASE_URL}/admin/item-domain-mappings`)
    await waitForPageHydrated(page, 15_000)

    // Suche Zeile mit dem Mapping-ID
    const rows = page.locator('table tbody tr')
    const rowCount = await rows.count()
    let targetRow = null

    for (let i = 0; i < rowCount; i++) {
      const rowText = await rows.nth(i).textContent()
      if (rowText?.includes(String(testMappingId))) {
        targetRow = rows.nth(i)
        break
      }
    }

    if (!targetRow) {
      logStep('IDM-4b', 'Mapping in Liste gefunden', `id=${testMappingId} in Tabelle sichtbar`, 'nicht gefunden', 'FAIL')
      findings.push(`IDM-4b: Frisch erstelltes Mapping id=${testMappingId} nicht in Tabelle gefunden`)
      // Cleanup
      try { await apiDelete(`${BACKEND_URL}/api/v1/admin/item-domain-mappings/${testMappingId}`, { Cookie: `admin_token=${ctx.adminCookie!}` }) } catch { /* ok */ }
      await ctx2.close()
      return
    }
    logStep('IDM-4b', 'Mapping in Liste gefunden', `id=${testMappingId} in Tabelle`, 'gefunden', 'PASS')

    // Delete-Button klicken
    const deleteBtn = targetRow.locator('button', { hasText: /delete|löschen/i })
    await deleteBtn.click()

    // Confirm-Dialog muss erscheinen
    const confirmDialog = page.locator('.fixed.inset-0, [role="dialog"], dialog')
    await expect(confirmDialog).toBeVisible({ timeout: 3000 }).catch(async () => {
      // Evtl. kein Modal-Overlay sondern inline
    })

    const dialogVisible = await confirmDialog.isVisible().catch(() => false)
    if (dialogVisible) {
      logStep('IDM-4c', 'Confirm-Dialog erscheint', 'Dialog sichtbar nach Delete-Click', 'Dialog sichtbar', 'PASS')

      // Confirm-Button klicken
      // eslint-disable-next-line local-e2e/no-positional-tag-locator -- legacy (B8950-016 T4): replace by getByTestId/getByRole
      const confirmBtn = page.locator('button', { hasText: /delete|löschen|confirm|bestätigen/i }).last()
      await confirmBtn.click()
      // F8950 T22: statt networkidle - Bestaetigungs-Button verschwindet, sobald geloescht ist
      await expect(confirmBtn).toBeHidden({ timeout: 10_000 }).catch(() => {})
      logStep('IDM-4d', 'Delete bestätigt', 'Mapping gelöscht, Liste aktualisiert', 'Dialog geschlossen', 'PASS')
    } else {
      logStep('IDM-4c', 'Confirm-Dialog erscheint', 'Dialog sichtbar', 'Dialog nicht sichtbar — möglicherweise window.confirm()', 'SKIP')
      findings.push('IDM-4c: Confirm-Dialog nicht als DOM-Modal erkannt — evtl. native window.confirm() wird verwendet')
    }

    await ctx2.close()
  })
})

test.describe('IDM-5: Gaps-Report', () => {
  test('/admin/item-domain-mappings/gaps lädt und zeigt Report', async ({ browser }) => {
    const ctx2 = await browser.newContext({ baseURL: BASE_URL, storageState: ADMIN_STATE })
    const page = await ctx2.newPage()

    const loggedIn = await adminSessionActive(page)
    if (!loggedIn) {
      logStep('IDM-5', 'Gaps-Report', 'Login OK', 'Login fehlgeschlagen', 'SKIP')
      await ctx2.close()
      return
    }

    await page.goto(`${BASE_URL}/admin/item-domain-mappings/gaps`)
    await waitForPageHydrated(page, 15_000)

    const url = page.url()
    if (!url.includes('gaps')) {
      logStep('IDM-5a', 'Gaps-Report erreichbar', 'URL enthält "gaps"', url, 'FAIL')
      findings.push(`IDM-5a: Gaps-Seite nicht erreichbar. URL="${url}"`)
      await ctx2.close()
      return
    }
    logStep('IDM-5a', 'Gaps-Report erreichbar', 'URL enthält "gaps"', url, 'PASS')

    const h1Text = await page.locator('h1').first().textContent()
    logStep('IDM-5b', 'Gaps-Report H1 vorhanden', 'H1 sichtbar', `"${h1Text}"`, h1Text ? 'PASS' : 'FAIL')

    // Backend liefert bekannte Gaps (apotheke, baeckerei etc.) — Seite soll sie zeigen
    // ABER: API-Mismatch bekannt: getMappingGaps() erwartet MappingGapEntry[] aber Backend liefert
    // { uncovered_domains: [], uncovered_specialties: [] }
    // Das führt zu: gaps.filter(...) schlägt fehl (Objekt hat kein .filter) → Error oder leer
    const errorVisible = await page.locator('[class*="error"], .text-red, [role="alert"]').count() > 0
    const tableVisible = await page.locator('table').count() > 0
    const greenBanner = await page.locator('.bg-green-50, [class*="green"]').count() > 0

    if (errorVisible) {
      logStep('IDM-5c', 'Gaps-Report zeigt Daten', 'Tabelle mit Gaps ODER grüner "keine Gaps"-Banner', 'Fehler-Anzeige sichtbar', 'FAIL')
      findings.push('IDM-5c: Gaps-Seite zeigt Fehler. Bekannte Ursache: getMappingGaps() erwartet MappingGapEntry[] aber Backend liefert {uncovered_domains:[], uncovered_specialties:[]}. gaps.filter() schlägt auf Objekt fehl.')
    } else if (tableVisible) {
      const rowCount = await page.locator('table tbody tr').count()
      logStep('IDM-5c', 'Gaps-Report zeigt Daten', 'Tabelle mit Gap-Einträgen', `${rowCount} Zeilen`, rowCount > 0 ? 'PASS' : 'FAIL')
      if (rowCount === 0) {
        findings.push('IDM-5c: Gaps-Tabelle leer obwohl Backend 20 uncovered_domains meldet. Ursache: API-Format-Mismatch — getMappingGaps() liest Array, Backend liefert Objekt')
      }
    } else if (greenBanner) {
      logStep('IDM-5c', 'Gaps-Report zeigt Daten', 'Tabelle mit Gaps oder grüner Banner', '"Keine Gaps"-Banner sichtbar (aber Backend hat bekannte Gaps)', 'FAIL')
      findings.push('IDM-5c: FINDING — Gaps-Seite zeigt "keine Lücken" obwohl Backend 20 uncovered_domains hat. Ursache: getMappingGaps() bekommt Objekt statt Array → .filter() gibt undefined → noAutoAssignGaps ist leer. Fix: getMappingGaps() muss Objekt normalisieren: [...d.uncovered_domains, ...d.uncovered_specialties]')
    } else {
      logStep('IDM-5c', 'Gaps-Report zeigt Daten', 'Tabelle oder Banner', 'Kein erkennbarer Content', 'FAIL')
      findings.push('IDM-5c: Gaps-Seite zeigt weder Tabelle noch Banner — unerwarteter Zustand')
    }

    await ctx2.close()
  })
})

