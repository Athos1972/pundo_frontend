/**
 * Journey: shop-claim-dispute (F5970, Szenario B + assign-owner + Matching-Tab)
 * Runbook: e2e/journeys/shop-claim-dispute.md
 *
 * Fixtures (Ebene 1, synthetisch, kein Skip):
 * | Fixture        | Was wird aufgebaut                                                                  | Was wird geprueft                                      |
 * |----------------|-------------------------------------------------------------------------------------|--------------------------------------------------------|
 * | old owner      | Onboarding `e2e-<run>-...@pundo.com` (Auto-Approve) MIT Katalog-Consent + 2 Items/Angebote | Dispute, Sperre, Angebote ausgeblendet, Consent/Case |
 * | applicant      | per Wizard (UI) mit PNG-Upload, Konto `@pundo-e2e.io`                                | Upload, Rueckruf-Code, Annahme, neuer Owner            |
 * | rival          | zweiter Dispute per API, wird im Admin abgelehnt                                     | AC 28: nichts aendert sich                             |
 * | assign shops   | zwei admin-Shops ohne Owner, Owner mit eigenem Shop, Konto ohne Shop                | assign-owner 409/422/Erfolg, Matching-Tab              |
 *
 * Aufraeumen: Shops per TestDataTracker (kaskadiert Owner mit Shop, Claims, Consent, Cases); Konten ohne Shop per
 * tracker.owner; hochgeladene Dokumente liegen im Scratch-Upload-Pfad des Test-Backends (SHOP_CLAIM_UPLOAD_PATH).
 * Mails/Telegram: das Test-Backend sendet nur, wenn SMTP_HOST / TELEGRAM_ADMIN_CHAT_ID gesetzt sind; die Specs pruefen
 * die Mail-Versandspur ueber die Audit-Ereignisse (notification_sent / notification_failed), nicht ueber ein Postfach.
 * Backend 8500 / Frontend 3500 — NIE 8000/3000.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { BrowserContext, Page } from '@playwright/test'
import { test, expect, createStepLog, shopOwnerLogin, shopOwnerOnboardWithRetry } from '../fixtures'
import { adminApi, ownerApi, e2eName, e2eSlug, TestDataTracker, psql, RUN_ID } from './_helpers/test-data'
import { buildAdminShopPayload } from './_helpers/admin-shop-payload'
import { waitForPageHydrated, waitForHydrated } from './_helpers/hydration'
import { makePng } from './_helpers/png'
import { BASE_URL, BACKEND_URL } from '../env'
import { tShopAdminClaim } from '../../src/lib/i18n/shop-admin-claim'
import { tSysAdmin } from '../../src/lib/system-admin-translations'
import { tAdmin } from '../../src/lib/shop-admin-translations'
import { CATALOG_CONSENT_TEXT_VERSION } from '../../src/lib/onboarding/catalogConsent'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const SPEC = 'CLAIM-DISP'
const PASSWORD = 'E2eClaimPw!99'
const LAT = 34.6841
const LNG = 33.0379
const tr = tShopAdminClaim('en')
const sys = tSysAdmin('en')
const sa = tAdmin('en')
const { entries: stepLog, logStep } = createStepLog()
const tracker = new TestDataTracker()
const rand = () => crypto.randomBytes(2).toString('hex')

const SHOP_NAME = e2eName(SPEC, 'Taverne')
const oldEmail = `e2e-${RUN_ID}-cdisp-old-${rand()}@pundo.com`
const appEmail = `e2e-${RUN_ID}-cdisp-app-${rand()}@pundo-e2e.io`
const rivalEmail = `e2e-${RUN_ID}-cdisp-rival-${rand()}@pundo-e2e.io`

let startedAt = ''
let shopId = 0
let shopSlug = ''
let oldOwnerId = 0
let oldToken = ''
const items: Array<{ id: number; slug: string; name: string; offerId: number }> = []
let claimId = 0
let appId = 0
let docIds: number[] = []
let oldCaseId = 0
let applicantCtx: BrowserContext
let applicantPage: Page

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

async function pub<T = any>(p: string, params: Record<string, string | number> = {}): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
  const res = await fetch(`${BACKEND_URL}/api/v1${p}${qs ? `?${qs}` : ''}`, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`GET ${p} -> ${res.status}`)
  return (await res.json()) as T
}

/** Was ein Gast ueber die Kanaele Shop-Detail, Produkte des Shops, Produktseite und Suche vom Shop sieht. */
async function publicView() {
  const shop = await pub<any>(`/shops/by-slug/${shopSlug}`) // eslint-disable-line @typescript-eslint/no-explicit-any
  const products = await pub<{ total: number }>('/products', { shop_id: shopId, lat: LAT, lng: LNG })
  const detail: Record<string, string[]> = {}
  const search: Record<string, string[]> = {}
  for (const it of items) {
    const d = await pub<{ offers: Array<{ shop_slug: string }> }>(`/products/by-slug/${it.slug}`, { lat: LAT, lng: LNG })
    detail[it.slug] = (d.offers ?? []).map((o) => o.shop_slug)
    const s = await pub<{ items: Array<{ best_offer?: { shop_slug: string } }> }>('/search', { q: it.name, lat: LAT, lng: LNG })
    search[it.slug] = s.items.filter((i) => i.best_offer).map((i) => i.best_offer!.shop_slug)
  }
  return {
    shopId: shop.id as number,
    productCount: (shop.product_count ?? 0) as number,
    topProducts: (shop.top_products ?? []).length as number,
    productsTotal: products.total,
    detail,
    search,
  }
}

async function applyViaApi(slug: string, email: string, method: 'shop_email_code' | 'document', withFile: boolean): Promise<{ id: number; token: string }> {
  const fd = new FormData()
  fd.set('shop_slug', slug)
  fd.set('source', 'shop_page')
  fd.set('proof_method', method)
  fd.set('owner_confirmed', 'true')
  fd.set('lang', 'en')
  fd.set('turnstile_token', 'e2e')
  fd.set('name', 'E2E Applicant')
  fd.set('email', email)
  fd.set('password', PASSWORD)
  if (method === 'document') fd.set('callback_ack', 'true')
  if (withFile) fd.append('files', new Blob([new Uint8Array(makePng(7))], { type: 'image/png' }), 'proof.png')
  const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/claim/requests`, { method: 'POST', body: fd, signal: AbortSignal.timeout(60_000) })
  const text = await res.text()
  if (res.status !== 201 && res.status !== 200) throw new Error(`claim create ${res.status}: ${text.slice(0, 200)}`)
  const j = JSON.parse(text) as { claim_request_id: number; access_token: string }
  return { id: j.claim_request_id, token: j.access_token }
}

async function createApplicantWithoutShop(label: string): Promise<{ id: number; email: string }> {
  const filler = await adminApi<{ id: number; slug: string }>('POST', '/shops', buildAdminShopPayload({
    slug: e2eSlug(SPEC, `filler-${label}`), names: { en: e2eName(SPEC, `Filler-${label}`) },
    address_line1: 'Filler St 1', city: 'Larnaca', lat: 34.9, lng: 33.6, email: `info@pundo-e2e.io`, website_url: 'https://pundo-e2e.io',
  }))
  expect(filler.status).toBe(201)
  tracker.shop(filler.json.id)
  const email = `e2e-${RUN_ID}-cdisp-${label}-${rand()}@pundo-e2e.io`
  await applyViaApi(filler.json.slug, email, 'shop_email_code', false)
  const id = Number(psql(`select id from shop_owners where email='${email}'`))
  tracker.owner(id)
  return { id, email }
}

async function offerFor(token: string, name: string): Promise<{ id: number; slug: string; offerId: number }> {
  const cat = Number(psql('select category_id from items where category_id is not null order by random() limit 1'))
  const it = await ownerApi<{ id: number; slug: string }>(token, 'POST', '/items', { name, name_lang: 'en', category_id: cat, confirmed: true })
  expect(it.status, it.text).toBe(201)
  tracker.item(it.json.id, it.json.slug)
  const l = await ownerApi<{ id: number }>(token, 'POST', '/shop-listings', { item_id: it.json.id })
  expect(l.status, l.text).toBe(201)
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
  const o = await ownerApi<{ id: number }>(token, 'POST', '/offers', {
    shop_listing_id: l.json.id, price_type: 'on_request', price_tiers: [], valid_from: day(-30), valid_until: day(365),
  })
  expect(o.status, o.text).toBe(201)
  return { id: it.json.id, slug: it.json.slug, offerId: o.json.id }
}

test.describe.serial('shop-claim-dispute', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000)
    startedAt = new Date().toISOString()
    const ob = await shopOwnerOnboardWithRetry({
      provider_type: 'dienstleister', domain_slugs: [], specialty_slugs: [],
      location: { lat: LAT, lng: LNG, address: 'E2E Street 7', is_b2c_storefront: true },
      contact: { website: 'https://e2e-dispute-taverne.example', phone: '+35799111222' },
      shop_name: SHOP_NAME,
      credentials: { type: 'email', email: oldEmail, password: PASSWORD, name: 'E2E Old Owner' },
      lang: 'en',
      catalog_consent: { accepted: true, text_version: CATALOG_CONSENT_TEXT_VERSION, lang: 'en' },
    })
    oldOwnerId = ob.user_id as number
    shopId = ob.shop_id as number
    tracker.owner(oldOwnerId)
    tracker.shop(shopId)
    shopSlug = psql(`select slug from shops where id=${shopId}`)
    oldToken = await shopOwnerLogin(oldEmail, PASSWORD)
    for (const label of ['Widget-A', 'Widget-B']) {
      const name = e2eName(SPEC, label)
      const it = await offerFor(oldToken, name)
      items.push({ ...it, name })
    }
    oldCaseId = Number(psql(`select id from catalog_cases where shop_id=${shopId} order by id desc limit 1`))
    applicantCtx = await browser.newContext({ baseURL: BASE_URL })
    applicantPage = await applicantCtx.newPage()
  })

  test.afterAll(async () => {
    test.setTimeout(180_000)
    await applicantCtx?.close()
    try {
      await tracker.cleanup()
    } catch (e) {
      console.warn('[shop-claim-dispute] cleanup:', e)
    }
    const dir = path.join(__dirname, 'reports')
    fs.mkdirSync(dir, { recursive: true })
    const status = stepLog.some((s) => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    fs.writeFileSync(
      path.join(dir, `shop-claim-dispute-${new Date().toISOString().slice(0, 10)}.md`),
      [
        '# Journey-Report: shop-claim-dispute (F5970)', '',
        `**Gestartet:** ${startedAt}  **Ende:** ${new Date().toISOString()}  **Ergebnis:** ${status}`,
        `**Frontend:** ${BASE_URL}  **Backend:** ${BACKEND_URL}  **Shop:** ${shopSlug}`, '',
        '| Schritt | Beschreibung | Status |', '|---|---|---|',
        ...stepLog.map((s) => `| ${s.step} | ${s.desc} | **${s.status}** |`),
      ].join('\n'),
    )
  })

  test('1 Ausgangslage: Angebote oeffentlich sichtbar, Shop gilt als beansprucht, Claim-Seite im Dispute-Modus (AC 2/18)', async ({ page }) => {
    const v = await publicView()
    expect(v.productCount).toBe(2)
    for (const it of items) {
      expect(v.detail[it.slug], `Produktseite ${it.slug}`).toContain(shopSlug)
      expect(v.search[it.slug], `Suche ${it.slug}`).toContain(shopSlug)
    }
    await page.goto(`/en/shops/${shopSlug}`)
    await waitForPageHydrated(page)
    await expect(page.getByTestId('shop-claim-report')).toHaveCount(1)
    await expect(page.getByTestId('shop-claim-cta')).toHaveCount(0)

    await page.goto(`/shop-admin/claim?shop=${shopSlug}`)
    const confirm = page.getByTestId('claim-owner-confirm')
    await waitForHydrated(confirm)
    await confirm.check()
    await page.getByRole('button', { name: tr.claim_continue }).click()
    await page.locator('input[name="name"]').fill('Probe')
    await page.locator('input[name="email"]').fill(`e2e-${RUN_ID}-probe@pundo-e2e.io`)
    await page.locator('input[name="password"]').fill(PASSWORD)
    await page.getByRole('button', { name: tr.claim_continue }).click()
    await expect(page.getByTestId('claim-step-method')).toBeVisible()
    await expect(page.getByTestId('claim-method-picker'), 'AC 18: keine Auswahl, nur Dokument').toHaveCount(0)
    await expect(page.locator('input[value="email_domain"]')).toHaveCount(0)
    await expect(page.locator('input[value="shop_email_code"]')).toHaveCount(0)
    await expect(page.getByTestId('claim-document-upload')).toBeVisible()
    await expect(page.getByTestId('claim-callback-ack')).toBeVisible()
    expect(psql(`select count(*) from shop_owners where email='e2e-${RUN_ID}-probe@pundo-e2e.io'`)).toBe('0')
    logStep(1, 'AC2/AC18/AC24-Ausgangslage Dispute-Modus, Angebote sichtbar', true)
  })

  test('2 Dispute per Wizard: falscher Dateityp wird abgewiesen, PNG + Rueckruf-Hinweis gehen durch (AC 18/19/20)', async () => {
    test.setTimeout(120_000)
    const page = applicantPage
    await page.goto(`/shop-admin/claim?shop=${shopSlug}`)
    const confirm = page.getByTestId('claim-owner-confirm')
    await waitForHydrated(confirm)
    await confirm.check()
    await page.getByRole('button', { name: tr.claim_continue }).click()
    await page.locator('input[name="name"]').fill('E2E Real Owner')
    await page.locator('input[name="email"]').fill(appEmail)
    await page.locator('input[name="password"]').fill(PASSWORD)
    await page.getByRole('button', { name: tr.claim_continue }).click()
    await expect(page.getByTestId('claim-step-method')).toBeVisible()

    // Browser-Vorpruefung: falsche Endung
    await page.getByTestId('claim-file-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
    await expect(page.getByText(tr.claim_upload_err_type.replace('{name}', 'notes.txt'))).toBeVisible()
    // Backend-Pruefung (Magic Bytes): Endung/MIME sehen gut aus, Inhalt ist HTML
    await page.getByTestId('claim-file-input').setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('<html><script>alert(1)</script></html>') })
    await page.getByTestId('claim-callback-ack').check()
    const submit = page.getByTestId('claim-submit')
    await expect(submit).toBeEnabled({ timeout: 45_000 })
    await submit.click()
    await expect(page.getByRole('alert').filter({ hasText: tr.claim_err_doc_type.replace('{filename}', 'fake.png') })).toBeVisible()
    expect(psql(`select count(*) from shop_owners where email='${appEmail}'`), 'AC 19/12: kein Konto, kein Antrag bei Abweisung').toBe('0')
    expect(psql(`select count(*) from claim_requests where shop_id=${shopId}`)).toBe('0')

    // Entfernen und gueltiges PNG; ohne Haken ist "Absenden" gesperrt
    await page.getByRole('button', { name: new RegExp(tr.claim_upload_remove, 'i') }).first().click()
    await page.getByTestId('claim-file-input').setInputFiles({ name: 'gewerbeschein.png', mimeType: 'image/png', buffer: makePng(3) })
    await page.getByTestId('claim-callback-ack').uncheck()
    await expect(submit).toBeDisabled()
    await page.getByTestId('claim-callback-ack').check()
    await page.locator('#claim-message').fill('E2E: ich bin der Inhaber')
    await expect(submit).toBeEnabled({ timeout: 45_000 })
    await submit.click()
    await page.waitForURL(/\/shop-admin\/claim\/status\?id=\d+/, { timeout: 30_000 })
    claimId = Number(new URL(page.url()).searchParams.get('id'))
    appId = Number(psql(`select id from shop_owners where email='${appEmail}'`))
    tracker.owner(appId)
    await expect(page.getByTestId('claim-sub-state')).toHaveText(tr.claim_sub_awaiting_review_dispute)
    await expect(page.getByText('gewerbeschein.png')).toBeVisible()
    expect(psql(`select kind||'|'||status||'|'||proof_method from claim_requests where id=${claimId}`)).toBe('dispute|open|document')
    docIds = psql(`select id from claim_documents where claim_request_id=${claimId} order by id`).split('\n').map(Number)
    expect(docIds).toHaveLength(1)
    logStep(2, 'AC18/AC19 Dateityp-Pruefung (Browser + Magic Bytes), Dispute angelegt', true)
  })

  test('3 Waehrend der Pruefung bleibt der alte Owner unberuehrt und arbeitsfaehig, keine Benachrichtigung (AC 20)', async ({ browser }) => {
    expect(psql(`select status from shop_owners where id=${oldOwnerId}`)).toBe('approved')
    expect(psql(`select count(*) from shop_listings where shop_id=${shopId} and ownership_review_since is not null`)).toBe('0')
    expect(psql(`select count(*) from catalog_consents where shop_id=${shopId} and withdrawn_at is not null`)).toBe('0')
    expect(psql(`select count(*) from claim_request_events where claim_request_id=${claimId} and event_type like '%previous%'`)).toBe('0')
    const list = await ownerApi<{ items: unknown[] }>(oldToken, 'GET', '/offers')
    expect(list.status).toBe(200)
    expect(list.json.items.length).toBe(2)
    const ctx = await browser.newContext({ baseURL: BASE_URL })
    await ctx.addCookies([{ name: 'shop_owner_token', value: oldToken, url: BASE_URL }])
    const p = await ctx.newPage()
    try {
      await p.goto('/shop-admin/offers')
      await waitForPageHydrated(p)
      await expect(p.getByTestId('offer-row')).toHaveCount(2)
      await expect(p.getByTestId('unverified-offers-banner')).toHaveCount(0)
    } finally {
      await ctx.close()
    }
    logStep(3, 'AC20 alter Owner arbeitsfaehig, nichts markiert, nichts zurueckgezogen', true)
  })

  test('4 Admin-Detail: Dispute-Badge, aktueller Owner, Dokument nur fuer Admin mit Header-Allowlist (AC 21/36/37)', async ({ adminPage: page, browser, request }) => {
    test.setTimeout(120_000)
    await page.goto('/admin/claims')
    const row = page.getByTestId('claim-row').filter({ hasText: SHOP_NAME })
    await expect(row).toHaveCount(1)
    await expect(row.getByTestId('claim-dispute-badge')).toBeVisible()

    await page.goto(`/admin/claims/${claimId}`)
    await expect(page.getByTestId('claim-detail')).toBeVisible()
    await expect(page.getByText(oldEmail).first()).toBeVisible()
    // AC 21: "Annehmen" gibt es erst nach "geprueft"
    await expect(page.getByTestId('action-accept')).toHaveCount(0)
    await expect(page.getByTestId('action-verify')).toBeVisible()
    await expect(page.getByTestId('claim-document')).toHaveCount(1)
    // Das Dokument wird erst auf Klick geladen (jeder Abruf ist ein Audit-Ereignis) und unter der CSP als <img> gezeigt
    await expect(page.getByTestId('claim-document').locator('img')).toHaveCount(0)
    await page.getByTestId('claim-document-toggle').click()
    const img = page.getByTestId('claim-document').locator('img')
    await expect(img).toBeVisible()
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)

    // Dokument ueber den Next-Admin-Proxy: Header-Allowlist, no-store, nosniff
    const url = `${BASE_URL}/api/admin/claim-requests/${claimId}/documents/${docIds[0]}`
    const ok = await page.request.get(url)
    expect(ok.status()).toBe(200)
    expect(ok.headers()['content-type']).toContain('image/png')
    expect(ok.headers()['cache-control']).toBe('no-store')
    expect(ok.headers()['x-content-type-options']).toBe('nosniff')
    expect(ok.headers()['content-disposition']).toMatch(/^inline/)
    expect(ok.headers()['content-security-policy']).toContain('sandbox')
    expect(ok.headers()['x-powered-by']).toBeUndefined()
    // Nicht-Admins: anonym, Antragsteller (eigene Session), alter Owner
    expect([401, 403]).toContain((await request.get(url)).status())
    const asApplicant = await applicantCtx.request.get(url)
    expect([401, 403]).toContain(asApplicant.status())
    const oc = await browser.newContext({ baseURL: BASE_URL })
    await oc.addCookies([{ name: 'shop_owner_token', value: oldToken, url: BASE_URL }])
    expect([401, 403]).toContain((await oc.request.get(url)).status())
    const direct = await fetch(`${BACKEND_URL}/api/v1/admin/claim-requests/${claimId}/documents/${docIds[0]}`, { headers: { Authorization: `Bearer ${oldToken}` } })
    expect([401, 403]).toContain(direct.status)
    await oc.close()
    // Dokumentabruf ist auditiert
    const detail = await adminApi<{ documents: Array<{ view_count: number }> }>('GET', `/claim-requests/${claimId}`)
    expect(detail.json.documents[0].view_count).toBeGreaterThanOrEqual(1)
    logStep(4, 'AC21/AC36/AC37 Admin-Detail, Dokument-Viewer nur Admin, Header', true)
  })

  test('5 Rueckruf: Admin erzeugt Code und protokolliert "erreicht", Antragsteller gibt Code ein -> geprueft (AC 9)', async ({ adminPage: page }) => {
    test.setTimeout(120_000)
    await page.goto(`/admin/claims/${claimId}`)
    await expect(page.getByTestId('warn-no-callback')).toHaveCount(0) // Warnung erst im Annahme-Dialog
    await page.getByTestId('callback-issue').click()
    const code = (await page.getByTestId('callback-code').textContent())?.trim() ?? ''
    expect(code).toMatch(/^\d{6}$/)
    await page.getByTestId('callback-outcome').selectOption('reached')
    await page.getByTestId('callback-save').click()
    await expect(page.getByTestId('claim-callbacks')).toContainText(sys.claims_callback_reached)

    const ap = applicantPage
    await ap.goto(`/shop-admin/claim/status?id=${claimId}`)
    await expect(ap.getByTestId('claim-sub-state')).toHaveText(tr.claim_sub_callback_done)
    await ap.locator('#claim-code').fill(code)
    await ap.getByRole('button', { name: tr.claim_code_verify }).click()
    await expect(ap.getByTestId('claim-status-chip')).toHaveText(tr.claim_status_label_verified)
    expect(psql(`select status from claim_requests where id=${claimId}`)).toBe('verified')
    const detail = await adminApi<{ callbacks: Array<{ admin_id: number; at: string; outcome: string }> }>('GET', `/claim-requests/${claimId}`)
    expect(detail.json.callbacks[0]).toMatchObject({ outcome: 'reached' })
    expect(detail.json.callbacks[0].admin_id).toBeGreaterThan(0)
    // Konto-E-Mail bestaetigen (AR3): Annahme verlangt ein reales Postfach
    const token = psql(`select email_verification_token from shop_owners where id=${appId}`)
    await ap.goto(`/shop-admin/verify-email?token=${encodeURIComponent(token)}`)
    await expect(ap.getByTestId('verify-email-claim-hint')).toBeVisible()
    logStep(5, 'AC9 Rueckruf-Protokoll (Zeit, Admin-ID) + Code -> verified', true)
  })

  test('6 Annahme "und Owner wechseln": Folgen werden aufgelistet; Owner gewechselt, Konto gesperrt, Consent/Case beendet (AC 22/26/27)', async ({ adminPage: page }) => {
    test.setTimeout(120_000)
    await page.goto(`/admin/claims/${claimId}`)
    await page.getByTestId('action-accept').click()
    const dialog = page.getByTestId('claim-decision-dialog')
    await expect(dialog.getByTestId('accept-consequences')).toContainText(sys.claims_cons_suspend)
    await expect(dialog.getByTestId('accept-consequences')).toContainText(sys.claims_cons_offers.replace('{n}', '2'))
    await expect(dialog.getByTestId('notify-previous')).toBeChecked()
    await expect(dialog.getByTestId('warn-no-callback')).toHaveCount(0)
    await dialog.getByTestId('decision-reason').fill('E2E: Dokument und Rueckruf bestaetigen die Inhaberschaft')
    await dialog.getByTestId('decision-confirm').click()
    await expect(page.getByTestId('claim-status')).toHaveText(sys.claims_status_accepted, { timeout: 20_000 })

    expect(psql(`select status||'|'||coalesce(shop_id::text,'') from shop_owners where id=${oldOwnerId}`)).toBe('suspended|')
    expect(psql(`select status||'|'||shop_id from shop_owners where id=${appId}`)).toBe(`approved|${shopId}`)
    expect(psql(`select previous_owner_id||'|'||offers_flagged_count||'|'||(withdrawn_consent_id is not null)::text||'|'||notify_previous_owner::text from claim_requests where id=${claimId}`))
      .toBe(`${oldOwnerId}|2|true|true`)
    expect(psql(`select withdrawn_reason from catalog_consents where shop_id=${shopId} order by id desc limit 1`)).toBe('owner_reassigned')
    expect(psql(`select status from catalog_cases where id=${oldCaseId}`)).toBe('cancelled')
    expect(psql(`select count(*) from offers o join shop_listings l on l.id=o.shop_listing_id where l.shop_id=${shopId}`), 'nichts geloescht').toBe('2')
    // genau eine Sperr-Mail an das alte Konto wurde versucht/versandt (AC 27)
    expect(psql(`select count(*) from claim_request_events where claim_request_id=${claimId} and event_type in ('notification_sent','notification_failed') and payload::text like '%suspend%'`))
      .toBe('1')
    logStep(6, 'AC22/AC26/AC27 Annahme: Suspend, Zuordnung, Consent zurueck, Case cancelled', true)
  })

  test('7 Alter Owner ist ausgesperrt: Login 401, altes Cookie wirkt nicht mehr (Portal -> Login) (AC 23)', async ({ browser }) => {
    const wrong = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: oldEmail, password: 'Wrong-pass-999!' }),
    })
    const right = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: oldEmail, password: PASSWORD }),
    })
    expect(right.status).toBe(401)
    expect(await right.text()).toBe(await wrong.text()) // neutral: kein Hinweis auf die Sperre
    expect(right.headers.get('set-cookie')).toBeNull()
    for (const p of ['/offers', '/items', '/shop', '/api-keys']) {
      const r = await ownerApi(oldToken, 'GET', p)
      expect([401, 403], `GET ${p}`).toContain(r.status)
    }
    const logo = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop/logo`, {
      method: 'POST', headers: { Authorization: `Bearer ${oldToken}` }, body: (() => { const f = new FormData(); f.set('file', new Blob([new Uint8Array(makePng(1))], { type: 'image/png' }), 'l.png'); return f })(),
    })
    expect(logo.status, 'require_shop_owner_or_pending sperrt suspended').toBe(403)

    const ctx = await browser.newContext({ baseURL: BASE_URL })
    await ctx.addCookies([{ name: 'shop_owner_token', value: oldToken, url: BASE_URL }])
    const p = await ctx.newPage()
    try {
      await p.goto('/shop-admin/offers')
      await p.waitForURL(/\/shop-admin\/login/, { timeout: 20_000 })
    } finally {
      await ctx.close()
    }
    logStep(7, 'AC23 suspended: Login 401 neutral, JWT tot, Portal-Redirect', true)
  })

  test('8 Oeffentliche Kanaele: Angebote weg, Shop und Profil bleiben (AC 24)', async ({ page }) => {
    const v = await publicView()
    expect(v.shopId, 'Shop-Detail bleibt erreichbar').toBe(shopId)
    expect(v.productCount).toBe(0)
    expect(v.topProducts).toBe(0)
    expect(v.productsTotal).toBe(0)
    for (const it of items) {
      expect(v.detail[it.slug], `Produktseite ${it.slug}`).not.toContain(shopSlug)
      expect(v.search[it.slug], `Suche ${it.slug}`).not.toContain(shopSlug)
    }
    // Run-unique name: the generic word 'Taverne' matches ~185 shops in pundo_test and pushes this one off the first page.
    const list = await pub<{ items: Array<{ slug: string }> }>('/shops', { q: SHOP_NAME, lat: LAT, lng: LNG })
    expect(list.items.map((s) => s.slug)).toContain(shopSlug)
    expect(psql(`select count(*) from offers o join shop_listings l on l.id=o.shop_listing_id where l.shop_id=${shopId} and o.archived=false`), 'in der DB nichts geloescht/archiviert').toBe('2')

    await page.goto(`/en/shops/${shopSlug}`)
    await waitForPageHydrated(page)
    await expect(page.locator('h1').first()).toContainText(SHOP_NAME)
    await expect(page.locator('a[href*="/products/"]')).toHaveCount(0)
    await page.goto(`/en/products/${items[0].slug}`)
    await waitForPageHydrated(page)
    await expect(page.getByText(SHOP_NAME)).toHaveCount(0)
    const sitemap = await (await page.request.get(`${BASE_URL}/sitemap-shops.xml`)).text()
    expect(sitemap.includes(shopSlug), 'R2: Shop ohne oeffentliche Angebote ist nicht indexierbar').toBe(false)
    logStep(8, 'AC24 alle Kanaele ohne Angebote, Shop-Profil sichtbar, DB unveraendert', true)
  })

  test('9 Neuer Owner: Banner, "Zu pruefen", Bestaetigen macht sichtbar, Archivieren archiviert; Banner geht auf 0 (AC 25)', async ({ browser }) => {
    test.setTimeout(120_000)
    const ctx = await browser.newContext({ baseURL: BASE_URL })
    const p = await ctx.newPage()
    try {
      await p.goto('/shop-admin/login')
      await waitForPageHydrated(p)
      await p.fill('input[name="email"]', appEmail)
      await p.fill('input[name="password"]', PASSWORD)
      await p.click('button[type="submit"]')
      await p.waitForURL(/\/shop-admin\/dashboard/, { timeout: 20_000 })
      const banner = p.getByTestId('unverified-offers-banner')
      await expect(banner).toContainText(sa.offer_review_banner.replace('{n}', '2'))

      await banner.getByRole('link').click()
      await expect(p.getByTestId('offer-review-panel')).toBeVisible()
      await expect(p.getByTestId('offer-row')).toHaveCount(2)
      await expect(p.getByTestId('offer-review-badge')).toHaveCount(2)

      // erstes Angebot bestaetigen
      await p.getByTestId('offer-row').filter({ hasText: items[0].name }).getByTestId('offer-review-confirm').click()
      await expect(banner).toContainText(sa.offer_review_banner.replace('{n}', '1'))
      await expect.poll(async () => (await publicView()).detail[items[0].slug]).toContain(shopSlug)
      expect((await publicView()).detail[items[1].slug]).not.toContain(shopSlug)

      // zweites archivieren
      await p.getByTestId('offer-row').filter({ hasText: items[1].name }).getByTestId('offer-review-archive').click()
      await expect(banner).toHaveCount(0)
      expect(psql(`select archived::text from offers where id=${items[1].offerId}`)).toBe('true')
      expect(psql(`select count(*) from shop_listings where shop_id=${shopId} and ownership_review_since is not null`)).toBe('0')
      const v = await publicView()
      expect(v.detail[items[1].slug]).not.toContain(shopSlug)
      expect(v.productCount).toBe(1)
    } finally {
      await ctx.close()
    }
    logStep(9, 'AC25 Banner/Filter/Bestaetigen/Archivieren', true)
  })

  test('10 Consent: neuer Owner startet bei "none"; sein Consent erzeugt genau einen NEUEN Case, der alte bleibt cancelled (AC 14/26)', async () => {
    const token = await shopOwnerLogin(appEmail, PASSWORD)
    const status = await ownerApi<{ status: string; catalog_case_id: number | null }>(token, 'GET', '/catalog-consent')
    expect(status.json.status).toBe('none')
    expect(Number(psql(`select count(*) from catalog_cases where shop_id=${shopId} and status<>'cancelled'`))).toBe(0)
    const given = await ownerApi<{ created: boolean; catalog_case_id: number }>(token, 'POST', '/catalog-consent', {
      accepted: true, text_version: CATALOG_CONSENT_TEXT_VERSION, lang: 'en',
    })
    expect(given.status, given.text).toBe(201)
    const again = await ownerApi(token, 'POST', '/catalog-consent', { accepted: true, text_version: CATALOG_CONSENT_TEXT_VERSION, lang: 'en' })
    expect(again.status).toBe(200) // idempotent
    const cases = psql(`select id||':'||status from catalog_cases where shop_id=${shopId} order by id`).split('\n')
    expect(cases).toHaveLength(2)
    expect(cases[0]).toBe(`${oldCaseId}:cancelled`)
    expect(cases[1].endsWith(':cancelled')).toBe(false)
    const mine = await ownerApi<{ cases: Array<{ id: number }> }>(token, 'GET', '/catalog-cases')
    expect(JSON.stringify(mine.json)).not.toContain(`"id":${oldCaseId},`)
    // Sichtbarkeit alter Case fuer den Owner: 404 (K7)
    expect((await ownerApi(token, 'GET', `/catalog-cases/${oldCaseId}/sample`)).status).toBe(404)
    // kein SLA-Alarm fuer einen cancelled Case (Praedikat): Frist in der Vergangenheit aendert nichts am Status
    psql(`update catalog_cases set sla_deadline_at = now() - interval '3 days' where id=${oldCaseId}`)
    expect(psql(`select status from catalog_cases where id=${oldCaseId}`)).toBe('cancelled')
    logStep(10, 'AC14/AC26 Consent none -> neuer Case, alter cancelled, Owner sieht ihn nie', true)
  })

  test('11 Abgelehnter Dispute laesst Owner, Angebote und Consent unveraendert; Begruendung steht im Audit (AC 28)', async ({ adminPage: page }) => {
    test.setTimeout(120_000)
    const rival = await applyViaApi(shopSlug, rivalEmail, 'document', true)
    tracker.owner(Number(psql(`select id from shop_owners where email='${rivalEmail}'`)))
    const before = psql(`select (select count(*) from shop_listings where shop_id=${shopId} and ownership_review_since is not null)||'|'||(select count(*) from catalog_consents where shop_id=${shopId} and withdrawn_at is null)||'|'||(select status from shop_owners where id=${appId})`)

    await page.goto(`/admin/claims/${rival.id}`)
    await page.getByTestId('action-reject').click()
    const dialog = page.getByTestId('claim-decision-dialog')
    await dialog.getByTestId('reject-code').selectOption('insufficient_proof')
    await dialog.getByTestId('decision-reason').fill('E2E: Nachweis nicht ausreichend, interne Notiz XYZ')
    await dialog.getByTestId('decision-confirm').click()
    await expect(page.getByTestId('claim-status')).toHaveText(sys.claims_status_rejected, { timeout: 20_000 })

    expect(psql(`select status||'|'||rejection_reason||'|'||(decided_by_admin_id is not null)::text||'|'||decision_reason from claim_requests where id=${rival.id}`))
      .toBe('rejected|insufficient_proof|true|E2E: Nachweis nicht ausreichend, interne Notiz XYZ')
    expect(psql(`select (select count(*) from shop_listings where shop_id=${shopId} and ownership_review_since is not null)||'|'||(select count(*) from catalog_consents where shop_id=${shopId} and withdrawn_at is null)||'|'||(select status from shop_owners where id=${appId})`)).toBe(before)
    expect(psql(`select shop_id from shop_owners where id=${appId}`)).toBe(String(shopId))
    // Ablehnungsgrund fuer die Person ist die Klasse, nie die interne Notiz
    const st = await fetch(`${BACKEND_URL}/api/v1/shop-owner/claim/requests/${rival.id}`, { headers: { 'X-Claim-Token': rival.token } })
    const body = await st.text()
    expect(body).toContain('insufficient_proof')
    expect(body).not.toContain('interne Notiz')
    logStep(11, 'AC28 Ablehnung: Owner/Angebote/Consent unveraendert, Audit mit Grund', true)
  })

  test('12 assign-owner im Admin (UI): 409 owner_has_other_shop -> Option; 409 shop_has_owner -> Option; 422 owner_not_assignable (AC 29-32)', async ({ adminPage: page }) => {
    test.setTimeout(180_000)
    const target = await adminApi<{ id: number; slug: string }>('POST', '/shops', buildAdminShopPayload({
      slug: e2eSlug(SPEC, 'assign-target'), names: { en: e2eName(SPEC, 'AssignTarget') }, address_line1: 'Assign St 1', city: 'Limassol', lat: LAT, lng: LNG,
    }))
    expect(target.status).toBe(201)
    tracker.shop(target.json.id)
    // Owner O2 mit eigenem Shop (Auto-Approve)
    const o2email = `e2e-${RUN_ID}-cdisp-o2-${rand()}@pundo.com`
    const o2 = await shopOwnerOnboardWithRetry({
      provider_type: 'dienstleister', domain_slugs: [], specialty_slugs: [],
      location: { lat: LAT, lng: LNG, address: 'O2 Street', is_b2c_storefront: true }, contact: { phone: '+35799000001' },
      shop_name: e2eName(SPEC, 'O2Shop'), credentials: { type: 'email', email: o2email, password: PASSWORD, name: 'E2E O2' }, lang: 'en',
    })
    tracker.owner(o2.user_id as number)
    tracker.shop(o2.shop_id as number)

    const openDialog = async () => {
      await page.goto(`/admin/shops/${target.json.id}/edit`)
      await expect(page.getByTestId('shop-owner-section')).toBeVisible()
      await page.getByTestId('open-assign-owner').click()
      await expect(page.getByTestId('assign-owner-dialog')).toBeVisible()
    }
    const pick = async (email: string) => {
      const dlg = page.getByTestId('assign-owner-dialog')
      await dlg.locator('#assign-owner-search').fill(email)
      await dlg.locator('#assign-owner-search').press('Enter')
      const results = dlg.getByTestId('assign-owner-results')
      await expect(results).toContainText(email)
      await results.locator('li').filter({ hasText: email }).getByRole('button').click()
      await expect(dlg.getByTestId('assign-owner-selected')).toBeVisible()
    }

    // (a) Owner mit anderem Shop: 409 -> Hinweis -> Option -> Erfolg
    await openDialog()
    await pick(o2email)
    const dlg = page.getByTestId('assign-owner-dialog')
    await dlg.locator('textarea').fill('E2E: manuelle Zuweisung')
    await dlg.getByTestId('assign-owner-submit').click()
    await expect(dlg.getByTestId('assign-need-other')).toBeVisible()
    expect(psql(`select count(*) from claim_requests where shop_id=${target.json.id}`)).toBe('0')
    await dlg.getByTestId('assign-deactivate').check()
    await dlg.getByTestId('assign-owner-submit').click()
    await expect(page.getByTestId('assign-owner-dialog')).toHaveCount(0, { timeout: 20_000 })
    expect(psql(`select status||'|'||shop_id from shop_owners where id=${o2.user_id}`)).toBe(`approved|${target.json.id}`)
    expect(psql(`select status from shops where id=${o2.shop_id}`), 'bisheriger Shop inaktiv, nicht geloescht').toBe('inactive')
    expect(psql(`select source||'|'||status from claim_requests where shop_id=${target.json.id}`)).toBe('admin_assign|accepted')

    // (b) Shop hat Owner: 409 shop_has_owner -> Ersetzen
    const t2 = await createApplicantWithoutShop('t2')
    await openDialog()
    await pick(t2.email)
    const dlg2 = page.getByTestId('assign-owner-dialog')
    await dlg2.locator('textarea').fill('E2E: Owner-Wechsel')
    await dlg2.getByTestId('assign-owner-submit').click()
    await expect(dlg2.getByTestId('assign-need-replace')).toBeVisible()
    expect(psql(`select shop_id from shop_owners where id=${o2.user_id}`)).toBe(String(target.json.id))
    await dlg2.getByTestId('assign-replace').check()
    await dlg2.getByTestId('assign-owner-submit').click()
    await expect(page.getByTestId('assign-owner-dialog')).toHaveCount(0, { timeout: 20_000 })
    expect(psql(`select status||'|'||coalesce(shop_id::text,'') from shop_owners where id=${o2.user_id}`)).toBe('suspended|')
    expect(psql(`select status||'|'||shop_id from shop_owners where id=${t2.id}`)).toBe(`approved|${target.json.id}`)

    // (c) 422 owner_not_assignable (suspendiertes Konto) + 404
    const other = await adminApi<{ id: number }>('POST', '/shops', buildAdminShopPayload({
      slug: e2eSlug(SPEC, 'assign-other'), names: { en: e2eName(SPEC, 'AssignOther') }, address_line1: 'Other 1', city: 'Limassol', lat: LAT, lng: LNG,
    }))
    tracker.shop(other.json.id)
    const bad = await adminApi('POST', `/shops/${other.json.id}/assign-owner`, { shop_owner_id: o2.user_id, reason: 'E2E not assignable' })
    expect(bad.status).toBe(422)
    expect(bad.text).toContain('owner_not_assignable')
    expect((await adminApi('POST', `/shops/${other.json.id}/assign-owner`, { shop_owner_id: 999999999, reason: 'E2E missing owner' })).status).toBe(404)
    expect((await adminApi('POST', `/shops/${other.json.id}/assign-owner`, { shop_owner_id: t2.id, reason: '' })).status).toBe(422)
    logStep(12, 'AC29-AC32 assign-owner UI/API: 409/409/422/404, Optionen, Audit-Zeilen', true)
  })

  test('13 Matching-Tab: "Ohne Zuweisung erledigen" und "Owner zuweisen" schliessen die Pruefungen (AC 33)', async ({ adminPage: page }) => {
    test.setTimeout(180_000)
    const shopM = await adminApi<{ id: number }>('POST', '/shops', buildAdminShopPayload({
      slug: e2eSlug(SPEC, 'match'), names: { en: e2eName(SPEC, 'MatchShop') }, address_line1: 'Match 1', city: 'Limassol', lat: LAT, lng: LNG,
    }))
    tracker.shop(shopM.json.id)
    const marker = `e2e-${RUN_ID}-match-${rand()}`
    for (const n of ['a', 'b']) {
      psql(`insert into shop_claim_checks (input_domain, input_shop_name, input_city, match_method, outcome, matched_shop_id, review_status, created_at) values ('${marker}-${n}.example', '${marker}-${n}', 'Limassol', 'domain', 'ambiguous', ${shopM.json.id}, 'pending', now())`)
    }
    const ids = psql(`select id from shop_claim_checks where input_domain like '${marker}-%' order by id`).split('\n').map(Number)

    await page.goto('/admin/claims?tab=matching')
    const checks = page.getByTestId('matching-check').filter({ hasText: marker })
    await expect(checks).toHaveCount(2)
    // a: ohne Zuweisung erledigen -> Pflicht-Begruendung
    const first = checks.filter({ hasText: `${marker}-a` })
    await first.getByTestId('matching-dismiss').click()
    await first.getByTestId('dismiss-confirm').click()
    await expect(first.getByRole('alert')).toContainText(sys.claims_err_reason_required)
    await first.getByTestId('dismiss-reason').fill('E2E: kein Treffer')
    await first.getByTestId('dismiss-confirm').click()
    await expect(page.getByTestId('matching-check').filter({ hasText: `${marker}-a` })).toHaveCount(0, { timeout: 15_000 })
    expect(psql(`select review_status||'|'||resolution_note from shop_claim_checks where id=${ids[0]}`)).toBe('dismissed|E2E: kein Treffer')

    // b: Owner zuweisen -> resolved
    const t3 = await createApplicantWithoutShop('t3')
    const second = page.getByTestId('matching-check').filter({ hasText: `${marker}-b` })
    await second.getByTestId('matching-assign').click()
    const dlg = page.getByTestId('assign-owner-dialog')
    await dlg.locator('#assign-owner-search').fill(t3.email)
    await dlg.locator('#assign-owner-search').press('Enter')
    await dlg.getByTestId('assign-owner-results').locator('li').filter({ hasText: t3.email }).getByRole('button').click()
    await dlg.locator('textarea').fill('E2E: ueber Matching-Pruefung')
    await dlg.getByTestId('assign-owner-submit').click()
    await expect(page.getByTestId('assign-owner-dialog')).toHaveCount(0, { timeout: 20_000 })
    expect(psql(`select review_status from shop_claim_checks where id=${ids[1]}`)).toBe('resolved')
    expect(psql(`select status||'|'||shop_id from shop_owners where id=${t3.id}`)).toBe(`approved|${shopM.json.id}`)
    await page.goto('/admin/claims?tab=matching')
    await expect(page.getByTestId('matching-check').filter({ hasText: marker })).toHaveCount(0)
    psql(`delete from shop_claim_checks where input_domain like '${marker}-%'`)
    logStep(13, 'AC33 Matching-Tab dismiss + assign resolve die Pruefung', true)
  })

  test('14 Gesperrte Konten sind in der Owner-Liste filterbar und markiert (AC 40)', async ({ adminPage: page }) => {
    await page.goto('/admin/shop-owners?status=suspended&q=' + encodeURIComponent(oldEmail))
    const row = page.locator('tr', { hasText: oldEmail })
    await expect(row).toHaveCount(1)
    // Status-Badge der Liste (wie bei den anderen Status der Rohwert, rot hinterlegt)
    await expect(row.locator('span', { hasText: /^suspended$/ })).toHaveClass(/bg-red-200/)
    // und nur dieses Konto bei diesem Filter+Suchbegriff
    await page.goto('/admin/shop-owners?status=approved&q=' + encodeURIComponent(oldEmail))
    await expect(page.locator('tr', { hasText: oldEmail })).toHaveCount(0)
    logStep(14, 'AC40 Filter suspended + Badge', true)
  })
})
