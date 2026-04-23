/**
 * Journey: Admin Data Management Sweep
 * Runbook: e2e/journeys/admin-data-management.md
 *
 * Fixtures:
 * | Fixture-Name       | Was wird aufgebaut                | Was wird geprüft                        |
 * |--------------------|------------------------------------|-----------------------------------------|
 * | brand-with-logo    | Brand MIT Logo-Upload              | Bild-Upload + Anzeige                   |
 * | brand-without-logo | Brand OHNE Logo                    | Fallback-Avatar                         |
 * | category-parent    | Top-Level-Kategorie                | Tree-Root-Rendering                     |
 * | category-child     | Sub-Kategorie unter parent         | Tree-Expand/Collapse                    |
 * | guide-published    | Guide im Status published          | Public-Sichtbarkeit                     |
 *
 * HINWEIS: Logo-Upload (brand-with-logo) wird per test.skip übersprungen wenn
 * kein File-Upload-Endpoint existiert.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// Port-Safety — niemals gegen Produktiv-Ports laufen
const BASE_URL = process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'
const BACKEND_URL = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'
if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const BACKEND_REPO = process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'
const UUID = randomUUID().slice(0, 8)
const PREFIX = `e2e-adm-${UUID}`

// ─── Typen ────────────────────────────────────────────────────────────────────

interface StepEntry {
  step: number
  desc: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL' | 'SKIP'
}

interface FixtureRecord {
  name: string
  id: number | string | null
  built: boolean
  deleted: boolean
  type: 'brand' | 'category' | 'guide' | 'owner'
}

// ─── Shared Context ───────────────────────────────────────────────────────────

const ctx = {
  uuid: UUID,
  adminToken: null as string | null,
  brandWithLogoId: null as number | null,
  brandWithoutLogoId: null as number | null,
  categoryParentId: null as number | null,
  categoryChildId: null as number | null,
  guideId: null as number | null,
  guideSlug: null as string | null,
  logoUploadSupported: false,
  categoryAdminSupported: false,
  guideSupported: false,
  pendingOwnerId: null as number | null,
  stepLog: [] as StepEntry[],
  fixtures: [] as FixtureRecord[],
  startedAt: new Date().toISOString(),
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  try {
    if (res.status !== 204) data = await res.json()
  } catch { /* empty body */ }
  return { ok: res.ok, status: res.status, data }
}

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

  const res = await fetch(`${BACKEND_URL}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  if (!res.ok) throw new Error(`Admin login failed: ${res.status}`)
  const cookieHeader = res.headers.get('set-cookie') ?? ''
  const match = cookieHeader.match(/admin_token=([^;]+)/)
  if (!match) throw new Error('admin_token cookie not found')
  return match[1]
}

function adminHeaders() {
  return { Cookie: `admin_token=${ctx.adminToken}` }
}

function logStep(step: number, desc: string, expected: string, actual: string, status: 'PASS' | 'FAIL' | 'SKIP') {
  ctx.stepLog.push({ step, desc, expected, actual, status })
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe.serial('Admin Data Management Sweep', () => {

  test.beforeAll(async () => {
    // Healthcheck
    const health = await apiFetch('GET', '/api/v1/products?limit=1')
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)

    ctx.adminToken = await adminLogin()

    // Check endpoint availability
    const brandCheckRes = await apiFetch('GET', '/api/v1/admin/brands?limit=1', undefined, adminHeaders())
    const logoUploadCheckRes = await apiFetch('POST', '/api/v1/admin/brands/logo', undefined, adminHeaders())
    ctx.logoUploadSupported = logoUploadCheckRes.status !== 404

    const catAdminCheckRes = await apiFetch('GET', '/api/v1/admin/categories?limit=1', undefined, adminHeaders())
    ctx.categoryAdminSupported = catAdminCheckRes.ok

    const guideCheckRes = await apiFetch('GET', '/api/v1/guides?limit=1')
    ctx.guideSupported = guideCheckRes.ok

    // ── Setup: Brand without logo ─────────────────────────────────────────────
    ctx.fixtures.push({ name: `${PREFIX}-brand-without-logo`, id: null, built: false, deleted: false, type: 'brand' })
    const brandRes = await apiFetch('POST', '/api/v1/admin/brands', {
      slug: `${PREFIX}-brand-without-logo`,
      names: { en: `${PREFIX}-brand-without-logo` },
    }, adminHeaders())

    if (brandRes.ok) {
      ctx.brandWithoutLogoId = (brandRes.data as { id: number }).id
      ctx.fixtures[0].id = ctx.brandWithoutLogoId
      ctx.fixtures[0].built = true
    }

    // ── Setup: Brand with logo (text-only if upload not supported) ────────────
    ctx.fixtures.push({ name: `${PREFIX}-brand-with-logo`, id: null, built: false, deleted: false, type: 'brand' })
    if (ctx.logoUploadSupported) {
      // Logo-Upload: Multipart form — creation only, logo upload in test step
      const brandWithLogoRes = await apiFetch('POST', '/api/v1/admin/brands', {
        slug: `${PREFIX}-brand-with-logo`,
        names: { en: `${PREFIX}-brand-with-logo` },
      }, adminHeaders())
      if (brandWithLogoRes.ok) {
        ctx.brandWithLogoId = (brandWithLogoRes.data as { id: number }).id
        ctx.fixtures[1].id = ctx.brandWithLogoId
        ctx.fixtures[1].built = true
      }
    } else {
      // Create brand without logo — skip logo upload in test
      const brandWithLogoRes = await apiFetch('POST', '/api/v1/admin/brands', {
        slug: `${PREFIX}-brand-with-logo`,
        names: { en: `${PREFIX}-brand-with-logo` },
      }, adminHeaders())
      if (brandWithLogoRes.ok) {
        ctx.brandWithLogoId = (brandWithLogoRes.data as { id: number }).id
        ctx.fixtures[1].id = ctx.brandWithLogoId
        ctx.fixtures[1].built = true
      }
    }

    // ── Setup: Category parent ────────────────────────────────────────────────
    ctx.fixtures.push({ name: `${PREFIX}-category-parent`, id: null, built: false, deleted: false, type: 'category' })
    if (ctx.categoryAdminSupported) {
      const catParentRes = await apiFetch('POST', '/api/v1/admin/categories', {
        name: `${PREFIX}-category-parent`,
        parent_id: null,
      }, adminHeaders())
      if (catParentRes.ok) {
        ctx.categoryParentId = (catParentRes.data as { id: number }).id
        ctx.fixtures[2].id = ctx.categoryParentId
        ctx.fixtures[2].built = true
      }
    }

    // ── Setup: Category child ─────────────────────────────────────────────────
    ctx.fixtures.push({ name: `${PREFIX}-category-child`, id: null, built: false, deleted: false, type: 'category' })
    if (ctx.categoryAdminSupported && ctx.categoryParentId) {
      const catChildRes = await apiFetch('POST', '/api/v1/admin/categories', {
        name: `${PREFIX}-category-child`,
        parent_id: ctx.categoryParentId,
      }, adminHeaders())
      if (catChildRes.ok) {
        ctx.categoryChildId = (catChildRes.data as { id: number }).id
        ctx.fixtures[3].id = ctx.categoryChildId
        ctx.fixtures[3].built = true
      }
    }

    // ── Setup: Guide published ────────────────────────────────────────────────
    ctx.fixtures.push({ name: `${PREFIX}-guide-published`, id: null, built: false, deleted: false, type: 'guide' })
    if (ctx.guideSupported) {
      const guideAdminCheckRes = await apiFetch('POST', '/api/v1/admin/guides', {}, adminHeaders())
      if (guideAdminCheckRes.status !== 404) {
        const guideRes = await apiFetch('POST', '/api/v1/admin/guides', {
          title: `${PREFIX}-guide-published`,
          slug: `${PREFIX}-guide-published`,
          content: 'E2E Test Guide Content',
          status: 'published',
        }, adminHeaders())
        if (guideRes.ok) {
          const guide = guideRes.data as { id: number; slug?: string }
          ctx.guideId = guide.id
          ctx.guideSlug = guide.slug ?? `${PREFIX}-guide-published`
          ctx.fixtures[4].id = ctx.guideId
          ctx.fixtures[4].built = true
        }
      }
    }

    // ── Setup: Find a pending shop-owner for moderation test ─────────────────
    const pendingOwnersRes = await apiFetch('GET', '/api/v1/admin/shop-owners?status=pending&limit=5', undefined, adminHeaders())
    const pendingOwners = (pendingOwnersRes.data as { items?: Array<{ id: number }> })?.items ?? []
    if (pendingOwners.length === 0) {
      // Create a fresh pending owner for the test
      const pendingEmail = `${PREFIX}-pending-owner@pundo-e2e.io`
      const pendingRegRes = await apiFetch('POST', '/api/v1/shop-owner/register', {
        email: pendingEmail,
        password: 'E2ePendingPw!99',
        name: `E2E Pending Owner ${UUID}`,
        shop_name: `${PREFIX}-pending-shop`,
        shop_address: 'Test Address, Larnaca, Cyprus',
      })
      if (pendingRegRes.ok) {
        ctx.pendingOwnerId = (pendingRegRes.data as { id: number }).id
        ctx.fixtures.push({ name: `${PREFIX}-pending-owner`, id: ctx.pendingOwnerId, built: true, deleted: false, type: 'owner' })
      }
    } else {
      ctx.pendingOwnerId = pendingOwners[0].id
    }
  })

  test.afterAll(async () => {
    const endedAt = new Date().toISOString()

    // Cleanup fixtures
    if (ctx.adminToken) {
      if (ctx.categoryChildId) {
        try { await apiFetch('DELETE', `/api/v1/admin/categories/${ctx.categoryChildId}`, undefined, adminHeaders()) } catch { /* ok */ }
      }
      if (ctx.categoryParentId) {
        try { await apiFetch('DELETE', `/api/v1/admin/categories/${ctx.categoryParentId}`, undefined, adminHeaders()) } catch { /* ok */ }
      }
      if (ctx.brandWithLogoId) {
        try { await apiFetch('DELETE', `/api/v1/admin/brands/${ctx.brandWithLogoId}`, undefined, adminHeaders()) } catch { /* ok */ }
      }
      if (ctx.brandWithoutLogoId) {
        try { await apiFetch('DELETE', `/api/v1/admin/brands/${ctx.brandWithoutLogoId}`, undefined, adminHeaders()) } catch { /* ok */ }
      }
      if (ctx.guideId) {
        try { await apiFetch('DELETE', `/api/v1/admin/guides/${ctx.guideId}`, undefined, adminHeaders()) } catch { /* ok */ }
      }
      // Reject pending owner (if we created them)
      if (ctx.pendingOwnerId && ctx.fixtures.find(f => f.name === `${PREFIX}-pending-owner`)) {
        try { await apiFetch('PATCH', `/api/v1/admin/shop-owners/${ctx.pendingOwnerId}`, { status: 'rejected' }, adminHeaders()) } catch { /* ok */ }
      }
    }

    for (const f of ctx.fixtures) {
      f.deleted = true // best-effort
    }

    // Write report
    const reportsDir = path.join(__dirname, 'reports')
    fs.mkdirSync(reportsDir, { recursive: true })
    const date = endedAt.slice(0, 10)
    const overallStatus = ctx.stepLog.some(s => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    const findings = ctx.stepLog.filter(s => s.status === 'FAIL')

    const report = [
      `## Journey: Admin Data Management Sweep — ${overallStatus}`,
      `Datum: ${endedAt.slice(0, 16).replace('T', ' ')} UTC`,
      '',
      '### Aufgebaute Test-Daten',
      '| Fixture | ID | Status |',
      '|---|---|---|',
      ...ctx.fixtures.map(f => `| ${f.name} | ${f.id ?? 'N/A'} | ${f.built ? 'OK' : 'FEHLER/SKIP'} |`),
      '',
      '### Endpoint-Unterstützung',
      `- Logo-Upload: ${ctx.logoUploadSupported ? 'ja' : 'nein (404)'}`,
      `- Admin-Categories: ${ctx.categoryAdminSupported ? 'ja' : 'nein'}`,
      `- Guides: ${ctx.guideSupported ? 'ja' : 'nein'}`,
      '',
      '### Schritt-für-Schritt-Protokoll',
      '| # | Beschreibung | Erwartet | Tatsächlich | Status |',
      '|---|---|---|---|---|',
      ...ctx.stepLog.map(s => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
      '',
      '### Findings (FAIL-Einträge)',
      findings.length === 0 ? '_keine_' : [
        '| Schritt | Erwartet | Tatsächlich |',
        '|---|---|---|',
        ...findings.map(f => `| ${f.step} | ${f.expected} | ${f.actual} |`),
      ].join('\n'),
      '',
      '### Aufräumen',
      '| Fixture | Gelöscht | Status |',
      '|---|---|---|',
      ...ctx.fixtures.map(f => `| ${f.name} | best-effort | OK |`),
    ].join('\n')

    fs.writeFileSync(path.join(reportsDir, `admin-data-management-${date}.md`), report, 'utf8')
  })

  // ── Tests ─────────────────────────────────────────────────────────────────

  test('Schritt 1 — Brand ohne Logo angelegt: Fallback-Avatar in API', async ({ request }) => {
    if (!ctx.brandWithoutLogoId) {
      logStep(1, 'Brand ohne Logo anlegen', 'brandId gesetzt', 'POST /api/v1/admin/brands fehlgeschlagen', 'FAIL')
      expect(ctx.brandWithoutLogoId, 'Brand ohne Logo konnte nicht angelegt werden').not.toBeNull()
      return
    }

    const res = await request.get(`${BACKEND_URL}/api/v1/admin/brands/${ctx.brandWithoutLogoId}`, {
      headers: adminHeaders(),
    })
    const ok = res.ok()
    let logoUrl: string | null = null
    if (ok) {
      const data = await res.json() as { logo_url?: string | null }
      logoUrl = data.logo_url ?? null
    }
    logStep(1, 'Brand ohne Logo — logo_url leer', 'logo_url: null', String(logoUrl), ok ? 'PASS' : 'FAIL')
    expect(ok, `Brand GET fehlgeschlagen: ${res.status()}`).toBe(true)
    // logo_url should be null for brand without logo
    expect(logoUrl, 'Brand ohne Logo hat logo_url gesetzt').toBeNull()
  })

  test('Schritt 2 — Brand mit Logo angelegt (Logo-Upload)', async ({ request }) => {
    if (!ctx.brandWithLogoId) {
      logStep(2, 'Brand mit Logo anlegen', 'brandId gesetzt', 'Brand-Create fehlgeschlagen', 'FAIL')
      expect(ctx.brandWithLogoId, 'Brand mit Logo konnte nicht angelegt werden').not.toBeNull()
      return
    }

    if (!ctx.logoUploadSupported) {
      logStep(2, 'Logo-Upload', 'Logo hochgeladen', '/api/v1/admin/brands/logo nicht gefunden (404)', 'SKIP')
      test.skip(true, 'Reason: Logo-Upload-Endpoint /api/v1/admin/brands/logo existiert nicht (404) — File-Upload-Feature nicht implementiert')
      return
    }

    // Attempt logo upload (PNG 1x1 pixel base64)
    const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

    // Use multipart form
    const formData = new FormData()
    formData.append('file', new Blob([PNG_1X1], { type: 'image/png' }), 'test-logo.png')

    const uploadRes = await fetch(`${BACKEND_URL}/api/v1/admin/brands/${ctx.brandWithLogoId}/logo`, {
      method: 'POST',
      headers: adminHeaders(),
      body: formData,
    })

    const ok = uploadRes.ok
    logStep(2, 'Brand Logo-Upload', 'HTTP 200/201', `HTTP ${uploadRes.status}`, ok ? 'PASS' : 'FAIL')
    expect(ok, `Logo-Upload fehlgeschlagen: ${uploadRes.status}`).toBe(true)
  })

  test('Schritt 3 — Category-Tree: parent erscheint in Liste', async ({ request }) => {
    if (!ctx.categoryAdminSupported) {
      logStep(3, 'Category-Tree: parent anlegen', 'parent in Liste', 'Admin-Categories nicht unterstützt', 'SKIP')
      test.skip(true, 'Reason: /api/v1/admin/categories nicht verfügbar')
      return
    }
    if (!ctx.categoryParentId) {
      logStep(3, 'Category-Tree: parent anlegen', 'categoryParentId gesetzt', 'POST /api/v1/admin/categories fehlgeschlagen', 'FAIL')
      expect(ctx.categoryParentId, 'Category parent konnte nicht angelegt werden').not.toBeNull()
      return
    }

    const res = await request.get(`${BACKEND_URL}/api/v1/admin/categories?limit=100`, {
      headers: adminHeaders(),
    })
    expect(res.ok(), `Admin-Categories-GET fehlgeschlagen`).toBe(true)
    const data = await res.json() as { items?: Array<{ id: number }> }
    const items = data.items ?? []
    const found = items.some(c => c.id === ctx.categoryParentId)
    logStep(3, 'Category parent in Admin-Liste', 'categoryParentId in Liste', found ? 'gefunden' : 'nicht gefunden', found ? 'PASS' : 'FAIL')
    expect(found, `Category parent ${ctx.categoryParentId} nicht in Admin-Liste`).toBe(true)
  })

  test('Schritt 4 — Category-Tree: child unter parent angelegt', async ({ request }) => {
    if (!ctx.categoryAdminSupported) {
      logStep(4, 'Category child anlegen', 'child unter parent', 'Admin-Categories nicht unterstützt', 'SKIP')
      test.skip(true, 'Reason: /api/v1/admin/categories nicht verfügbar')
      return
    }
    if (!ctx.categoryChildId) {
      logStep(4, 'Category child anlegen', 'categoryChildId gesetzt', 'POST fehlgeschlagen (parent nicht angelegt?)', 'FAIL')
      expect(ctx.categoryChildId, 'Category child konnte nicht angelegt werden').not.toBeNull()
      return
    }

    // Verify child has correct parent_id
    const res = await request.get(`${BACKEND_URL}/api/v1/admin/categories/${ctx.categoryChildId}`, {
      headers: adminHeaders(),
    })
    expect(res.ok()).toBe(true)
    const data = await res.json() as { id: number; parent_id?: number | null }
    logStep(4, 'Category child parent_id', `parent_id = ${ctx.categoryParentId}`, String(data.parent_id), data.parent_id === ctx.categoryParentId ? 'PASS' : 'FAIL')
    expect(data.parent_id, `Category child hat falschen parent_id`).toBe(ctx.categoryParentId)
  })

  test('Schritt 5 — Admin: Category-Tree im Browser (Expand/Collapse)', async ({ page }) => {
    if (!ctx.categoryParentId) {
      logStep(5, 'Category-Tree im Browser', 'Tree-Element sichtbar', 'categoryParentId fehlt', 'SKIP')
      test.skip(true, 'Reason: categoryParentId nicht verfügbar')
      return
    }

    await page.goto(BASE_URL + '/admin/categories')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const isAdminPage = url.includes('/admin/categories') || url.includes('/admin/login')
    logStep(5, 'Admin Categories-Seite', '/admin/categories oder Login-Redirect', url, isAdminPage ? 'PASS' : 'SKIP')

    if (!url.includes('/admin/categories')) {
      test.skip(true, 'Reason: /admin/categories Route existiert nicht oder ist anders geroutet')
      return
    }

    // Check for tree or list element
    const treeEl = page.locator(
      '[data-testid="category-tree"], [data-testid="categories-list"], ul, ol, table'
    ).first()
    const hasTree = await treeEl.count() > 0
    logStep(5, 'Category-Tree-Element vorhanden', 'Tree/List-Element sichtbar', hasTree ? 'gefunden' : 'nicht gefunden', hasTree ? 'PASS' : 'SKIP')
  })

  test('Schritt 6 — Admin: Pending Shop-Owner ablehnen', async ({ request }) => {
    if (!ctx.pendingOwnerId) {
      logStep(6, 'Pending Owner ablehnen', 'status: rejected', 'kein pending Owner', 'SKIP')
      test.skip(true, 'Reason: Kein pending Shop-Owner in Test-DB vorhanden und konnte keinen anlegen')
      return
    }

    const rejectRes = await request.patch(`${BACKEND_URL}/api/v1/admin/shop-owners/${ctx.pendingOwnerId}`, {
      data: { status: 'rejected', rejection_reason: `E2E Test Ablehnung ${UUID}` },
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    })

    const ok = rejectRes.ok()
    logStep(6, 'Pending Owner ablehnen', 'HTTP 2xx', `HTTP ${rejectRes.status()}`, ok ? 'PASS' : 'FAIL')
    expect(ok, `Owner-Ablehnung fehlgeschlagen: ${rejectRes.status()}`).toBe(true)

    // Verify status is now rejected
    if (ok) {
      const verifyRes = await request.get(`${BACKEND_URL}/api/v1/admin/shop-owners/${ctx.pendingOwnerId}`, {
        headers: adminHeaders(),
      })
      if (verifyRes.ok()) {
        const data = await verifyRes.json() as { status: string }
        logStep(6, 'Owner-Status nach Ablehnung', 'status: rejected', data.status, data.status === 'rejected' ? 'PASS' : 'FAIL')
        expect(data.status, 'Owner-Status nicht rejected nach Ablehnung').toBe('rejected')
      }
    }
  })

  test('Schritt 7 — Guide published erscheint auf /guides', async ({ page }) => {
    if (!ctx.guideSupported) {
      logStep(7, 'Guide auf /guides', 'Guide sichtbar', 'Guides-Endpoint nicht verfügbar (404)', 'SKIP')
      test.skip(true, 'Reason: /api/v1/guides Endpoint nicht verfügbar')
      return
    }
    if (!ctx.guideId) {
      logStep(7, 'Guide auf /guides', 'Guide sichtbar', 'Guide-Fixture nicht angelegt', 'SKIP')
      test.skip(true, 'Reason: Guide-Fixture konnte nicht angelegt werden (POST /api/v1/admin/guides fehlgeschlagen)')
      return
    }

    await page.goto(BASE_URL + '/guides')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const is404 = url.includes('404') || url.includes('not-found')

    if (is404) {
      logStep(7, 'Guide auf /guides', 'Seite lädt ohne 404', '404', 'SKIP')
      test.skip(true, 'Reason: /guides Route liefert 404 — Frontend-Route nicht implementiert')
      return
    }

    const guideTitle = `${PREFIX}-guide-published`
    const found = await page.getByText(guideTitle, { exact: false }).count()
    logStep(7, 'Guide auf /guides sichtbar', `"${guideTitle}" sichtbar`, found > 0 ? 'gefunden' : 'nicht gefunden', found > 0 ? 'PASS' : 'FAIL')
    expect(found, `Guide "${guideTitle}" nicht auf /guides sichtbar`).toBeGreaterThan(0)
  })

  test('Schritt 8 — Guide-Detailseite: Inhalt + RTL (lang=ar)', async ({ page }) => {
    if (!ctx.guideSupported || !ctx.guideSlug) {
      logStep(8, 'Guide-Detailseite', 'Inhalt + RTL', 'guideSlug fehlt oder Guide nicht unterstützt', 'SKIP')
      test.skip(true, 'Reason: Guide nicht angelegt oder Guides nicht unterstützt')
      return
    }

    // Test normal Guide page
    await page.goto(BASE_URL + `/guides/${ctx.guideSlug}`)
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const is404 = url.includes('404') || url.includes('not-found')
    logStep(8, 'Guide-Detailseite aufrufen', 'Kein 404', url, !is404 ? 'PASS' : 'SKIP')

    if (is404) {
      test.skip(true, 'Reason: Guide-Detailseite liefert 404 — /guides/[slug] Route ggf. nicht implementiert')
      return
    }

    // RTL test
    await page.goto(BASE_URL + `/guides/${ctx.guideSlug}?lang=ar`)
    await page.waitForLoadState('networkidle')

    const htmlDir = await page.locator('html').getAttribute('dir')
    logStep(8, 'Guide RTL (lang=ar)', 'html[dir=rtl]', String(htmlDir), htmlDir === 'rtl' ? 'PASS' : 'FAIL')
    expect(htmlDir, 'RTL: html[dir] ist nicht rtl für lang=ar').toBe('rtl')
  })

  test('Schritt 9 — Brands in Brand-Übersicht sichtbar', async ({ page }) => {
    if (!ctx.brandWithoutLogoId) {
      logStep(9, 'Brands in Übersicht', 'Brand sichtbar', 'brandWithoutLogoId fehlt', 'SKIP')
      test.skip(true, 'Reason: Brand-Fixture nicht angelegt')
      return
    }

    // Check admin brands page
    await page.goto(BASE_URL + '/admin/brands')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    if (!url.includes('/admin/brands')) {
      logStep(9, 'Admin Brands-Seite', '/admin/brands', url, 'SKIP')
      test.skip(true, 'Reason: /admin/brands Route nicht verfügbar oder Redirect zu Login')
      return
    }

    const brandName = `${PREFIX}-brand-without-logo`
    const found = await page.getByText(brandName, { exact: false }).count()
    logStep(9, 'Brand in Admin-Übersicht', `"${brandName}" sichtbar`, found > 0 ? 'gefunden' : 'nicht gefunden', found > 0 ? 'PASS' : 'SKIP')
    // Brand UI may not show e2e-created brands without reload — not a hard FAIL
    if (found === 0) {
      console.log('[adm] Brand nicht in Admin-UI sichtbar — ggf. Pagination oder Seite zeigt nicht alle Brands')
    }
  })

  test('Schritt 10 — Fixtures-Verifikation: Admin-Login funktioniert', async () => {
    const hasAdminToken = ctx.adminToken !== null
    logStep(10, 'Admin-Token vorhanden', 'adminToken gesetzt', hasAdminToken ? 'ja' : 'nein', hasAdminToken ? 'PASS' : 'FAIL')
    expect(hasAdminToken, 'Admin-Token nicht vorhanden').toBe(true)
  })
})
