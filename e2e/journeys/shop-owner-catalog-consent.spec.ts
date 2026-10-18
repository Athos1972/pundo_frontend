/**
 * Journey: Katalog-Onboarding-Zustimmung im Wizard und im Portal (F5980 AC1)
 * Runbook: e2e/journeys/shop-owner-catalog-consent.md
 *
 * Fixtures (Ebene 1, synthetische Daten, kein Skip):
 * | Fixture-Name   | Was wird aufgebaut                                                         | Was wird geprueft                                         |
 * |----------------|----------------------------------------------------------------------------|-----------------------------------------------------------|
 * | wizard-draft   | localStorage-Entwurf bis Schritt "Kontakt" (provider, Standort)            | Checkbox nur mit Website, nie vorangehakt, RTL (ar)       |
 * | email-owner    | `e2e-<run>-ccons-<rand>@pundo.com` per Onboarding-API MIT Consent (Auto-Approve) | Case "Consent received" im Portal, Consent-Zeile     |
 * | portal-shop    | specShop('CCONS'): approved Owner (Impersonation), zuerst ohne Website     | Karte: Hinweis -> Formular -> Zustimmen -> Case; Wiederholung idempotent |
 * | ar-shop        | gleicher Shop, Cookie app_lang=ar                                          | Karte rendert dir="rtl"                                   |
 *
 * Aufraeumen: Owner/Shop per TestDataTracker bzw. shop.destroy() (kaskadiert catalog_consents und -cases).
 * Backend 8500 / Frontend 3500 — NIE 8000/3000.
 */
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { test, expect, createStepLog, shopOwnerLogin, shopOwnerOnboardWithRetry } from '../fixtures'
import { RUN_ID, TestDataTracker, psql, ownerApi, adminApi } from './_helpers/test-data'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { waitForHydrated } from './_helpers/hydration'
import { BASE_URL, BACKEND_URL } from '../env'
import { tAdmin } from '../../src/lib/shop-admin-translations'
import { CATALOG_CONSENT_TEXT_VERSION } from '../../src/lib/onboarding/catalogConsent'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const UUID = randomUUID().slice(0, 8)
const en = tAdmin('en')
const ar = tAdmin('ar')
const { entries: stepLog, logStep } = createStepLog()
const tracker = new TestDataTracker()

let shop: WorkerShop
const email = `e2e-${RUN_ID}-ccons-${UUID}@pundo.com`
const password = 'E2eConsentPw!99'
let startedAt = ''

interface ConsentStatus { status: 'none' | 'given'; has_catalog_source: boolean; catalog_case_id: number | null; text_version: string | null }
interface ConsentCreate { created: boolean; catalog_case_id: number | null; consent_id: number }
interface Cases { cases: Array<{ id: number; status: string }> }

test.describe.serial('Katalog-Consent: Wizard und Portal (F5980 AC1)', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000)
    startedAt = new Date().toISOString()
    shop = await specShop('CCONS')
  })

  test.afterAll(async () => {
    test.setTimeout(120_000)
    await tracker.cleanup()
    await shop?.destroy()
    const dir = path.join(__dirname, 'reports')
    fs.mkdirSync(dir, { recursive: true })
    const status = stepLog.some((s) => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    fs.writeFileSync(
      path.join(dir, `shop-owner-catalog-consent-${startedAt.slice(0, 10)}.md`),
      [
        `## Journey: Katalog-Consent Wizard + Portal — ${status}`,
        `Gestartet: ${startedAt}`,
        '',
        '| Schritt | Beschreibung | Erwartet | Ist | Status |',
        '|---|---|---|---|---|',
        ...stepLog.map((s) => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
      ].join('\n'),
    )
  })

  test('W1: Wizard Kontakt-Schritt — Checkbox nur mit Website, nie vorangehakt', async ({ page, context }) => {
    await context.addCookies([{ name: 'app_lang', value: 'en', url: BASE_URL }])
    await page.addInitScript((value: string) => {
      window.localStorage.setItem('pundo.onboarding.draft.v2', value)
    }, JSON.stringify({
      version: 2, expiresAt: Date.now() + 86_400_000, providerType: 'dienstleister', domainSlugs: [], specialtySlugs: [],
      location: { lat: 34.917, lng: 33.636, address: 'E2E Street 1', isB2cStorefront: true }, contact: {}, shopName: '',
    }))
    await page.goto('/shop-admin/onboarding')
    const resume = page.getByRole('button', { name: en.onboarding_draft_resume })
    await waitForHydrated(resume)
    await resume.click()

    const website = page.getByPlaceholder(en.onboarding_contact_website)
    await expect(website).toBeVisible()
    const checkbox = page.getByLabel(en.catalog_consent_checkbox_label)
    await expect(checkbox, 'ohne Website keine Checkbox').toHaveCount(0)
    logStep('W1.1', 'Ohne Website keine Consent-Checkbox', true)

    await website.fill('e2e-taverne.example')
    await expect(checkbox).toBeVisible()
    await expect(checkbox, 'nie vorangehakt').not.toBeChecked()
    logStep('W1.2', 'Mit Website erscheint Checkbox, nicht angehakt', true)

    await checkbox.check()
    await website.fill('')
    await expect(checkbox).toHaveCount(0)
    await website.fill('e2e-taverne.example')
    await expect(page.getByLabel(en.catalog_consent_checkbox_label), 'Website leeren setzt Consent zurueck').not.toBeChecked()
    logStep('W1.3', 'Website leeren blendet aus und setzt zurueck', true)
  })

  test('W2: Wizard in Arabisch — Consent-Block rendert RTL mit arabischem Text', async ({ page, context }) => {
    await context.addCookies([{ name: 'app_lang', value: 'ar', url: BASE_URL }])
    await page.addInitScript((value: string) => {
      window.localStorage.setItem('pundo.onboarding.draft.v2', value)
    }, JSON.stringify({
      version: 2, expiresAt: Date.now() + 86_400_000, providerType: 'dienstleister', domainSlugs: [], specialtySlugs: [],
      location: { lat: 34.917, lng: 33.636, address: 'E2E Street 1', isB2cStorefront: true }, contact: {}, shopName: '',
    }))
    await page.goto('/shop-admin/onboarding')
    const resume = page.getByRole('button', { name: ar.onboarding_draft_resume })
    await waitForHydrated(resume)
    await resume.click()
    await page.getByPlaceholder(ar.onboarding_contact_website).fill('e2e-taverne.example')
    const checkbox = page.getByLabel(ar.catalog_consent_checkbox_label)
    await expect(checkbox).toBeVisible()
    expect(await checkbox.evaluate((el) => getComputedStyle(el.closest('[dir]') as Element).direction)).toBe('rtl')
    logStep('W2.1', 'ar: Checkbox innerhalb dir=rtl', true)
  })

  test('E1: E-Mail-Pfad mit Consent und Auto-Approve eroeffnet einen Case', async ({ browser }) => {
    test.setTimeout(120_000)
    const res = await shopOwnerOnboardWithRetry({
      provider_type: 'dienstleister', domain_slugs: [], specialty_slugs: [],
      location: { lat: 34.917, lng: 33.636, address: 'E2E Street 2', is_b2c_storefront: true },
      contact: { website: 'https://e2e-consent-taverne.example' },
      shop_name: `E2E-${RUN_ID}-CCONS-wizard-${UUID}`,
      credentials: { type: 'email', email, password, name: `E2E ${UUID}` },
      lang: 'en',
      catalog_consent: { accepted: true, text_version: CATALOG_CONSENT_TEXT_VERSION, lang: 'en' },
    })
    tracker.owner(res.user_id as number)
    expect(res.status, 'pundo.com wird auf der Testinstanz sofort approved').toBe('approved')

    const token = await shopOwnerLogin(email, password)
    const status = await ownerApi<ConsentStatus>(token, 'GET', '/catalog-consent')
    expect(status.json).toMatchObject({ status: 'given', text_version: CATALOG_CONSENT_TEXT_VERSION })
    expect(status.json.catalog_case_id).not.toBeNull()
    logStep('E1.1', 'Consent gespeichert, Case eroeffnet', true)

    const ctx = await browser.newContext({
      baseURL: BASE_URL,
      storageState: { cookies: [{ name: 'shop_owner_token', value: token, domain: new URL(BASE_URL).hostname, path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] },
    })
    try {
      await ctx.addCookies([{ name: 'app_lang', value: 'en', url: BASE_URL }])
      const page = await ctx.newPage()
      await page.goto('/shop-admin/catalog-review')
      await expect(page.getByText(en.catalog_review_status_consent_given).first()).toBeVisible()
      await expect(page.getByTestId('catalog-consent-given')).toContainText(CATALOG_CONSENT_TEXT_VERSION)
      logStep('E1.2', 'Portal zeigt "Consent received" und die Zustimmungszeile', true)
    } finally {
      await ctx.close()
    }
  })

  test('P1: Portal-Karte — Hinweis ohne Website, Formular mit Website, Zustimmen, Wiederholung idempotent', async ({ browser }) => {
    test.setTimeout(120_000)
    const ctx = await browser.newContext({ baseURL: BASE_URL, storageState: shop.storageState })
    try {
      await ctx.addCookies([{ name: 'app_lang', value: 'en', url: BASE_URL }])
      const page = await ctx.newPage()

      psql(`update shops set website_url = null, webshop_url = null where id = ${shop.id}`)
      await page.goto('/shop-admin/catalog-review')
      await expect(page.getByTestId('catalog-consent-no-source')).toBeVisible()
      await expect(page.getByRole('link', { name: en.catalog_consent_no_source_link })).toHaveAttribute('href', '/shop-admin/profile')
      logStep('P1.1', 'Ohne Website: Hinweis + Profil-Link', true)

      psql(`update shops set website_url = 'https://e2e-portal-${UUID}.example' where id = ${shop.id}`)
      await page.reload()
      const submit = page.getByRole('button', { name: en.catalog_consent_submit })
      await waitForHydrated(submit)
      await expect(submit).toBeDisabled()
      const box = page.getByLabel(en.catalog_consent_checkbox_label)
      await expect(box).not.toBeChecked()
      await box.check()
      await expect(submit).toBeEnabled()
      await submit.click()

      await expect(page.getByTestId('catalog-consent-given')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText(en.catalog_review_status_consent_given).first()).toBeVisible()
      logStep('P1.2', 'Zustimmen: Karte wird zur Zeile, Case erscheint', true)

      const again = await shop.api<ConsentCreate>('POST', '/catalog-consent', { accepted: true, text_version: CATALOG_CONSENT_TEXT_VERSION })
      expect(again.status).toBe(200)
      expect(again.json.created).toBe(false)
      const cases = await shop.api<Cases>('GET', '/catalog-cases')
      expect(cases.json.cases).toHaveLength(1)
      logStep('P1.3', 'Zweiter POST: 200, created=false, weiterhin genau 1 Case', true)

      const bad = await shop.api<{ detail: string }>('POST', '/catalog-consent', { accepted: true, text_version: 'old' })
      expect(bad.status).toBe(422)
      expect(bad.json.detail).toBe('catalog_consent_invalid_version')
      logStep('P1.4', 'Unbekannte Textversion: 422 catalog_consent_invalid_version', true)
    } finally {
      await ctx.close()
    }
  })

  test('A1: Portal in Arabisch — Karte rendert RTL', async ({ browser }) => {
    const other = await specShop('CCONSAR')
    try {
      psql(`update shops set website_url = 'https://e2e-ar-${UUID}.example' where id = ${other.id}`)
      const ctx = await browser.newContext({ baseURL: BASE_URL, storageState: other.storageState })
      try {
        await ctx.addCookies([{ name: 'app_lang', value: 'ar', url: BASE_URL }])
        const page = await ctx.newPage()
        await page.goto('/shop-admin/catalog-review')
        const card = page.getByTestId('catalog-consent-form')
        await expect(card).toBeVisible()
        await expect(card).toHaveAttribute('dir', 'rtl')
        await expect(card.getByText(ar.catalog_consent_submit)).toBeVisible()
        logStep('A1.1', 'ar: Karte dir=rtl, arabischer Button', true)
      } finally {
        await ctx.close()
      }
    } finally {
      await other.destroy()
    }
  })

  test('E3: Owner-Wechsel (F5970 assign-owner): Consent zurueckgezogen, alter Case cancelled, neuer Owner startet bei "none" und bekommt genau einen neuen Case', async () => {
    test.setTimeout(120_000)
    // Ausgangslage aus E1: `email` ist approved Owner mit aktivem Consent und Case
    const ownerRow = await adminApi<{ items: Array<{ id: number; shop_id: number }> }>('GET', `/shop-owners?q=${encodeURIComponent(email)}`)
    const oldShopId = ownerRow.json.items[0].shop_id
    tracker.shop(oldShopId)
    const oldCase = Number(psql(`select id from catalog_cases where shop_id=${oldShopId} order by id desc limit 1`))
    expect(psql(`select status from catalog_cases where id=${oldCase}`)).not.toBe('cancelled')

    // Neuer Owner mit eigenem Shop (Auto-Approve), wird per assign-owner uebernommen
    const newEmail = `e2e-${RUN_ID}-ccons-new-${UUID}@pundo.com`
    const created = await shopOwnerOnboardWithRetry({
      provider_type: 'dienstleister', domain_slugs: [], specialty_slugs: [],
      location: { lat: 34.917, lng: 33.636, address: 'E2E Street 9', is_b2c_storefront: true },
      contact: { website: 'https://e2e-consent-new.example' }, shop_name: `E2E-${RUN_ID}-CCONS-new-${UUID}`,
      credentials: { type: 'email', email: newEmail, password, name: `E2E new ${UUID}` }, lang: 'en',
    })
    tracker.owner(created.user_id as number)
    tracker.shop(created.shop_id as number)
    const assign = await adminApi('POST', `/shops/${oldShopId}/assign-owner`, {
      shop_owner_id: created.user_id, reason: 'E2E Owner-Wechsel', replace_existing_owner: true, deactivate_previous_shop_of_owner: true, notify_previous_owner: false,
    })
    expect(assign.status, assign.text).toBe(200)

    expect(psql(`select withdrawn_reason from catalog_consents where shop_id=${oldShopId} order by id desc limit 1`)).toBe('owner_reassigned')
    expect(psql(`select status from catalog_cases where id=${oldCase}`)).toBe('cancelled')
    const newToken = await shopOwnerLogin(newEmail, password)
    const status = await ownerApi<ConsentStatus>(newToken, 'GET', '/catalog-consent')
    expect(status.json.status, 'neuer Owner: Karte "none"').toBe('none')
    expect(psql(`select count(*) from catalog_cases where shop_id=${oldShopId} and status<>'cancelled'`)).toBe('0')
    const given = await ownerApi<ConsentCreate>(newToken, 'POST', '/catalog-consent', { accepted: true, text_version: CATALOG_CONSENT_TEXT_VERSION })
    expect(given.status).toBe(201)
    expect(psql(`select count(*) from catalog_cases where shop_id=${oldShopId} and status<>'cancelled'`), 'genau ein neuer Case').toBe('1')
    expect(psql(`select count(*) from catalog_cases where shop_id=${oldShopId}`)).toBe('2')
    // die alte Zustimmung bleibt als Historie (zurueckgezogen), kein zweiter aktiver Consent
    expect(psql(`select count(*) from catalog_consents where shop_id=${oldShopId} and withdrawn_at is null`)).toBe('1')
    logStep('E3.1', 'Owner-Wechsel: Consent withdrawn, Case cancelled, neuer Consent -> neuer Case', true)
  })

})
