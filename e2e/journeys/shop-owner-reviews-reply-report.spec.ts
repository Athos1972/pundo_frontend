/**
 * Journey: Shop-Owner Bewertungen — Antworten, Melden, Moderation (F5930)
 * Runbook: e2e/journeys/shop-owner-reviews-reply-report.md
 *
 * Fixtures (Ebene 1, synthetische Daten, kein Skip):
 * | Fixture-Name | Was wird aufgebaut                                              | Was wird geprueft                                  |
 * |--------------|------------------------------------------------------------------|----------------------------------------------------|
 * | shop-a       | specShop('REVA'): Owner-Token (Impersonation), Item mit Listing  | Scope "Mein Shop" / "Meine Produkte", Antworten    |
 * | shop-b       | specShop('REVB'): fremder Shop mit eigener Bewertung             | IDOR (404), nie in der Liste von A                 |
 * | customer     | `e2e-<run>-rev-<uuid>@pundo.com` (auto-verifiziert)              | schreibt 3 Bewertungen (A, B, Produkt von A)       |
 * | reviews      | Shop A, Shop B, Produkt von A (je 1)                             | Badge "neu", Liste, Antwort, Meldung, Moderation   |
 *
 * Aufraeumen: `shop.destroy()` beider Shops (kaskadiert Bewertungen und Antworten), Kunde ueber den Marker-Teardown
 * (`e2e-<run>-`, e2e/cleanup-run.ts).
 */
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type { BrowserContext, Page } from '@playwright/test'
import { test, expect, createStepLog } from '../fixtures'
import { RUN_ID } from './_helpers/test-data'
import { specShop, type WorkerShop, type CreatedItem } from './_helpers/worker-shop'
import { clickHydrated, waitForHydrated } from './_helpers/hydration'
import { BASE_URL, BACKEND_URL } from '../env'

// Port-Safety — niemals gegen Produktiv-Ports laufen
if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const UUID = randomUUID().slice(0, 8)
const ctx = {
  email: `e2e-${RUN_ID}-rev-${UUID}@pundo.com`,
  password: 'E2eCustomerPw!99',
  displayName: `E2E Reviewer ${UUID}`,
  customerToken: '',
  commentA: `Comment on shop A ${UUID}`,
  commentB: `Comment on shop B ${UUID}`,
  commentP: `Comment on product ${UUID}`,
  reviewA: 0,
  reviewB: 0,
  reviewP: 0,
  startedAt: new Date().toISOString(),
}
const { entries: stepLog, logStep } = createStepLog()

let shopA: WorkerShop
let shopB: WorkerShop
let itemA: CreatedItem
let portal: BrowserContext

interface Json { detail?: { code?: string }; [k: string]: unknown }
async function customerApi(method: string, urlPath: string, body?: unknown) {
  const res = await fetch(`${BACKEND_URL}${urlPath}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(ctx.customerToken ? { Authorization: `Bearer ${ctx.customerToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  const text = await res.text()
  let json: Json = {}
  try { json = text ? JSON.parse(text) : {} } catch { /* leerer Body */ }
  return { res, status: res.status, json }
}

const code = (r: { json: unknown }) => (r.json as Json)?.detail?.code
const reply = (id: number) => `/reviews/${id}/reply`

/** Antwort des Shops A auf seine Bewertung, wie sie ein Kunde oeffentlich sieht (null = keine / ausgeblendet). */
async function publicReplyOnA(): Promise<string | null> {
  const r = await customerApi('GET', `/api/v1/shops/${shopA.id}/reviews?limit=10`)
  const rows = (r.json.reviews ?? []) as Array<{ id: number; owner_reply: { body: string } | null }>
  return rows.find((x) => x.id === ctx.reviewA)?.owner_reply?.body ?? null
}
const publicReviewIdsOnA = async () =>
  ((await customerApi('GET', `/api/v1/shops/${shopA.id}/reviews?limit=10`)).json.reviews as Array<{ id: number }>).map((x) => x.id)

/** Neue Seite im Owner-Kontext von Shop A. */
async function ownerPage(urlPath: string): Promise<Page> {
  const page = await portal.newPage()
  await page.goto(urlPath)
  return page
}
const navBadge = async (page: Page): Promise<number> => {
  const text = await page.locator('aside a[href="/shop-admin/reviews"]').innerText()
  return Number(text.match(/\d+/)?.[0] ?? 0)
}
const cardOf = (page: Page, text: string) => page.locator('article', { hasText: text })

test.describe.serial('Shop-Owner Bewertungen: Antworten, Melden, Moderation', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000)
    shopA = await specShop('REVA')
    shopB = await specShop('REVB')
    itemA = await shopA.createItem('REVA', 'item', { listing: true })

    const signup = await customerApi('POST', '/api/v1/customer/auth/signup', {
      email: ctx.email, password: ctx.password, display_name: ctx.displayName,
    })
    if (signup.status !== 201) throw new Error(`Signup: ${signup.status} ${JSON.stringify(signup.json)}`)
    const login = await customerApi('POST', '/api/v1/customer/auth/login', { email: ctx.email, password: ctx.password })
    ctx.customerToken = (login.res.headers.get('set-cookie') ?? '').match(/customer_token=([^;]+)/)?.[1] ?? ''
    if (!ctx.customerToken) throw new Error('Login: kein customer_token')

    const make = async (entity_type: string, entity_id: number, comment: string) => {
      const r = await customerApi('POST', '/api/v1/customer/reviews', { entity_type, entity_id, stars: 4, comment })
      if (r.status !== 201) throw new Error(`Review ${entity_type}:${entity_id}: ${r.status} ${JSON.stringify(r.json)}`)
      return r.json.id as number
    }
    ctx.reviewA = await make('shop', shopA.id, ctx.commentA)
    ctx.reviewB = await make('shop', shopB.id, ctx.commentB)
    ctx.reviewP = await make('product', itemA.id, ctx.commentP)

    portal = await browser.newContext({ baseURL: BASE_URL, storageState: shopA.storageState })
  })

  test.afterAll(async () => {
    await portal?.close()
    await shopA?.destroy()
    await shopB?.destroy()
    const endedAt = new Date().toISOString()
    const dir = path.join(__dirname, 'reports')
    fs.mkdirSync(dir, { recursive: true })
    const status = stepLog.some((s) => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    fs.writeFileSync(
      path.join(dir, `shop-owner-reviews-reply-report-${endedAt.slice(0, 10)}.md`),
      [
        `## Journey: Shop-Owner Bewertungen: Antworten, Melden, Moderation — ${status}`,
        `Datum: ${endedAt.slice(0, 16).replace('T', ' ')} UTC`,
        '',
        '### Aufgebaute Test-Daten',
        '| Fixture | ID/Slug | Status |',
        '|---|---|---|',
        `| shop-a | ${shopA?.id} / ${shopA?.slug} | OK |`,
        `| shop-b | ${shopB?.id} / ${shopB?.slug} | OK |`,
        `| customer | ${ctx.email} | OK |`,
        `| reviews | A=${ctx.reviewA}, B=${ctx.reviewB}, Produkt=${ctx.reviewP} | OK |`,
        '',
        '### Schritt-für-Schritt-Protokoll',
        '| # | Beschreibung | Erwartet | Tatsächlich | Status |',
        '|---|---|---|---|---|',
        ...stepLog.map((s) => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
        '',
        '### Aufräumen',
        `Beide Spec-Shops per Admin-Delete entfernt (kaskadiert Bewertungen, Antworten); Kunde ${ctx.email} räumt der Teardown (Marker e2e-${RUN_ID}-).`,
      ].join('\n'),
      'utf8',
    )
  })

  test('AC-1 Badge im Portal zeigt die neuen Bewertungen (Shop + Produkt)', async () => {
    const page = await ownerPage('/shop-admin/dashboard')
    await waitForHydrated(page.locator('aside a[href="/shop-admin/reviews"]'))
    const n = await navBadge(page)
    logStep(1, 'Badge im Menü', '>= 2 neu', String(n), n >= 2 ? 'PASS' : 'FAIL')
    expect(n, 'Shop-Bewertung + Produktbewertung sind neu').toBeGreaterThanOrEqual(2)
    await page.close()
  })

  test('AC-2 Liste "Mein Shop" zeigt nur die Bewertung von Shop A; Öffnen setzt das Badge zurück', async () => {
    const page = await portal.newPage()
    const seen = page.waitForResponse((r) => r.url().includes('/api/shop-admin/reviews/mark-seen'))
    await page.goto('/shop-admin/reviews')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reviews')
    await expect(page.getByText(ctx.commentA)).toBeVisible()
    await expect(page.getByText(ctx.commentB), 'fremder Shop nie sichtbar').toHaveCount(0)
    await expect(page.getByText(ctx.commentP), 'Produktbewertung gehört in den anderen Tab').toHaveCount(0)
    await expect(cardOf(page, ctx.commentA).getByText('New', { exact: true })).toBeVisible()
    expect((await seen).status()).toBe(204)
    await expect.poll(() => navBadge(page), { message: 'Badge nach mark-seen' }).toBe(0)
    logStep(2, 'Liste Mein Shop + mark-seen', 'nur A, Badge 0', 'ok', 'PASS')
    await page.close()
  })

  test('AC-2 IDOR: fremde Bewertungen sind für Owner A überall 404', async () => {
    for (const id of [ctx.reviewB, 99999999]) {
      const rep = await shopA.api<Json>('POST', reply(id), { body: 'hijack' })
      expect([rep.status, code(rep)], `reply auf ${id}`).toEqual([404, 'review_not_found'])
      const patch = await shopA.api<Json>('PATCH', reply(id), { body: 'hijack' })
      expect([patch.status, code(patch)]).toEqual([404, 'review_not_found'])
      const del = await shopA.api<Json>('DELETE', reply(id))
      expect([del.status, code(del)]).toEqual([404, 'review_not_found'])
      const rpt = await shopA.api<Json>('POST', `/reviews/${id}/report`, { reason: 'spam' })
      expect([rpt.status, code(rpt)]).toEqual([404, 'review_not_found'])
    }
    const list = await shopA.api<{ items: Array<{ id: number }> }>('GET', '/reviews?scope=shop')
    expect(list.json.items.map((i) => i.id)).toEqual([ctx.reviewA])
    logStep(3, 'IDOR', '404 review_not_found, Liste nur A', 'ok', 'PASS')
  })

  test('Tab "Meine Produkte": Hinweis, kein Antworten-Knopf, Melden möglich', async () => {
    const page = await ownerPage('/shop-admin/reviews?scope=products')
    await expect(page.getByText(ctx.commentP)).toBeVisible()
    await expect(page.getByText(/you cannot reply to them/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reply', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Report to pundo' })).toHaveCount(1)
    await expect(page.getByRole('link', { name: itemA.name })).toHaveAttribute('href', `/en/products/${itemA.slug}`)
    const rep = await shopA.api<Json>('POST', reply(ctx.reviewP), { body: 'x' })
    expect([rep.status, code(rep)], 'API: Antwort auf Produktbewertung').toEqual([403, 'reply_not_allowed'])
    logStep(4, 'Tab Meine Produkte', 'Hinweis, kein Antworten, 403 per API', 'ok', 'PASS')
    await page.close()
  })

  test('AC-1 Antwort anlegen (UI) → öffentlich auf der Shopseite; bearbeiten', async ({ page: publicPage }) => {
    const page = await ownerPage('/shop-admin/reviews')
    await clickHydrated(page.getByRole('button', { name: 'Reply', exact: true }))
    await page.getByRole('textbox', { name: 'Your public reply' }).fill('Thank you for visiting!')
    await page.getByRole('button', { name: 'Save reply' }).click()
    // Der Editor schliesst erst nach der 201-Antwort (React spiegelt den Text auch ins <textarea>, getByText allein wuerde vorher greifen)
    await expect(page.getByRole('textbox', { name: 'Your public reply' })).toHaveCount(0)
    await expect(cardOf(page, ctx.commentA).getByText('Thank you for visiting!')).toBeVisible()
    expect(await publicReplyOnA(), 'API: Antwort öffentlich').toBe('Thank you for visiting!')

    await publicPage.goto(`/en/shops/${shopA.slug}`)
    // Die Shopseite rendert den Review-Bereich mehrfach (Layout-Varianten): der erste Block genuegt
    const block = publicPage.getByTestId('owner-reply').first()
    await expect(block).toContainText('Thank you for visiting!')
    await expect(block).toContainText(`Reply from ${shopA.name}`)

    // B5930-001: Datum von Bewertung und Antwort in der Seitensprache (el), nicht im englischen Server-Default
    await publicPage.goto(`/el/shops/${shopA.slug}`)
    const blockEl = publicPage.getByTestId('owner-reply').first()
    await expect(blockEl).toContainText('Thank you for visiting!')
    const elDate = (iso: string) => new Intl.DateTimeFormat('el', { dateStyle: 'medium', timeZone: 'Asia/Nicosia' }).format(new Date(iso))
    for (const t of [blockEl.locator('time'), blockEl.locator('xpath=ancestor::article').locator('time').first()]) {
      const iso = await t.getAttribute('datetime')
      const text = (await t.textContent())?.trim()
      expect(text, 'el-Datum in Seitensprache').toBe(elDate(iso!))
      expect(text).not.toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/)
    }
    logStep('4b', 'Datum auf /el/ in Seitensprache', 'el-Format', 'ok', 'PASS')

    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByRole('textbox', { name: 'Your public reply' }).fill('Edited: see you soon')
    await page.getByRole('button', { name: 'Save reply' }).click()
    await expect(page.getByRole('textbox', { name: 'Your public reply' })).toHaveCount(0)
    await expect(page.getByText('Edited: see you soon')).toBeVisible()
    expect(await publicReplyOnA(), 'API: bearbeitete Antwort öffentlich').toBe('Edited: see you soon')
    logStep(5, 'Antwort anlegen + bearbeiten', 'öffentlich sichtbar, bearbeitet', 'ok', 'PASS')
    await page.close()
  })

  test('AC-3 Grenzwerte: 1000 ok, 1001 → Feldmeldung/422, leer → 422; zweite Antwort → 409', async () => {
    const page = await ownerPage('/shop-admin/reviews')
    await clickHydrated(page.getByRole('button', { name: 'Edit', exact: true }))
    await page.getByRole('textbox', { name: 'Your public reply' }).fill('x'.repeat(1001))
    await page.getByRole('button', { name: 'Save reply' }).click()
    // (Next's Route-Announcer traegt ebenfalls role=alert: ueber den Text suchen)
    await expect(page.getByText('The reply is too long (maximum 1000 characters).')).toBeVisible()
    await page.close()

    expect((await shopA.api<Json>('PATCH', reply(ctx.reviewA), { body: 'x'.repeat(1001) })).status).toBe(422)
    expect((await shopA.api<Json>('PATCH', reply(ctx.reviewA), { body: '' })).status).toBe(422)
    expect((await shopA.api<Json>('PATCH', reply(ctx.reviewA), { body: '   ' })).status).toBe(422)
    const max = await shopA.api<Json>('PATCH', reply(ctx.reviewA), { body: 'y'.repeat(1000) })
    expect(max.status, '1000 Zeichen sind erlaubt').toBe(200)
    expect((await publicReplyOnA())?.length).toBe(1000)

    const second = await shopA.api<Json>('POST', reply(ctx.reviewA), { body: 'second' })
    expect([second.status, code(second)], 'zweite Antwort').toEqual([409, 'reply_exists'])
    logStep(6, 'Grenzwerte + zweite Antwort', '1000 ok, 1001/leer 422, zweite 409', 'ok', 'PASS')
  })

  test('Antwort löschen (UI, mit Bestätigung) → öffentlich weg', async () => {
    const page = await ownerPage('/shop-admin/reviews')
    page.once('dialog', (d) => d.accept())
    await clickHydrated(page.getByRole('button', { name: 'Delete', exact: true }))
    await expect(page.getByRole('button', { name: 'Reply', exact: true })).toBeVisible()
    expect(await publicReplyOnA(), 'öffentlich weg').toBeNull()
    logStep(7, 'Antwort löschen', 'öffentlich weg', 'ok', 'PASS')
    await page.close()
  })

  test('AC-2 Melden (UI) → "Reported"; zweites Melden → 409', async () => {
    const page = await ownerPage('/shop-admin/reviews')
    await clickHydrated(page.getByRole('button', { name: 'Report to pundo' }))
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Offensive or insulting').check()
    await dialog.getByRole('textbox').fill('Insulting wording E2E')
    await dialog.getByRole('button', { name: 'Send report' }).click()
    await expect(cardOf(page, ctx.commentA).getByText('Reported. pundo will review it.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Report to pundo' })).toHaveCount(0)
    const again = await shopA.api<Json>('POST', `/reviews/${ctx.reviewA}/report`, { reason: 'spam' })
    expect([again.status, code(again)], 'zweite Meldung').toEqual([409, 'already_reported'])
    logStep(8, 'Melden', 'Reported, zweite 409', 'ok', 'PASS')
    await page.close()
  })

  test('Admin sieht die Meldung mit Quelle "Shop owner"; blendet Antwort und Bewertung aus', async ({ adminPage }) => {
    // Owner antwortet erneut (die erste Antwort wurde in Schritt 7 gelöscht), damit es etwas zum Ausblenden gibt
    const again = await shopA.api<Json>('POST', reply(ctx.reviewA), { body: 'Reply for moderation' })
    expect(again.status).toBe(201)

    await adminPage.goto('/admin/reviews?filter=owner_reported')
    await expect(adminPage.getByRole('heading', { level: 1 })).toHaveText('Review moderation')
    const card = cardOf(adminPage, ctx.commentA)
    await expect(card).toBeVisible()
    await expect(card.getByText('Shop owner').first()).toBeVisible()
    await expect(card.getByText(shopA.name).first()).toBeVisible()
    await expect(card.getByText('Insulting wording E2E')).toBeVisible()
    await expect(cardOf(adminPage, ctx.commentB), 'Shop B hat keine Meldung').toHaveCount(0)
    logStep(9, 'Admin: Filter "Reported by shop owner"', 'Quelle Shop owner, Kommentar', 'ok', 'PASS')

    // Antwort ausblenden: öffentlich weg, Owner sieht "Reply hidden by pundo", kann nicht mehr ändern
    await clickHydrated(card.getByRole('button', { name: 'Hide reply' }))
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()
    await expect(card.getByRole('button', { name: 'Restore reply' })).toBeVisible()
    expect(await publicReplyOnA(), 'ausgeblendete Antwort nicht öffentlich').toBeNull()
    const portalView = await ownerPage('/shop-admin/reviews')
    await expect(portalView.getByText('Reply hidden by pundo', { exact: true })).toBeVisible()
    await expect(portalView.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
    await portalView.close()
    const edit = await shopA.api<Json>('PATCH', reply(ctx.reviewA), { body: 'sneaky' })
    expect([edit.status, code(edit)], 'Umgehen durch Neuschreiben verhindert').toEqual([409, 'reply_hidden'])
    logStep(10, 'Admin blendet Antwort aus', 'öffentlich weg, Owner gesperrt', 'ok', 'PASS')

    // Bewertung ausblenden: aus der öffentlichen Liste, im Portal "Hidden by pundo" ohne Aktionen
    await card.getByRole('button', { name: 'Hide review' }).click()
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()
    await expect(card.getByRole('button', { name: 'Restore review' })).toBeVisible()
    expect(await publicReviewIdsOnA(), 'ausgeblendete Bewertung nicht öffentlich').not.toContain(ctx.reviewA)
    const hidden = await ownerPage('/shop-admin/reviews')
    await expect(cardOf(hidden, ctx.commentA).getByText('Hidden by pundo', { exact: true })).toBeVisible()
    await expect(cardOf(hidden, ctx.commentA).getByRole('button')).toHaveCount(0)
    await hidden.close()
    const blocked = await shopA.api<Json>('POST', reply(ctx.reviewA), { body: 'late' })
    expect([blocked.status, code(blocked)]).toEqual([409, 'review_hidden'])
    logStep(11, 'Admin blendet Bewertung aus', 'öffentlich weg, Portal ohne Aktionen', 'ok', 'PASS')
  })

  test('Nach dem Reload steht das Badge auf 0; die alte Audit-Log-Route ist weg', async () => {
    const page = await ownerPage('/shop-admin/dashboard')
    await waitForHydrated(page.locator('aside a[href="/shop-admin/reviews"]'))
    expect(await navBadge(page), 'Badge nach Reload').toBe(0)
    await page.close()

    const gone = await portal.newPage()
    const res = await gone.goto('/shop-admin/reviews/1/audit-log')
    expect(res?.status(), '/shop-admin/reviews/[id]/audit-log').toBe(404)
    await gone.close()
    logStep(12, 'Badge 0 + Audit-Log-Route 404', 'ok', 'ok', 'PASS')
  })

  test('Owner-Token wird von der Admin-API abgelehnt (401)', async () => {
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/reviews`, {
      headers: { Authorization: `Bearer ${shopA.ownerToken}`, Cookie: `shop_owner_token=${shopA.ownerToken}` },
      signal: AbortSignal.timeout(30_000),
    })
    expect(res.status).toBe(401)
    logStep(13, 'Admin-API mit Owner-Token', '401', String(res.status), 'PASS')
  })

  test('Arabisch bei 390 px: dir=rtl, kein horizontaler Overflow', async ({ browser }) => {
    const rtl = await browser.newContext({
      baseURL: BASE_URL, storageState: shopA.storageState, viewport: { width: 390, height: 844 },
    })
    await rtl.addCookies([{ name: 'app_lang', value: 'ar', url: BASE_URL }])
    const page = await rtl.newPage()
    await page.goto('/shop-admin/reviews')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('التقييمات')
    await expect(page.getByText(ctx.commentA)).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, 'horizontaler Overflow in px').toBeLessThanOrEqual(0)
    logStep(14, 'ar @ 390 px', 'dir=rtl, kein Overflow', `overflow=${overflow}`, 'PASS')
    await rtl.close()
  })
})
