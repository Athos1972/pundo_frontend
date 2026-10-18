/**
 * Journey: Google-Onboarding-Resume ueber den Next-Proxy (B5910-010)
 * Runbook: e2e/journeys/shop-owner-google-onboarding-resume.md
 *
 * Der OAuth-Callback wird nicht gefahren (kein echter Google-Login): ein pre_signup-ShopOwner wird direkt in
 * pundo_test angelegt und das Cookie `shop_owner_token` im Browser gesetzt, genau wie es der Callback tut. Der
 * Wizard (`?resume=oauth`) sendet dann ueber `/api/shop-admin/onboarding` (same-origin Proxy, reicht das Cookie nur
 * als `Authorization: Bearer` weiter). Vor dem Fix: 401 "Missing OAuth session cookie".
 *
 * Fixtures (Ebene 1, synthetische Daten, kein Skip):
 * | Fixture-Name | Was wird aufgebaut                                             | Was wird geprueft                                         |
 * |--------------|----------------------------------------------------------------|-----------------------------------------------------------|
 * | g-consent    | pre_signup-Owner + Cookie + Entwurf mit Website und Consent    | Redirect check-email, Shop zugewiesen, 1 catalog_consent  |
 * | g-noconsent  | pre_signup-Owner + Cookie + Entwurf ohne Consent               | Shop zugewiesen, kein catalog_consent                     |
 * | g-nocookie   | Entwurf, aber kein Cookie                                      | 401, kein Redirect, kein Shop          |
 *
 * Aufraeumen: Owner/Shop per TestDataTracker (kaskadiert catalog_consents).
 * Backend 8500 / Frontend 3500 - NIE 8000/3000.
 */
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { randomUUID } from 'crypto'
import { test, expect, createStepLog } from '../fixtures'
import { RUN_ID, TestDataTracker, psql, testDbUrl } from './_helpers/test-data'
import { BASE_URL, BACKEND_URL } from '../env'
import { tAdmin } from '../../src/lib/shop-admin-translations'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const BACKEND_REPO = process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'
const UUID = randomUUID().slice(0, 8)
const en = tAdmin('en')
const { entries: stepLog, logStep } = createStepLog()
const tracker = new TestDataTracker()
let startedAt = ''

/** Legt einen pre_signup-Owner an (wie der OAuth-Callback) und liefert id + signiertes Token. */
function createPreSignupOwner(tag: string): { id: number; token: string } {
  const script = [
    'import json, sys',
    'from core.auth.jwt import create_shop_owner_token',
    'from ingestor.db.connection import SessionLocal',
    'from ingestor.models.shop_owner import ShopOwner',
    'email, sub = sys.argv[1], sys.argv[2]',
    'with SessionLocal() as s:',
    '    o = ShopOwner(email=email, password_hash=None, name="", status="pre_signup", shop_id=None, google_sub=sub)',
    '    s.add(o); s.commit(); s.refresh(o)',
    '    print(json.dumps({"id": o.id, "token": create_shop_owner_token(o.id, None, "pre_signup")}))',
  ].join('\n')
  const out = execFileSync(
    `${BACKEND_REPO}/.venv/bin/python`,
    ['-c', script, `e2e-${RUN_ID}-gres-${tag}-${UUID}@example.cy`, `e2e-${RUN_ID}-gres-${tag}-${UUID}`],
    {
      cwd: BACKEND_REPO,
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: testDbUrl().replace('postgresql://', 'postgresql+psycopg://') },
    },
  )
  const parsed = JSON.parse(out.trim().split('\n').pop() as string) as { id: number; token: string }
  tracker.owner(parsed.id)
  return parsed
}

function draft(opts: { consent: boolean; website: boolean; name: string }): string {
  return JSON.stringify({
    version: 2, expiresAt: Date.now() + 86_400_000, providerType: 'dienstleister', domainSlugs: [], specialtySlugs: [],
    location: { lat: 34.917, lng: 33.636, address: 'E2E Street 1', isB2cStorefront: true },
    contact: opts.website ? { website: `https://e2e-gres-${UUID}.example` } : { phone: '+35799123456' },
    shopName: opts.name,
    ...(opts.consent ? { catalogConsent: true } : {}),
  })
}

test.describe.serial('Google-Onboarding-Resume ueber den Proxy (B5910-010)', () => {
  test.beforeAll(() => { startedAt = new Date().toISOString() })

  test.afterAll(async () => {
    test.setTimeout(120_000)
    await tracker.cleanup()
    const dir = path.join(__dirname, 'reports')
    fs.mkdirSync(dir, { recursive: true })
    const status = stepLog.some((s) => s.status === 'FAIL') ? 'FAIL' : 'PASS'
    fs.writeFileSync(
      path.join(dir, `shop-owner-google-onboarding-resume-${startedAt.slice(0, 10)}.md`),
      [
        `## Journey: Google-Onboarding-Resume — ${status}`,
        `Gestartet: ${startedAt}`,
        '',
        '| Schritt | Beschreibung | Erwartet | Ist | Status |',
        '|---|---|---|---|---|',
        ...stepLog.map((s) => `| ${s.step} | ${s.desc} | ${s.expected} | ${s.actual} | ${s.status} |`),
      ].join('\n'),
    )
  })

  async function resume(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext, token: string | null, draftJson: string) {
    await context.addCookies([{ name: 'app_lang', value: 'en', url: BASE_URL }])
    if (token) {
      await context.addCookies([{ name: 'shop_owner_token', value: token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' }])
    }
    await page.addInitScript((value: string) => {
      window.localStorage.setItem('pundo.onboarding.draft.v2', value)
    }, draftJson)
    const submit = page.waitForResponse((r) => r.url().includes('/api/shop-admin/onboarding') && r.request().method() === 'POST')
    await page.goto('/shop-admin/onboarding?resume=oauth')
    return (await submit).status()
  }

  test('G1: Resume mit Cookie und Consent -> 201, Shop zugewiesen, Consent gespeichert', async ({ page, context }) => {
    test.setTimeout(90_000)
    const owner = createPreSignupOwner('consent')
    const name = `E2E-${RUN_ID}-GRES-consent-${UUID}`
    const status = await resume(page, context, owner.token, draft({ consent: true, website: true, name }))
    expect(status, 'Proxy darf nicht 401 "Missing OAuth session cookie" liefern').toBe(201)
    await expect(page).toHaveURL(/\/shop-admin\/register\/check-email/, { timeout: 20_000 })
    logStep('G1.1', 'Proxy-Submit 201, Redirect auf check-email', true)

    const row = psql(`select shop_id, status from shop_owners where id = ${owner.id}`)
    const [shopId, ownerStatus] = row.split('|')
    expect(Number(shopId)).toBeGreaterThan(0)
    expect(ownerStatus).toBe('pending')
    tracker.shop(Number(shopId))
    expect(psql(`select count(*) from catalog_consents where shop_id = ${shopId} and withdrawn_at is null`)).toBe('1')
    logStep('G1.2', 'Owner pending mit Shop, genau 1 aktiver catalog_consent (F5980)', true)
  })

  test('G2: Resume mit Cookie ohne Consent -> Shop zugewiesen, kein Consent', async ({ page, context }) => {
    test.setTimeout(90_000)
    const owner = createPreSignupOwner('noconsent')
    const status = await resume(page, context, owner.token, draft({ consent: false, website: true, name: `E2E-${RUN_ID}-GRES-nocons-${UUID}` }))
    expect(status).toBe(201)
    await expect(page).toHaveURL(/\/shop-admin\/register\/check-email/, { timeout: 20_000 })
    const shopId = psql(`select shop_id from shop_owners where id = ${owner.id}`)
    expect(Number(shopId)).toBeGreaterThan(0)
    tracker.shop(Number(shopId))
    expect(psql(`select count(*) from catalog_consents where shop_id = ${shopId}`)).toBe('0')
    logStep('G2.1', 'Ohne Haken: Shop angelegt, kein catalog_consent', true)
  })

  test('G3: Resume ohne Cookie -> 401, kein Redirect, kein Shop', async ({ page, context }) => {
    test.setTimeout(60_000)
    const owner = createPreSignupOwner('nocookie')
    const status = await resume(page, context, null, draft({ consent: false, website: false, name: `E2E-${RUN_ID}-GRES-nocookie-${UUID}` }))
    expect(status).toBe(401)
    // Bekannte Luecke: submitError wird nur im Credentials-Schritt gerendert, der Wizard bleibt still auf Schritt 1.
    await expect(page).not.toHaveURL(/check-email/)
    await expect(page.getByText(en.onboarding_step1_title)).toBeVisible()
    expect(psql(`select coalesce(shop_id::text, 'none') from shop_owners where id = ${owner.id}`)).toBe('none')
    logStep('G3.1', 'Kein Token: 401, kein Redirect, kein Shop angelegt', true)
  })
})
