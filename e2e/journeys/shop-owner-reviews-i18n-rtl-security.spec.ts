/**
 * Journey: Shop-Owner Bewertungen — Sprachen, RTL, Leerzustand, Rechte (F5930, e2e-tester-Ergaenzung)
 * Runbook: e2e/journeys/shop-owner-reviews-reply-report.md (Abschnitt "Ergaenzung e2e-tester")
 *
 * Fixtures (Ebene 1, synthetische Daten, kein Skip):
 * | Fixture-Name | Was wird aufgebaut                                         | Was wird geprueft                                       |
 * |--------------|-------------------------------------------------------------|---------------------------------------------------------|
 * | shop-full    | specShop('REVI'), 1 Shop-Bewertung + Antwort, 1 Produkt-Bew. | AC-15 (6 Sprachen, RTL @390px), AC-3 Produktlink, AC-10 Kachel |
 * | shop-other   | specShop('REVJ') mit eigener Bewertung                       | AC-2 (Liste/Summary ohne fremde Daten, 404 mit fremder ID) |
 * | shop-empty   | specShop('REVE') ohne Bewertungen                            | AC-11 Leerzustand mit Link zur Shopseite                |
 * | customer     | `e2e-<run>-revi-<uuid>@pundo.com`                            | schreibt die Bewertungen                                |
 *
 * Aufraeumen: `destroy()` aller Shops (kaskadiert Bewertungen/Antworten), Kunde ueber den Marker-Teardown.
 */
import { randomUUID } from 'crypto'
import type { BrowserContext, Page } from '@playwright/test'
import { test, expect } from '../fixtures'
import { RUN_ID } from './_helpers/test-data'
import { specShop, type WorkerShop, type CreatedItem } from './_helpers/worker-shop'
import { clickHydrated } from './_helpers/hydration'
import { BASE_URL, BACKEND_URL } from '../env'
import { E2E_ADMIN_STATE_FILE } from '../state'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const UUID = randomUUID().slice(0, 8)
const ctx = {
  email: `e2e-${RUN_ID}-revi-${UUID}@pundo.com`,
  password: 'E2eCustomerPw!99',
  token: '',
  commentShop: `Shop comment ${UUID}`,
  commentOther: `Other comment ${UUID}`,
  commentProd: `Product comment ${UUID}`,
  replyText: `Reply text ${UUID}`,
  reviewShop: 0,
  reviewOther: 0,
  reviewProd: 0,
}
let full: WorkerShop
let other: WorkerShop
let empty: WorkerShop
let item: CreatedItem

async function api(method: string, p: string, opts: { token?: string; cookie?: string; body?: unknown; lang?: string } = {}) {
  const res = await fetch(`${BACKEND_URL}${p}`, {
    method,
    headers: {
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
      ...(opts.lang ? { 'Accept-Language': opts.lang } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try { json = text ? JSON.parse(text) : {} } catch { /* leer */ }
  return { status: res.status, json, text }
}

async function mobile(browser: import('@playwright/test').Browser, shop: WorkerShop, lang: string): Promise<{ c: BrowserContext; p: Page }> {
  const c = await browser.newContext({ baseURL: BASE_URL, storageState: shop.storageState, viewport: { width: 390, height: 844 } })
  await c.addCookies([{ name: 'app_lang', value: lang, url: BASE_URL }])
  return { c, p: await c.newPage() }
}
const overflowOf = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test.describe.serial('Shop-Owner Bewertungen: Sprachen, RTL, Leerzustand, Rechte', () => {
  test.beforeAll(async () => {
    test.setTimeout(180_000)
    full = await specShop('REVI')
    other = await specShop('REVJ')
    empty = await specShop('REVE')
    item = await full.createItem('REVI', 'item', { listing: true })
    const signup = await api('POST', '/api/v1/customer/auth/signup', {
      body: { email: ctx.email, password: ctx.password, display_name: `E2E Rev ${UUID}` },
    })
    if (signup.status !== 201) throw new Error(`Signup ${signup.status}`)
    const login = await fetch(`${BACKEND_URL}/api/v1/customer/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ctx.email, password: ctx.password }),
    })
    ctx.token = (login.headers.get('set-cookie') ?? '').match(/customer_token=([^;]+)/)?.[1] ?? ''
    if (!ctx.token) throw new Error('kein customer_token')
    const make = async (entity_type: string, entity_id: number, comment: string) => {
      const r = await api('POST', '/api/v1/customer/reviews', { token: ctx.token, body: { entity_type, entity_id, stars: 5, comment } })
      if (r.status !== 201) throw new Error(`Review ${r.status} ${r.text}`)
      return r.json.id as number
    }
    ctx.reviewShop = await make('shop', full.id, ctx.commentShop)
    ctx.reviewOther = await make('shop', other.id, ctx.commentOther)
    ctx.reviewProd = await make('product', item.id, ctx.commentProd)
    const rep = await full.api('POST', `/reviews/${ctx.reviewShop}/reply`, { body: ctx.replyText })
    if (rep.status !== 201) throw new Error(`Reply ${rep.status}`)
  })

  test.afterAll(async () => {
    await full?.destroy()
    await other?.destroy()
    await empty?.destroy()
  })

  test('AC-2 Owner-API: Liste/Summary ohne fremde Daten; fremde ID -> 404 (alle Schreibpfade)', async () => {
    const list = await full.api<{ items?: Array<{ id: number }>; reviews?: Array<{ id: number }> }>('GET', '/reviews?scope=shop&limit=50')
    expect(list.status).toBe(200)
    expect(list.text).toContain(ctx.commentShop)
    expect(list.text).not.toContain(ctx.commentOther)
    expect(list.text).not.toContain(ctx.commentProd)
    expect(list.text.toLowerCase()).not.toContain(ctx.email.toLowerCase())
    const all = await full.api('GET', '/reviews?scope=products&limit=50')
    expect(all.text).toContain(ctx.commentProd)
    expect(all.text).not.toContain(ctx.commentOther)
    for (const [m, p, body] of [
      ['POST', `/reviews/${ctx.reviewOther}/reply`, { body: 'x' }], ['PATCH', `/reviews/${ctx.reviewOther}/reply`, { body: 'x' }],
      ['DELETE', `/reviews/${ctx.reviewOther}/reply`, undefined], ['POST', `/reviews/${ctx.reviewOther}/report`, { reason: 'spam' }],
    ] as const) {
      const r = await full.api(m, p, body)
      expect([m, r.status], `${m} ${p}`).toEqual([m, 404])
    }
    // Owner B kann die Antwort von A nicht anfassen
    const del = await other.api('DELETE', `/reviews/${ctx.reviewShop}/reply`)
    expect(del.status).toBe(404)
    const patch = await other.api('PATCH', `/reviews/${ctx.reviewShop}/reply`, { body: 'hijack' })
    expect(patch.status).toBe(404)
  })

  test('Owner-Token an allen Admin-Review-Endpoints abgelehnt (Header und Cookie), ohne Token auch', async () => {
    const id = ctx.reviewShop
    const eps: Array<[string, string, unknown?]> = [
      ['GET', '/api/v1/admin/reviews'], ['GET', `/api/v1/admin/reviews/${id}/audit-log`],
      ['POST', `/api/v1/admin/reviews/${id}/invalidate`, { reason: 'spam' }], ['POST', `/api/v1/admin/reviews/${id}/restore`],
      ['POST', `/api/v1/admin/reviews/${id}/reply/hide`, { reason: 'spam' }], ['POST', `/api/v1/admin/reviews/${id}/reply/restore`],
    ]
    for (const [m, p, body] of eps) {
      const viaHeader = await api(m, p, { token: full.ownerToken, body })
      const viaCookie = await api(m, p, { cookie: `shop_owner_token=${full.ownerToken}`, body })
      const none = await api(m, p, { body })
      expect([m, p, viaHeader.status, viaCookie.status, none.status]).toEqual([m, p, 401, 401, 401])
    }
    // Zustand unveraendert: Bewertung und Antwort weiter oeffentlich
    const pub = await api('GET', `/api/v1/shops/${full.id}/reviews?limit=10`)
    expect(pub.text).toContain(ctx.replyText)
  })

  test('AC-11 Leerzustand mit Link zur Shopseite; Kachel "Noch keine Bewertungen"', async ({ browser }) => {
    const c = await browser.newContext({ baseURL: BASE_URL, storageState: empty.storageState })
    const p = await c.newPage()
    await p.goto('/shop-admin/reviews')
    await expect(p.getByText('No reviews for your shop yet.')).toBeVisible()
    const link = p.getByRole('link', { name: 'View your shop page' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', new RegExp(`/shops/${empty.slug}`))
    await p.goto('/shop-admin/dashboard')
    await expect(p.getByText('No reviews yet')).toBeVisible()
    await c.close()
  })

  test('AC-3/AC-10 Produktbewertung mit Produktlink, Dashboard-Kachel mit "neu"-Zahl', async ({ browser }) => {
    const c = await browser.newContext({ baseURL: BASE_URL, storageState: full.storageState })
    const p = await c.newPage()
    await p.goto('/shop-admin/dashboard')
    await expect(p.getByText(/\d+ new/).first()).toBeVisible()
    await p.goto('/shop-admin/reviews?scope=products')
    const card = p.locator('article', { hasText: ctx.commentProd })
    await expect(card).toBeVisible()
    await expect(card.getByRole('link', { name: new RegExp(item.name.slice(0, 12)) })).toHaveAttribute('href', new RegExp(`/products/${item.slug}`))
    await expect(card.getByRole('button', { name: 'Reply', exact: true })).toHaveCount(0)
    await expect(card.getByRole('button', { name: /hide|restore|invalidate/i })).toHaveCount(0)
    await c.close()
  })

  for (const lang of ['de', 'el', 'ru', 'ar', 'he'] as const) {
    test(`AC-15 ${lang} @390px: uebersetzt, kein Overflow, Antworttext unveraendert${lang === 'ar' || lang === 'he' ? ', RTL, Dialog' : ''}`, async ({ browser }) => {
      const { c, p } = await mobile(browser, full, lang)
      await p.goto('/shop-admin/reviews')
      const rtl = lang === 'ar' || lang === 'he'
      await expect(p.locator('html')).toHaveAttribute('dir', rtl ? 'rtl' : 'ltr')
      const h1 = p.getByRole('heading', { level: 1 })
      await expect(h1).not.toHaveText('Reviews')
      await expect(p.getByText(ctx.commentShop)).toBeVisible()
      await expect(p.getByText(ctx.replyText).first()).toBeVisible()
      expect(await overflowOf(p), 'Overflow Liste').toBeLessThanOrEqual(0)
      // Kein englischer Resttext in den Tabs
      await expect(p.getByText('My shop', { exact: true })).toHaveCount(0)
      await p.screenshot({ path: `test-results/f5930-${lang}-list.png`, fullPage: true })
      if (rtl) {
        // Meldedialog oeffnen und auf Overflow/Richtung pruefen
        const card = p.locator('article', { hasText: ctx.commentShop })
        const buttons = card.getByRole('button')
        const n = await buttons.count()
        expect(n, 'Kartenaktionen vorhanden').toBeGreaterThan(0)
        // Bearbeiten-/Loeschen-/Melden-Aktionen: den Melden-Dialog ueber den lokalisierten Text finden
        const report = card.getByRole('button', { name: lang === 'ar' ? 'الإبلاغ إلى pundo' : /pundo/ })
        await clickHydrated(report.first())
        const dlg = p.getByRole('dialog')
        await expect(dlg).toBeVisible()
        const box = await dlg.boundingBox()
        expect(box && box.x >= 0 && box.x + box.width <= 390 + 1, `Dialog im Viewport (${JSON.stringify(box)})`).toBeTruthy()
        expect(await overflowOf(p), 'Overflow mit Dialog').toBeLessThanOrEqual(0)
        await p.screenshot({ path: `test-results/f5930-${lang}-dialog.png` })
      }
      await c.close()
    })
  }

  test('AC-13 Antwort-Ausblenden durch Admin: oeffentliche Shopseite zeigt sie nicht mehr; AC-9 Bewertung ebenfalls', async ({ adminPage, page }) => {
    await page.goto(`/en/shops/${full.slug}`)
    await expect(page.getByTestId('owner-reply').first()).toContainText(ctx.replyText)
    await expect(page.getByText(ctx.commentShop).first()).toBeVisible()

    await adminPage.goto('/admin/reviews?filter=all')
    const card = adminPage.locator('article', { hasText: ctx.commentShop })
    await expect(card).toBeVisible()
    await clickHydrated(card.getByRole('button', { name: 'Hide reply' }))
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()
    await expect(card.getByRole('button', { name: 'Restore reply' })).toBeVisible()
    await page.reload()
    await expect(page.getByText(ctx.commentShop).first()).toBeVisible()
    await expect(page.getByText(ctx.replyText)).toHaveCount(0)

    await card.getByRole('button', { name: 'Hide review' }).click()
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()
    await expect(card.getByRole('button', { name: 'Restore review' })).toBeVisible()
    await page.reload()
    await expect(page.getByText(ctx.commentShop)).toHaveCount(0)

    // Audit-Log
    await adminPage.goto(`/admin/reviews/${ctx.reviewShop}/audit-log`)
    await expect(adminPage.locator('body')).toContainText(/reply/i)
  })

  test('AC-12 System-Admin /admin/reviews in EL: uebersetzte Ueberschrift, Aktionen, Namen', async ({ browser }) => {
    const c = await browser.newContext({ baseURL: BASE_URL, storageState: E2E_ADMIN_STATE_FILE, viewport: { width: 1280, height: 900 } })
    await c.addCookies([{ name: 'app_lang', value: 'el', url: BASE_URL }])
    const p = await c.newPage()
    await p.goto('/admin/reviews?filter=all')
    await expect(p.getByRole('heading', { level: 1 })).toHaveText('Έλεγχος αξιολογήσεων')
    const card = p.locator('article', { hasText: ctx.commentShop })
    await expect(card).toBeVisible()
    await expect(card).not.toContainText('Restore review')
    await expect(card).not.toContainText('Hide review')
    await expect(card.getByText(full.name).first()).toBeVisible()
    await p.screenshot({ path: 'test-results/f5930-admin-el.png' })
    await c.close()
  })
})
