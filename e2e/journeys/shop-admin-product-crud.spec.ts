/**
 * Journey: Shop-Admin Produkt-CRUD (F6710)
 *
 * Fixtures:
 *   e2e-<run>-crud-<rand>@pundo.com — frischer Shop-Owner, via @pundo.com auto-approved
 *   (Auto-Approve ist Prüfgegenstand → Registrierung über /onboarding bleibt; Marker E2E-<RUN>-CRUD)
 *
 * Tests (browser + API, alle HART — keine stillen Skips, Setup-Lücken werfen in beforeAll):
 *   T1 — Login + Dashboard erreichbar
 *   T2 — Produkt anlegen (Name, Kategorie) → 201, im Offer-Picker auffindbar
 *   T4 — Offer-Flow erreichbar (Schritt 1 Item-Picker sichtbar)
 *   T6 — Zweites Produkt anlegen
 *
 * ENTFERNT mit Begründung (B8950-012, Korrektheits-Beweis in der Bug-Datei):
 *   T3 (Foto hochladen): /shop-admin/products/[id]/edit ist nur noch ein redirect('/shop-admin/offers')
 *      (src/app/(shop-admin)/shop-admin/(portal)/products/[id]/edit/page.tsx); dort gibt es kein input[type=file] →
 *      der Test lief seit B5900-009 nur noch als stiller test.skip. Foto-Upload ist im Angebots-Flow
 *      (OfferItemPhotos.tsx) und durch b5900-009-item-photo-upload (Upload, Titelbild, Mehrfach, Limit, RTL) abgedeckt.
 *   T5 (Kategorie wechseln via API) + Löschen in T6: die Owner-API kennt weder PATCH noch DELETE /shop-owner/items/{id}
 *      (ingestor/api/shop_owner/shop_owner_items.py: nur GET/POST /items, Foto-Routen) → der Test akzeptierte 404/405
 *      als "SKIP/WARN" und prüfte nichts. Die Kategorie-Auswahl deckt b5900-011-category-picker ab.
 *   T7 (auto_seeded Template-Produkte): Baustein B ist nie gebaut worden (skip bei count===0) — entfernt statt
 *      Quarantäne (Entscheidung 5).
 *
 * Aufräumen: Admin-Shop-Delete (kaskadiert Owner) + Admin-Item-Delete der getrackten Items.
 *
 * Ports: Frontend 3500, Backend 8500, DB: pundo_test — NEVER 3000/8000
 */

import { test, expect } from '@playwright/test'
import { shopOwnerLogin, shopOwnerOnboardWithRetry } from './_helpers'
import { TestDataTracker, e2eEmail, e2eName } from './_helpers/test-data'
import fs from 'fs'
import path from 'path'
import { openItemPickerModal } from './_helpers/hydration'

// ─── Port safety ──────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'
const BACKEND_URL =
  process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error(
    '[shop-admin-product-crud] Safety: NEVER run against prod ports 3000/8000!'
  )
}

// ─── Test identity ────────────────────────────────────────────────────────────

const EMAIL = e2eEmail('CRUD', 'pundo.com')
const PASSWORD = 'E2eTestPassword!99'
const SHOP_NAME = e2eName('CRUD', 'Shop')
const tracker = new TestDataTracker()

// ─── Shared context ───────────────────────────────────────────────────────────

interface Ctx {
  ownerId: number | null
  shopId: number | null
  ownerToken: string | null
  firstItemId: number | null
  firstItemName: string | null
  firstCategoryId: number | null
  findings: string[]
}

const ctx: Ctx = {
  ownerId: null,
  shopId: null,
  ownerToken: null,
  firstItemId: null,
  firstItemName: null,
  firstCategoryId: null,
  findings: [],
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function apiPost(urlPath: string, body: unknown, token: string) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  const data = res.status !== 204 ? await res.json() : {}
  return { status: res.status, data }
}

async function apiGet(urlPath: string, token?: string) {
  const headers: Record<string, string> = token ? authHeader(token) : {}
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    headers,
    signal: AbortSignal.timeout(30_000),
  })
  const data = res.status !== 204 ? await res.json() : {}
  return { status: res.status, data }
}

// ─── Setup & Teardown ─────────────────────────────────────────────────────────

test.beforeAll(async () => {
  // Register shop-owner via onboarding API — @pundo.com → auto-approved (Baustein A)
  const onbData = await shopOwnerOnboardWithRetry({
    email: EMAIL,
    password: PASSWORD,
    provider_type: 'haendler',
    domain_slugs: ['kleidung-mode'],
    shop_name: SHOP_NAME,
    location: { lat: 34.917, lng: 33.636 },
    contact: { phone: '+35799000001' },
    credentials: { type: 'email', email: EMAIL, password: PASSWORD, name: SHOP_NAME },
    lang: 'en',
  })
  if (onbData.status !== 'approved') {
    throw new Error(
      `SETUP BROKEN: Expected status=approved for @pundo.com but got "${onbData.status}". Is Auto-Approve deployed?`
    )
  }

  // Login → get token + cookies for browser
  const rawToken = await shopOwnerLogin(EMAIL, PASSWORD)
  ctx.ownerToken = rawToken

  // Resolve ownerId + shopId
  const meRes = await apiGet('/api/v1/shop-owner/me', rawToken)
  if (meRes.status !== 200) throw new Error(`GET /me failed: ${meRes.status}`)
  ctx.ownerId = meRes.data.id as number
  ctx.shopId = meRes.data.shop_id as number

  tracker.shop(ctx.shopId)

  // Kategorie für T2/T6 (CategoryListResponse: { items: [...] }) — Setup-Lücke = Fehler, kein Skip
  const catRes = await apiGet('/api/v1/categories')
  const catItems: Array<{ id: number }> = catRes.status === 200
    ? (Array.isArray(catRes.data) ? catRes.data : catRes.data?.items ?? [])
    : []
  if (catItems.length === 0) {
    throw new Error(`SETUP BROKEN: keine Kategorien in pundo_test (GET /categories → ${catRes.status})`)
  }
  ctx.firstCategoryId = catItems[0].id
})

test.afterAll(async () => {
  // Admin-Shop-Delete (kaskadiert den Owner) + Admin-Item-Delete der getrackten Items; wirft bei Fehlern
  const report = await tracker.cleanup()

  // Write report
  const reportDir = path.join(__dirname, 'reports')
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })
  const date = new Date().toISOString().slice(0, 10)
  const out = [
    `# Journey Report: shop-admin-product-crud (${date})`,
    '',
    `**Shop-Owner:** ${EMAIL}`,
    `**Shop ID:** ${ctx.shopId ?? 'unknown'}`,
    `**Aufgeräumt:** ${report.shopsDeleted} Shop(s), ${report.itemsDeleted} Item(s)`,
    '',
    '## Findings',
    ...ctx.findings.map(f => `- ${f}`),
  ].join('\n')
  fs.writeFileSync(path.join(reportDir, `shop-admin-product-crud-${date}.md`), out)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

async function injectOwnerCookie(page: import('@playwright/test').Page) {
  if (!ctx.ownerToken) throw new Error('No owner token — beforeAll setup failed')
  await page.context().addCookies([
    { name: 'shop_owner_token', value: ctx.ownerToken, domain: new URL(BASE_URL).hostname, path: '/' },
  ])
}

test.describe('Shop-Admin Produkt-CRUD', () => {
  test.describe.configure({ mode: 'serial' })

  test('T1 — Login + Dashboard erreichbar', async ({ page }) => {
    await injectOwnerCookie(page)
    await page.goto(`${BASE_URL}/shop-admin/dashboard`)
    await page.waitForLoadState('load')

    // Should NOT redirect to login — we're already authenticated
    expect(page.url()).not.toContain('/shop-admin/login')
    expect(page.url()).not.toContain('/shop-admin/onboarding')

    // Dashboard must be visible
    const heading = page.locator('h1, [data-testid="dashboard-heading"], nav')
    await expect(heading.first()).toBeVisible({ timeout: 10_000 })
    ctx.findings.push('T1 PASS: Dashboard erreichbar')
  })

  test('T2 — Produkt anlegen (Name, Kategorie) und im Offer-Picker finden', async ({ page }) => {
    await injectOwnerCookie(page)

    // Item per API anlegen (ItemCreateForm nutzt POST /shop-owner/items) — HART: 201 erwartet
    const itemName = e2eName('CRUD', 'Test-Produkt')
    const itemRes = await apiPost('/api/v1/shop-owner/items', {
      name_de: itemName,
      category_id: ctx.firstCategoryId,
      confirmed: true,
    }, ctx.ownerToken as string)
    expect(itemRes.status, `Item anlegen: ${JSON.stringify(itemRes.data)}`).toBe(201)
    ctx.firstItemId = itemRes.data.id as number
    ctx.firstItemName = itemName
    tracker.item(ctx.firstItemId, itemRes.data.slug as string)

    // UI: Offers-Seite lädt ohne Redirect, "neues Angebot" erreichbar
    await page.goto(`${BASE_URL}/shop-admin/offers`, { waitUntil: 'domcontentloaded' })
    expect(page.url()).not.toContain('/login')
    await expect(page.locator('a[href*="/offers/new"]').first()).toBeVisible({ timeout: 10_000 })
    ctx.findings.push(`T2 PASS: Produkt angelegt (ID=${ctx.firstItemId}), Offers-Seite erreichbar`)
  })

  test('T4 — Offer-Flow erreichbar: Schritt 1 (Item-Picker) mit dem angelegten Produkt', async ({ page }) => {
    await injectOwnerCookie(page)
    expect(ctx.firstItemName, 'T2 hat kein Item angelegt').toBeTruthy()

    // Preis wird am Angebot gesetzt, nicht am Item: der Offer-Flow beginnt mit dem Item-Picker
    await page.goto(`${BASE_URL}/shop-admin/offers/new`, { waitUntil: 'domcontentloaded' })
    expect(page.url()).not.toContain('/login')
    await openItemPickerModal(page.locator('button.border-dashed'))
    const textSearch = page.locator('input[placeholder="…"]')
    await textSearch.waitFor({ state: 'visible', timeout: 10_000 })
    await textSearch.fill(ctx.firstItemName as string)
    await expect(page.locator('ul li button').filter({ hasText: ctx.firstItemName as string }).first())
      .toBeVisible({ timeout: 10_000 })
    ctx.findings.push('T4 PASS: Offers/new erreichbar, angelegtes Produkt im Picker auffindbar')
  })

  test('T6 — Zweites Produkt anlegen', async ({ page }) => {
    await injectOwnerCookie(page)

    const itemName = e2eName('CRUD', 'Test-On-Request')
    const secondRes = await apiPost('/api/v1/shop-owner/items', {
      name_de: itemName,
      category_id: ctx.firstCategoryId,
      confirmed: true,
    }, ctx.ownerToken as string)
    expect(secondRes.status, `Zweites Item anlegen: ${JSON.stringify(secondRes.data)}`).toBe(201)
    tracker.item(secondRes.data.id as number, secondRes.data.slug as string)
    expect(secondRes.data.id).not.toBe(ctx.firstItemId)
    ctx.findings.push(`T6 PASS: Zweites Produkt angelegt (ID=${secondRes.data.id})`)

    await page.goto(`${BASE_URL}/shop-admin/offers`, { waitUntil: 'domcontentloaded' })
    expect(page.url()).not.toContain('/login')
  })
})
