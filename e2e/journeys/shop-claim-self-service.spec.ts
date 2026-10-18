/**
 * Journey: shop-claim-self-service (F5970, Szenario A)
 * Runbook: e2e/journeys/shop-claim-self-service.md
 *
 * Fixtures (Ebene 1, synthetisch, kein Skip):
 * | Fixture        | Was wird aufgebaut                                                          | Was wird geprueft                                         |
 * |----------------|-----------------------------------------------------------------------------|-----------------------------------------------------------|
 * | claim-shop     | RUN_ID-Shop per Admin-API ohne Owner, Website/E-Mail/Telefon (Domain pundo-e2e.io) | CTA, Methoden, Domain-/Code-Nachweis, Annahme        |
 * | applicant A    | `e2e-<run>-...@pundo-e2e.io`, Methode email_domain, Token per psql           | verify-email -> verified -> Admin nimmt an -> Owner       |
 * | applicant B    | zweite Person, Methode shop_email_code, Code per psql (Hash-Formel §5.3)     | falscher Code, Sperre, richtiger Code, superseded         |
 * | has-shop owner | globaler E2E-Owner (hat Shop) ruft die Claim-Seite auf                       | AC 11: Block-Karte statt Wizard                           |
 *
 * Aufraeumen: Shop per TestDataTracker (kaskadiert claim_requests, Owner mit Shop), Antragsteller ohne Shop per
 * tracker.owner. Dokumente: keine (Szenario A). Backend 8500 / Frontend 3500 — NIE 8000/3000.
 * Hinweis Turnstile: Der Standalone-Build nutzt den Cloudflare-Test-Sitekey (scripts/e2e-frontend.cjs); das
 * Test-Backend hat kein TURNSTILE_SECRET_KEY (Bypass). Die Fehlerpfade (ungueltiges Token, 5/h, 20/min) sind
 * im Backend-Integrationstest bzw. im E2E-Report (Strict-Lauf) belegt, nicht hier.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { test, expect, createStepLog, shopOwnerLogin } from '../fixtures'
import { adminApi, e2eName, e2eSlug, TestDataTracker, psql, RUN_ID } from './_helpers/test-data'
import { buildAdminShopPayload } from './_helpers/admin-shop-payload'
import { waitForPageHydrated, waitForHydrated } from './_helpers/hydration'
import { BASE_URL, BACKEND_URL } from '../env'
import { tShopAdminClaim } from '../../src/lib/i18n/shop-admin-claim'
import { tSysAdmin } from '../../src/lib/system-admin-translations'
import { tShop } from '../../src/lib/i18n/shop'
import type { Page } from '@playwright/test'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const SPEC = 'CLAIM-SELF'
const SLUG = e2eSlug(SPEC, 'shop')
const SHOP_NAME = e2eName(SPEC, 'Shop')
const PASSWORD = 'E2eClaimPw!99'
const tr = tShopAdminClaim('en')
const sys = tSysAdmin('en')
const sysEl = tSysAdmin('el')
const { entries: stepLog, logStep } = createStepLog()
const tracker = new TestDataTracker()

const DOMAIN = 'pundo-e2e.io'
const emailA = `e2e-${RUN_ID}-claim-a-${crypto.randomBytes(2).toString('hex')}@${DOMAIN}`
const emailB = `e2e-${RUN_ID}-claim-b-${crypto.randomBytes(2).toString('hex')}@${DOMAIN}`
let shopId = 0
let claimA = 0
let claimB = 0
let startedAt = ''

const codeHash = (id: number, purpose: string, code: string) =>
  crypto.createHash('sha256').update(`claim:${id}:${purpose}:${code}`).digest('hex')

function claimIdFromUrl(page: Page): number {
  const id = new URL(page.url()).searchParams.get('id')
  if (!id) throw new Error(`keine Claim-ID in ${page.url()}`)
  return Number(id)
}

/** Wizard Schritt 1-3. `method`: Radio-Wert. Endet auf der Status-Seite. */
async function applyViaWizard(page: Page, opts: { name: string; email: string; method: string }) {
  await page.goto(`/shop-admin/claim?shop=${SLUG}`)
  const confirm = page.getByTestId('claim-owner-confirm')
  await waitForHydrated(confirm)
  await confirm.check()
  await page.getByRole('button', { name: tr.claim_continue }).click()
  await expect(page.getByTestId('claim-account-step')).toBeVisible()
  await page.locator('input[name="name"]').fill(opts.name)
  await page.locator('input[name="email"]').fill(opts.email)
  await page.locator('input[name="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: tr.claim_continue }).click()
  await expect(page.getByTestId('claim-method-picker')).toBeVisible()
  await page.locator(`input[name="proof_method"][value="${opts.method}"]`).check()
  const submit = page.getByTestId('claim-submit')
  await expect(submit, 'Turnstile-Test-Sitekey liefert ein Token').toBeEnabled({ timeout: 45_000 })
  await submit.click()
  await page.waitForURL(/\/shop-admin\/claim\/status\?id=\d+/, { timeout: 30_000 })
  await expect(page.getByTestId('claim-status')).toBeVisible()
}

test.describe.serial('shop-claim-self-service', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000)
    startedAt = new Date().toISOString()
    const res = await adminApi<{ id: number }>('POST', '/shops', buildAdminShopPayload({
      slug: SLUG,
      names: { en: SHOP_NAME },
      address_line1: 'Test Street 1, Limassol',
      city: 'Limassol',
      lat: 34.6841,
      lng: 33.0379,
      website_url: `https://${DOMAIN}`,
      email: `info@${DOMAIN}`,
      phone: '+35725000000',
    }))
    expect(res.status, res.text).toBe(201)
    shopId = res.json.id
    tracker.shop(shopId)
  })

  test.afterAll(async () => {
    test.setTimeout(120_000)
    try {
      await tracker.cleanup()
    } catch (e) {
      console.warn('[shop-claim-self-service] cleanup:', e)
    }
    const dir = path.join(__dirname, 'reports')
    fs.mkdirSync(dir, { recursive: true })
    const status = stepLog.some((s) => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    fs.writeFileSync(
      path.join(dir, `shop-claim-self-service-${new Date().toISOString().slice(0, 10)}.md`),
      [
        '# Journey-Report: shop-claim-self-service (F5970)', '',
        `**Gestartet:** ${startedAt}  **Ende:** ${new Date().toISOString()}  **Ergebnis:** ${status}`,
        `**Frontend:** ${BASE_URL}  **Backend:** ${BACKEND_URL}  **Shop:** ${SLUG}`, '',
        '| Schritt | Beschreibung | Status |', '|---|---|---|',
        ...stepLog.map((s) => `| ${s.step} | ${s.desc} | **${s.status}** |`),
      ].join('\n'),
    )
  })

  test('1 Gast sieht die Claim-CTA (en), rel=nofollow, Link fuehrt auf die Claim-Seite', async ({ page }) => {
    await page.goto(`/en/shops/${SLUG}`)
    await waitForPageHydrated(page)
    const cta = page.getByTestId('shop-claim-cta')
    // Beim Streaming liegt kurz eine versteckte Kopie (div#S:n[hidden]) im DOM: erst auf genau eine warten.
    await expect(cta).toHaveCount(1)
    await expect(cta).toBeVisible()
    const link = cta.getByRole('link', { name: tShop('en').shop_claim_cta_button })
    await expect(link).toHaveAttribute('rel', /nofollow/)
    await expect(link).toHaveAttribute('href', `/shop-admin/claim?shop=${SLUG}`)
    await expect(page.getByTestId('shop-claim-report')).toHaveCount(0)
    await link.click()
    await expect(page).toHaveURL(/\/shop-admin\/claim\?shop=/)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.getByTestId('claim-wizard')).toBeVisible()
    logStep(1, 'AC1/AC4 CTA, nofollow, Claim-Seite ohne Login', true)
  })

  test('2 RTL: CTA und Claim-Seite in ar und he laufen dir=rtl (AC 1, AC 44)', async ({ page, context }) => {
    for (const lang of ['ar', 'he'] as const) {
      await context.addCookies([{ name: 'app_lang', value: lang, url: BASE_URL }])
      await page.goto(`/${lang}/shops/${SLUG}`)
      await waitForPageHydrated(page)
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      const cta = page.getByTestId('shop-claim-cta')
      // genau eine CTA im DOM (Streaming darf keine zweite, sichtbare Kopie hinterlassen)
      await expect(cta).toHaveCount(1)
      await expect(cta).toBeVisible()
      await expect(cta.getByRole('link')).toHaveText(tShop(lang).shop_claim_cta_button)
      await page.goto(`/shop-admin/claim?shop=${SLUG}`)
      const wizard = page.getByTestId('claim-wizard')
      await waitForHydrated(wizard)
      await expect(wizard).toHaveAttribute('dir', 'rtl')
      await expect(page.getByText(tShopAdminClaim(lang).claim_owner_confirm_label)).toBeVisible()
    }
    await context.addCookies([{ name: 'app_lang', value: 'en', url: BASE_URL }])
    logStep(2, 'AC1/AC44 ar+he: CTA und Claim-Wizard RTL, uebersetzt', true)
  })

  test('3 Freemail-Konto: "E-Mail-Domain" wird nicht angeboten (AC 6); Pflicht-Haken (AC 12-nah)', async ({ page }) => {
    await page.goto(`/shop-admin/claim?shop=${SLUG}`)
    const confirm = page.getByTestId('claim-owner-confirm')
    await waitForHydrated(confirm)
    // ohne Haken weiter -> Fehler, kein Schritt
    await page.getByRole('button', { name: tr.claim_continue }).click()
    await expect(page.getByText(tr.claim_owner_confirm_required)).toBeVisible()
    await expect(page.getByTestId('claim-account-step')).toHaveCount(0)
    await confirm.check()
    await page.getByRole('button', { name: tr.claim_continue }).click()
    await page.locator('input[name="name"]').fill('Freemail Tester')
    await page.locator('input[name="email"]').fill(`e2e-${RUN_ID}-free@gmail.com`)
    await page.locator('input[name="password"]').fill(PASSWORD)
    await page.getByRole('button', { name: tr.claim_continue }).click()
    const picker = page.getByTestId('claim-method-picker')
    await expect(picker).toBeVisible()
    await expect(picker.locator('input[value="email_domain"]')).toHaveCount(0)
    await expect(picker.locator('input[value="shop_email_code"]')).toHaveCount(1)
    await expect(picker.locator('input[value="phone_callback"]')).toHaveCount(1)
    // maskierte Werte, kein Klartext
    const text = (await picker.textContent()) ?? ''
    expect(text).toContain('i***@')
    expect(text).not.toContain(`info@${DOMAIN}`)
    expect(text).not.toContain('25000000')
    logStep(3, 'AC4/AC6 Freemail: keine Domain-Methode, maskierte Kontaktdaten', true)
  })

  test('4 Person A: Domain-Nachweis per Wizard, E-Mail-Link bestaetigt -> verified (AC 5)', async ({ page }) => {
    test.setTimeout(120_000)
    await applyViaWizard(page, { name: 'Alice Domain', email: emailA, method: 'email_domain' })
    claimA = claimIdFromUrl(page)
    await expect(page.getByTestId('claim-status-shop')).toHaveText(SHOP_NAME)
    await expect(page.getByTestId('claim-status-chip')).toHaveText(tr.claim_status_label_open)
    await expect(page.getByTestId('claim-sub-state')).toHaveText(tr.claim_sub_awaiting_email_verification)
    // Token steht nicht (mehr) in der URL
    expect(page.url()).not.toMatch(/[?&]t=/)

    const token = psql(`select email_verification_token from shop_owners where email='${emailA}'`)
    expect(token.length).toBeGreaterThan(20)
    tracker.owner(Number(psql(`select id from shop_owners where email='${emailA}'`)))
    await page.goto(`/shop-admin/verify-email?token=${encodeURIComponent(token)}`)
    await expect(page.getByTestId('verify-email-claim-hint')).toHaveText(tr.claim_verify_email_verified)
    expect(psql(`select status||'|'||proof_method from claim_requests where id=${claimA}`)).toBe('verified|email_domain')

    await page.goto(`/shop-admin/claim/status?id=${claimA}`)
    await expect(page.getByTestId('claim-status-chip')).toHaveText(tr.claim_status_label_verified)
    logStep(4, 'AC5 email_domain: Wizard -> Mail-Link -> verified', true)
  })

  test('5 Doppel-Antrag derselben Person erzeugt keinen zweiten (AC 10)', async ({ page }) => {
    test.setTimeout(120_000)
    await applyViaWizard(page, { name: 'Alice Domain', email: emailA, method: 'email_domain' })
    expect(claimIdFromUrl(page)).toBe(claimA)
    await expect(page.getByText(tr.claim_existing_notice)).toBeVisible()
    expect(psql(`select count(*) from claim_requests where shop_id=${shopId} and applicant_owner_id=(select id from shop_owners where email='${emailA}')`)).toBe('1')
    logStep(5, 'AC10 Idempotenz: bestehender Antrag, kein Duplikat', true)
  })

  test('6 Person B: Code an Shop-Adresse, falscher Code, Sperre nach 5 Fehlversuchen, dann neuer Code -> verified (AC 7/8)', async ({ browser }) => {
    test.setTimeout(180_000)
    const ctx = await browser.newContext({ baseURL: BASE_URL })
    const page = await ctx.newPage()
    try {
      await applyViaWizard(page, { name: 'Bob Code', email: emailB, method: 'shop_email_code' })
      claimB = claimIdFromUrl(page)
      tracker.owner(Number(psql(`select id from shop_owners where email='${emailB}'`)))
      await expect(page.getByTestId('claim-sub-state')).toHaveText(tr.claim_sub_awaiting_code)

      await page.getByRole('button', { name: tr.claim_code_send }).click()
      const input = page.locator('#claim-code')
      await expect(input).toBeVisible()
      expect(psql(`select count(*) from claim_requests c where c.id=${claimB} and c.code_hash is not null`)).toBe('1')
      expect(psql(`select count(*) from claim_request_events where claim_request_id=${claimB} and event_type='code_sent'`)).toBe('1')

      // Ein bekannter Code ersetzt den Zufallscode (Architektur §5.3, keine Test-Hintertuer im Backend)
      const known = '424242'
      psql(`update claim_requests set code_hash='${codeHash(claimB, 'shop_email', known)}', code_expires_at=now()+interval '30 minutes', code_failed_attempts=0 where id=${claimB}`)

      for (let i = 1; i <= 5; i++) {
        await input.fill('111111')
        await page.getByRole('button', { name: tr.claim_code_verify }).click()
        if (i < 5) {
          await expect(page.getByText(tr.claim_code_attempts.replace('{n}', String(5 - i)), { exact: true })).toBeVisible()
        }
      }
      await expect(page.getByText(tr.claim_code_locked)).toBeVisible()
      // gesperrt: auch der richtige Code wird nicht mehr akzeptiert (Eingabefeld ist weg, DB bleibt open)
      expect(psql(`select status from claim_requests where id=${claimB}`)).toBe('open')
      expect(psql(`select count(*) from claim_request_events where claim_request_id=${claimB} and event_type='code_locked'`)).toBe('1')

      // "Neuen Code anfordern" (2 von 3 in 24 h)
      await page.getByRole('button', { name: tr.claim_code_resend }).click()
      await expect(input).toBeVisible()
      psql(`update claim_requests set code_hash='${codeHash(claimB, 'shop_email', known)}', code_expires_at=now()+interval '30 minutes', code_failed_attempts=0 where id=${claimB}`)
      await input.fill(known)
      await page.getByRole('button', { name: tr.claim_code_verify }).click()
      await expect(page.getByTestId('claim-status-chip')).toHaveText(tr.claim_status_label_verified)
      expect(psql(`select status||'|'||proof_method from claim_requests where id=${claimB}`)).toBe('verified|shop_email_code')
      // AC 44: Status-Seite in ar/he laeuft RTL (Token liegt in sessionStorage dieses Tabs)
      for (const lang of ['ar', 'he'] as const) {
        await ctx.addCookies([{ name: 'app_lang', value: lang, url: BASE_URL }])
        await page.reload()
        await expect(page.getByTestId('claim-status')).toHaveAttribute('dir', 'rtl')
        await expect(page.getByTestId('claim-status-chip')).toHaveText(tShopAdminClaim(lang).claim_status_label_verified)
      }
      await ctx.addCookies([{ name: 'app_lang', value: 'en', url: BASE_URL }])
      logStep(6, 'AC7/AC8 Code: falsch x5 -> gesperrt, Neuanforderung, richtig -> verified; AC44 Status-Seite RTL', true)
    } finally {
      await ctx.close()
    }
  })

  test('7 Admin-Queue: beide Antraege mit Badge, Detail, Annahme ohne Begruendung scheitert, mit Begruendung gelingt (AC 13/16/36)', async ({ adminPage: page }) => {
    test.setTimeout(120_000)
    // Konto B hat die Mail nicht bestaetigt; A ist bestaetigt. Reihenfolge: erst A annehmen.
    await page.goto('/admin/claims')
    await expect(page.getByTestId('claim-queue')).toBeVisible()
    const rows = page.getByTestId('claim-row').filter({ hasText: SHOP_NAME })
    await expect(rows).toHaveCount(2)
    await expect(rows.first().getByTestId('claim-n-requests')).toBeVisible()
    await expect(page.getByTestId('claims-filter')).toBeVisible()

    // Backend lehnt Annahme ohne Begruendung ab, Status bleibt (AC 16)
    const noReason = await adminApi('POST', `/claim-requests/${claimA}/accept`, { reason: '' })
    expect(noReason.status).toBe(422)
    expect(psql(`select status from claim_requests where id=${claimA}`)).toBe('verified')

    await page.goto(`/admin/claims/${claimA}`)
    await expect(page.getByTestId('claim-detail')).toBeVisible()
    await expect(page.getByTestId('claim-status')).toHaveText(sys.claims_status_verified)
    await page.getByTestId('action-accept').click()
    await expect(page.getByTestId('claim-decision-dialog')).toBeVisible()
    // Pflichtfeld: ohne Begruendung bleibt der Dialog offen (HTML5-required), Status unveraendert
    await page.getByTestId('decision-confirm').click()
    await expect(page.getByTestId('claim-decision-dialog')).toBeVisible()
    expect(psql(`select status from claim_requests where id=${claimA}`)).toBe('verified')
    await page.getByTestId('decision-reason').fill('E2E: Domain und Konto-Mail stimmen ueberein')
    await page.getByTestId('decision-confirm').click()
    await expect(page.getByTestId('claim-decision-dialog')).toHaveCount(0)
    await expect(page.getByTestId('claim-status')).toHaveText(sys.claims_status_accepted, { timeout: 15_000 })

    const row = psql(`select status, decided_by_admin_id is not null, decided_at is not null, decision_reason is not null from claim_requests where id=${claimA}`)
    expect(row).toBe('accepted|t|t|t')
    expect(psql(`select status||'|'||coalesce(shop_id::text,'') from shop_owners where email='${emailA}'`)).toBe(`approved|${shopId}`)
    logStep(7, 'AC13/AC16/AC36 Admin: Badge, Pflicht-Begruendung, Annahme -> Owner approved', true)
  })

  test('8 Admin-Oberflaeche in Griechisch (en+el): Titel und Filter uebersetzt (AC 36)', async ({ adminPage: page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: 'el', url: BASE_URL }])
    try {
      await page.goto('/admin/claims')
      await expect(page.locator('h1')).toHaveText(sysEl.claims_title)
      expect(sysEl.claims_title).not.toBe(sys.claims_title)
      await expect(page.getByTestId('tab-matching')).toContainText(sysEl.claims_tab_matching)
      await page.goto(`/admin/claims/${claimA}`)
      await expect(page.getByTestId('claim-status')).toHaveText(sysEl.claims_status_accepted)
    } finally {
      await page.context().addCookies([{ name: 'app_lang', value: 'en', url: BASE_URL }])
    }
    logStep(8, 'AC36 el: Titel, Tab, Status uebersetzt', true)
  })

  test('9 Zweiter Antrag wurde rejected(superseded), Audit-Ereignisse vollstaendig, Konto B ohne Freigabe nicht einloggbar (AC 15/39)', async () => {
    expect(psql(`select status||'|'||rejection_reason from claim_requests where id=${claimB}`)).toBe('rejected|superseded')
    // Konto B ist weiter pending (nie freigegeben): Login liefert 403, nicht 200
    const lg = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailB, password: PASSWORD }),
    })
    expect(lg.status).toBe(403)
    const detail = await adminApi<{ rejection_reason: string; events: Array<{ type: string }> }>('GET', `/claim-requests/${claimB}`)
    expect(detail.json.rejection_reason).toBe('superseded')
    expect(detail.json.events.map((e) => e.type)).toEqual(expect.arrayContaining(['created', 'code_sent', 'code_locked', 'code_verified', 'status_changed']))
    logStep(9, 'AC15/AC39 B superseded, Audit-Ereignisse vollstaendig', true)
  })

  test('10 Neuer Owner loggt sich ein, sieht den Shop; Katalog-Consent-Karte steht auf "none" (AC 13/14)', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/shop-admin/login')
    await waitForPageHydrated(page)
    await page.fill('input[name="email"]', emailA)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/shop-admin\/dashboard/, { timeout: 20_000 })

    await page.goto('/shop-admin/profile')
    await waitForPageHydrated(page)
    await expect(page.locator('input[name="name"]')).toHaveValue(SHOP_NAME)

    await page.goto('/shop-admin/catalog-review')
    await expect(page.getByTestId('catalog-consent-form')).toBeVisible()
    await expect(page.getByTestId('catalog-consent-given')).toHaveCount(0)
    expect(psql(`select count(*) from catalog_cases where shop_id=${shopId}`)).toBe('0')
    logStep(10, 'AC13/AC14 Login, Shop im Portal, Consent none, kein Case', true)
  })

  test('11 Shop-Seite zeigt jetzt den Melde-Link statt der CTA (AC 2, AC 3)', async ({ page }) => {
    await page.goto(`/en/shops/${SLUG}`)
    await waitForPageHydrated(page)
    const report = page.getByTestId('shop-claim-report')
    await expect(report).toHaveCount(1) // Streaming-Kopie (div#S:n[hidden]) abwarten
    await expect(report).toBeVisible()
    await expect(page.getByTestId('shop-claim-cta')).toHaveCount(0)
    await expect(report.getByRole('link')).toHaveAttribute('href', `/shop-admin/claim?shop=${SLUG}`)
    await expect(report.getByRole('link')).toHaveAttribute('rel', /nofollow/)

    const pub = await (await page.request.get(`${BACKEND_URL}/api/v1/shops/by-slug/${SLUG}`)).json()
    expect(pub.is_claimed).toBe(true)
    expect(Object.keys(pub).filter((k) => /owner/i.test(k))).toEqual([])
    logStep(11, 'AC2/AC3 Melde-Link statt CTA, is_claimed ohne Owner-Felder', true)
  })

  test('12 Zugriffsschutz: /shop-admin/claim oeffentlich, /admin/claims nur fuer Admin; Konto mit Shop wird geblockt (AC 11)', async ({ browser }) => {
    test.setTimeout(90_000)
    const anon = await browser.newContext({ baseURL: BASE_URL })
    const p = await anon.newPage()
    try {
      const claimPage = await p.goto(`/shop-admin/claim?shop=${SLUG}`)
      expect(claimPage?.status()).toBe(200)
      expect(new URL(p.url()).pathname).toBe('/shop-admin/claim')
      await p.goto('/admin/claims')
      await p.waitForURL(/\/admin\/login/, { timeout: 15_000 })
      await p.goto(`/admin/claims/${claimA}`)
      await p.waitForURL(/\/admin\/login/, { timeout: 15_000 })
      // Admin-API ohne Admin-Cookie ueber den Next-Proxy
      const proxied = await p.request.get(`${BASE_URL}/api/admin/claim-requests`)
      expect([401, 403]).toContain(proxied.status())
      // Status-Seite ohne Token: neutraler Hinweis, kein Datenleck
      await p.goto(`/shop-admin/claim/status?id=${claimA}`)
      await expect(p.getByText(tr.claim_token_missing_title)).toBeVisible()
    } finally {
      await anon.close()
    }

    // AC 11: eingeloggtes Konto mit Shop (Owner A besitzt jetzt einen) sieht die Block-Karte
    const owner = await browser.newContext({ baseURL: BASE_URL })
    const op = await owner.newPage()
    try {
      const token = await shopOwnerLogin(emailA, PASSWORD)
      await owner.addCookies([{ name: 'shop_owner_token', value: token, url: BASE_URL }])
      const other = await adminApi<{ id: number; slug: string }>('POST', '/shops', buildAdminShopPayload({
        slug: e2eSlug(SPEC, 'other'), names: { en: e2eName(SPEC, 'Other') }, website_url: `https://${DOMAIN}`, email: `info@${DOMAIN}`,
        address_line1: 'Other St 2', city: 'Larnaca', lat: 34.9, lng: 33.6,
      }))
      expect(other.status).toBe(201)
      tracker.shop(other.json.id)
      await op.goto(`/shop-admin/claim?shop=${other.json.slug}`)
      await expect(op.getByTestId('claim-has-shop')).toBeVisible()
      await expect(op.getByTestId('claim-owner-confirm')).toHaveCount(0)
      expect(psql(`select count(*) from claim_requests where shop_id=${other.json.id}`)).toBe('0')
    } finally {
      await owner.close()
    }
    logStep(12, 'K11/AC11 Zugriffsschutz und Konto-mit-Shop-Block', true)
  })
})
