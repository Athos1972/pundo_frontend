/**
 * Journey: Customer Auth + Interaction + Review Lifecycle
 * Runbook: e2e/journeys/customer-and-review-lifecycle.md
 *
 * F8950 T20/T22: Die Spec war gegen eine veraltete API geschrieben (`/customer/register`, `/customer/login`,
 * `POST /reviews`, `PATCH /admin/reviews/{id}`) und lief deshalb zu grossen Teilen als stiller Skip. Jetzt gegen die
 * aktuelle API: `/customer/auth/signup|login|logout|me`, `POST /customer/reviews`, `POST /admin/reviews/{id}/invalidate|restore`.
 * Zuordnung alt -> neu: Vault `03-implementation.md`, Abschnitt "Stufe 3 - Frontend".
 *
 * Fixtures:
 * | Fixture-Name   | Was wird aufgebaut                                         | Was wird geprueft                    |
 * |----------------|-------------------------------------------------------------|--------------------------------------|
 * | customer       | Frischer Customer `e2e-<run>-carl-<uuid>@pundo.com`          | Signup (auto-verified), Login, Logout|
 * | spec-shop      | Eigener Shop (specShop 'CARL') als Review-Ziel               | Review sichtbar/ausgeblendet         |
 * | review         | Review des Customers auf den Spec-Shop                       | Moderation (invalidate/restore)      |
 *
 * @pundo.com-Adressen werden automatisch verifiziert (kein OTP); das Marker-Praefix `e2e-<run>-` sorgt dafuer,
 * dass der Teardown (e2e/cleanup-run.ts) den Kunden entfernt. Den Spec-Shop loescht afterAll per Admin-API.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { RUN_ID } from './_helpers/test-data'
import { adminLogin } from './_helpers'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { waitForPageHydrated } from './_helpers/hydration'

// Port-Safety — niemals gegen Produktiv-Ports laufen
const BASE_URL = process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://127.0.0.1:3500'
const BACKEND_URL = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'
if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const UUID = randomUUID().slice(0, 8)
const PREFIX = `e2e-${RUN_ID}-carl-${UUID}`

interface StepEntry {
  step: number
  desc: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL'
}

const ctx = {
  email: `${PREFIX}@pundo.com`,
  password: 'E2eCustomerPw!99',
  customerToken: null as string | null,
  adminToken: null as string | null,
  reviewId: null as number | null,
  reviewText: `E2E Test Review ${UUID}`,
  stepLog: [] as StepEntry[],
  startedAt: new Date().toISOString(),
}

let shop: WorkerShop

function logStep(step: number, desc: string, expected: string, actual: string, status: 'PASS' | 'FAIL') {
  ctx.stepLog.push({ step, desc, expected, actual, status })
}

async function api(method: string, urlPath: string, opts: { body?: unknown; headers?: Record<string, string> } = {}) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method,
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers ?? {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  let data: unknown = {}
  try { if (res.status !== 204) data = await res.json() } catch { /* leerer Body */ }
  return { res, status: res.status, ok: res.ok, data }
}

const bearer = () => ({ Authorization: `Bearer ${ctx.customerToken}` })
const adminCookie = () => ({ Cookie: `admin_token=${ctx.adminToken}` })

async function publicShopReviews(): Promise<Array<{ id: number }>> {
  const r = await api('GET', `/api/v1/shops/${shop.id}/reviews?limit=10`)
  return ((r.data as { reviews?: Array<{ id: number }> }).reviews ?? [])
}

test.describe.serial('Customer Auth + Interaction + Review Lifecycle', () => {

  test.beforeAll(async () => {
    test.setTimeout(120_000)
    const health = await api('GET', '/api/v1/products?limit=1')
    if (!health.ok) throw new Error(`Backend health check failed: ${health.status}`)
    ctx.adminToken = await adminLogin()
    shop = await specShop('CARL')
  })

  test.afterAll(async () => {
    await shop?.destroy()

    const endedAt = new Date().toISOString()
    const reportsDir = path.join(__dirname, 'reports')
    fs.mkdirSync(reportsDir, { recursive: true })
    const overallStatus = ctx.stepLog.some(s => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    const report = [
      `## Journey: Customer Auth + Interaction + Review Lifecycle — ${overallStatus}`,
      `Datum: ${endedAt.slice(0, 16).replace('T', ' ')} UTC`,
      '',
      '### Schritt-für-Schritt-Protokoll',
      '| # | Beschreibung | Erwartet | Tatsächlich | Status |',
      '|---|---|---|---|---|',
      ...ctx.stepLog.map(s => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
      '',
      '### Aufräumen',
      `Spec-Shop per Admin-Delete entfernt; Kunde ${ctx.email} räumt der Teardown (Marker e2e-${RUN_ID}-).`,
    ].join('\n')
    fs.writeFileSync(path.join(reportsDir, `customer-and-review-lifecycle-${endedAt.slice(0, 10)}.md`), report, 'utf8')
  })

  // ── PHASE 1 — Customer-Auth ────────────────────────────────────────────────

  test('Schritt 1 — Customer registriert sich (@pundo.com wird automatisch verifiziert)', async () => {
    const r = await api('POST', '/api/v1/customer/auth/signup', {
      body: { email: ctx.email, password: ctx.password, display_name: `E2E Customer ${UUID}` },
    })
    logStep(1, 'Signup', '201, is_verified=true', `HTTP ${r.status}`, r.status === 201 ? 'PASS' : 'FAIL')
    expect(r.status, `Signup: ${JSON.stringify(r.data)}`).toBe(201)
    expect((r.data as { is_verified?: boolean }).is_verified, '@pundo.com ist sofort verifiziert').toBe(true)
  })

  test('Schritt 2 — Auth-Guard: /account ohne Login leitet zu /auth/login', async ({ browser }) => {
    // Frischer Kontext ohne Cookies
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await page.goto(BASE_URL + '/account')
      await expect(page).toHaveURL(/\/auth\/login/)
      logStep(2, 'Auth-Guard /account', 'Redirect zu /auth/login', page.url(), 'PASS')
    } finally {
      await context.close()
    }
  })

  test('Schritt 3 — Customer Login liefert Cookie und /me den Account', async () => {
    const r = await api('POST', '/api/v1/customer/auth/login', { body: { email: ctx.email, password: ctx.password } })
    expect(r.status, `Login: ${JSON.stringify(r.data)}`).toBe(200)
    const token = (r.res.headers.get('set-cookie') ?? '').match(/customer_token=([^;]+)/)?.[1] ?? null
    expect(token, 'customer_token im Set-Cookie').not.toBeNull()
    ctx.customerToken = token

    const me = await api('GET', '/api/v1/customer/auth/me', { headers: bearer() })
    expect(me.status, '/me nach Login').toBe(200)
    expect((me.data as { email?: string }).email, '/me liefert den eigenen Account').toBe(ctx.email)
    logStep(3, 'Login + /me', '200 + eigener Account', `HTTP ${r.status}/${me.status}`, 'PASS')
  })

  test('Schritt 4 — Customer Logout löscht das Session-Cookie', async () => {
    const out = await api('POST', '/api/v1/customer/auth/logout', { headers: bearer() })
    expect([200, 204], `Logout: HTTP ${out.status}`).toContain(out.status)
    // Das JWT ist zustandslos (der Token bleibt bis zum Ablauf gueltig); Logout loescht das Cookie (Max-Age=0).
    const cleared = out.res.headers.get('set-cookie') ?? ''
    const ok = /customer_token=("")?;/.test(cleared) && /max-age=0/i.test(cleared)
    logStep(4, 'Logout', 'Set-Cookie loescht customer_token', cleared.slice(0, 60), ok ? 'PASS' : 'FAIL')
    expect(ok, `Logout-Set-Cookie: ${cleared}`).toBe(true)

    // Wieder einloggen fuer die folgenden Schritte
    const login = await api('POST', '/api/v1/customer/auth/login', { body: { email: ctx.email, password: ctx.password } })
    ctx.customerToken = (login.res.headers.get('set-cookie') ?? '').match(/customer_token=([^;]+)/)?.[1] ?? null
    expect(ctx.customerToken, 'erneuter Login').not.toBeNull()
  })

  // ── PHASE 2 — Customer Interaction ────────────────────────────────────────

  test('Schritt 5 — Shop-Seite lädt ohne 404 und ohne JS-Fehler, Review-Bereich vorhanden', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => {
      if (!e.message.includes('Hydration') && !e.message.includes('#418')) errors.push(e.message)
    })
    const res = await page.goto(`${BASE_URL}/en/shops/${shop.slug}`)
    expect(res?.status(), 'Shop-Seite HTTP-Status').toBe(200)
    await waitForPageHydrated(page)
    await expect(page.getByText(/review/i).first(), 'Review-Bereich auf der Shop-Seite').toBeVisible()
    logStep(5, 'Shop-Seite + Review-Bereich', '200, kein JS-Fehler, Review-Text', `HTTP ${res?.status()}, ${errors.length} Fehler`, errors.length === 0 ? 'PASS' : 'FAIL')
    expect(errors).toHaveLength(0)
  })

  test('Schritt 6 — Review abgeben und öffentlich sichtbar', async () => {
    const r = await api('POST', '/api/v1/customer/reviews', {
      headers: bearer(),
      body: { entity_type: 'shop', entity_id: shop.id, stars: 4, comment: ctx.reviewText },
    })
    expect(r.status, `Review: ${JSON.stringify(r.data)}`).toBe(201)
    ctx.reviewId = (r.data as { id?: number }).id ?? null
    expect(ctx.reviewId, 'Review-ID').not.toBeNull()

    const reviews = await publicShopReviews()
    const visible = reviews.some(x => x.id === ctx.reviewId)
    logStep(6, 'Review abgeben', '201 und öffentlich gelistet', `HTTP ${r.status}, sichtbar=${visible}`, visible ? 'PASS' : 'FAIL')
    expect(visible, 'Review erscheint in /shops/{id}/reviews').toBe(true)
  })

  // ── PHASE 3 — Admin-Moderation ────────────────────────────────────────────

  test('Schritt 7 — Admin-Moderationsliste ist erreichbar', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/admin.json' })
    const page = await context.newPage()
    try {
      await page.goto(BASE_URL + '/admin/reviews')
      await expect(page).toHaveURL(/\/admin\/reviews/)
      await expect(page).not.toHaveURL(/\/admin\/login/)
      logStep(7, 'Admin /admin/reviews', 'Seite geladen (kein Login-Redirect)', page.url(), 'PASS')
    } finally {
      await context.close()
    }
  })

  test('Schritt 8 — Admin invalidiert die Review (verschwindet) und stellt sie wieder her', async () => {
    expect(ctx.reviewId, 'Review aus Schritt 6').not.toBeNull()

    const inv = await api('POST', `/api/v1/admin/reviews/${ctx.reviewId}/invalidate`, {
      headers: adminCookie(), body: { reason: 'E2E-Moderationstest' },
    })
    expect(inv.status, `invalidate: ${JSON.stringify(inv.data)}`).toBeLessThan(300)
    expect((await publicShopReviews()).some(x => x.id === ctx.reviewId), 'invalidierte Review nicht mehr öffentlich').toBe(false)

    const restore = await api('POST', `/api/v1/admin/reviews/${ctx.reviewId}/restore`, { headers: adminCookie() })
    expect(restore.status, `restore: ${JSON.stringify(restore.data)}`).toBeLessThan(300)
    const back = (await publicShopReviews()).some(x => x.id === ctx.reviewId)
    logStep(8, 'Moderation invalidate/restore', 'weg nach invalidate, wieder da nach restore', `wiederhergestellt=${back}`, back ? 'PASS' : 'FAIL')
    expect(back, 'wiederhergestellte Review wieder öffentlich').toBe(true)
  })
})
