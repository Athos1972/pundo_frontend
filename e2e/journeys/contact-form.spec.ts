/**
 * Journey: Kontaktformular (B6220-003)
 * Runbook: e2e/journeys/contact-form.md
 *
 * Fixtures: keine (anonymer Besucher). Es werden keine Daten angelegt; das Test-Backend
 * hat kein SMTP, es entsteht keine Mail (503 = Captcha und Rate-Limit bestanden).
 * Voraussetzung: Frontend-Build mit Turnstile-Test-Sitekey (scripts/e2e-frontend.cjs, E7)
 * oder `npm run dev:test`; Test-Backend ohne TURNSTILE_SECRET_KEY.
 */
import { test, expect } from '@playwright/test'
import { t } from '../../src/lib/translations'
import { BASE_URL, BACKEND_URL } from '../env'

if (BASE_URL.includes(':3000') || BACKEND_URL.includes(':8000')) {
  throw new Error('Safety: Journey-Tests dürfen nicht gegen Produktiv-Ports laufen!')
}

const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

async function fillForm(page: import('@playwright/test').Page) {
  // :visible — Next keeps the previous route's segment hidden in the DOM (B8950-013 #7)
  const form = page.locator('form:visible')
  await form.locator('input[type="text"]').nth(0).fill('B6220-003 subject')
  await form.locator('textarea').fill('Automated contact form journey, please ignore.')
  await form.locator('input[type="text"]').nth(1).fill('E2E Contact')
  await form.locator('input[type="email"]').fill('contact-journey@pundo-e2e.io')
}

// Button enabled = React hydrated AND widget issued a token. Fill only afterwards:
// hydration resets controlled inputs filled earlier.
async function waitForToken(page: import('@playwright/test').Page) {
  // dev server may briefly render a second (disabled) tree while hydrating: wait for an enabled one
  await expect(page.locator('form button[type="submit"]:not([disabled])').first()).toBeVisible({ timeout: 30_000 })
  // Kein waitForLoadState('networkidle'): das Turnstile-Widget hält eine blob:-Anfrage
  // (challenges.cloudflare.com) dauerhaft offen, networkidle tritt dann nie ein.
}

async function openAndFill(page: import('@playwright/test').Page, url: string) {
  await page.goto(url)
  await waitForToken(page)
  await fillForm(page)
}

test.describe('contact-form journey (B6220-003)', () => {
  for (const lang of LANGS) {
    test(`C1 ${lang}: Absenden mit Turnstile-Token passiert Captcha und Rate-Limit`, { tag: lang === 'en' ? '@smoke' : [] }, async ({ page }) => {
      await openAndFill(page, `${BASE_URL}/${lang}/contact`)
      if (lang === 'ar' || lang === 'he') {
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      }

      const reqPromise = page.waitForRequest((r) => r.url().endsWith('/api/contact') && r.method() === 'POST')
      const resPromise = page.waitForResponse((r) => r.url().endsWith('/api/contact') && r.request().method() === 'POST')
      await page.locator('form').evaluate((f) => (f as HTMLFormElement).requestSubmit())
      const sent = JSON.parse((await reqPromise).postData() ?? '{}')
      const res = await resPromise

      expect(typeof sent.turnstile_token).toBe('string')
      expect(sent.turnstile_token.length).toBeGreaterThan(0)
      // 200 = SMTP konfiguriert, 503 = Captcha + Rate-Limit ok, aber kein SMTP (Studio)
      // 429 hier = globales Tageslimit des Endpoints (100/Tag x Test-Multiplikator 40 = 4000) ausgeschoepft. C4 verbraucht
      // pro Lauf ca. 120 davon; das Global Setup setzt den Zaehler (nur dieser Key, nur pundo_test) bei jedem Lauf
      // zurueck (prepare_e2e_db.py --reset-contact-limit, Folgepunkt 2). 429 hier = Setup-Schritt fehlgeschlagen oder
      // Lauf ohne Global Setup.
      expect([200, 503], `HTTP ${res.status()} vom Kontakt-Endpoint (429 = globales Tageslimit, siehe Kommentar)`).toContain(res.status())
    })
  }

  test('C2: Captcha-Fehler zeigt turnstile_failed', async ({ page }) => {
    await page.route('**/api/contact', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'captcha_failed' }) }),
    )
    await openAndFill(page, `${BASE_URL}/en/contact`)
    await page.locator('form').evaluate((f) => (f as HTMLFormElement).requestSubmit())
    await expect(page.getByText(t('en').turnstile_failed)).toBeVisible()
  })

  for (const lang of ['en', 'he'] as const) {
    test(`C3 ${lang}: 429 zeigt contact_rate_limited`, async ({ page }) => {
      await page.route('**/api/contact', (route) =>
        route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'rate_limited' }) }),
      )
      await openAndFill(page, `${BASE_URL}/${lang}/contact`)
      await page.locator('form').evaluate((f) => (f as HTMLFormElement).requestSubmit())
      await expect(page.getByText(t(lang).contact_rate_limited)).toBeVisible()
      await expect(page.getByText(t(lang).contact_error)).toHaveCount(0)
    })
  }

  test('C4: Backend-Endpoint ist ohne Browser rate-limitiert', async ({ request }) => {
    const ip = `203.0.113.${100 + Math.floor(Math.random() * 100)}` // TEST-NET-3, pro Lauf eindeutig
    const body = {
      subject: 'B6220-003 probe',
      category: 'contact_cat_other',
      description: 'Rate limit probe, please ignore.',
      name: 'probe',
      email: 'probe@pundo-e2e.io',
    }
    const codes: number[] = []
    // Basis 3/min, Test-Multiplikator bis x10, bis zu 4 Worker mit eigenem Zähler (bis F6225): <= 121 Requests
    for (let i = 0; i < 125; i++) {
      const r = await request.post(`${BACKEND_URL}/api/v1/contact`, {
        data: body,
        headers: { 'X-Forwarded-For': ip },
      })
      codes.push(r.status())
      if (r.status() === 200) test.skip(true, 'SMTP konfiguriert: Abbruch, damit keine Mails entstehen')
      if (r.status() === 429) break
    }
    expect(codes).toContain(429)
    expect(codes.filter((c) => c !== 429 && c !== 503)).toEqual([])
  })
})
