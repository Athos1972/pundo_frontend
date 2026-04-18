import { test, expect } from '@playwright/test'

// Standalone-Test ohne global-setup — prüft Legal-Pages in allen Sprachen
// Kein Auth, kein Admin — rein öffentliche Seiten

const LANG_COOKIE = 'app_lang'
const BASE = 'http://localhost:3500'

const legalRoutes = [
  { path: '/legal/imprint', enTitle: 'Imprint' },
  { path: '/legal/privacy', enTitle: 'Privacy Policy' },
  { path: '/legal/terms',   enTitle: 'Terms of Service' },
  { path: '/about',         enTitle: 'About Us' },
  { path: '/contact',       enTitle: 'Contact' },
]

// E2E-01: Legal-Seiten laden ohne JS-Fehler
for (const { path, enTitle } of legalRoutes) {
  test(`${path} lädt ohne Fehler (EN)`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))

    await page.goto(BASE + path)
    await expect(page).toHaveURL(new RegExp(path))

    // Kein Placeholder mehr im sichtbaren Text
    const body = await page.locator('main').textContent()
    expect(body).not.toContain('⚠️ PLACEHOLDER')

    // Titel sichtbar
    await expect(page.locator('h1')).toContainText(enTitle)

    // Keine JS-Fehler
    expect(errors, `JS-Fehler auf ${path}: ${errors.join(', ')}`).toHaveLength(0)
  })
}

// E2E-02: Kein Placeholder in irgendeiner Sprache
const langs = ['en', 'de', 'ru', 'el', 'ar', 'he']
for (const lang of langs) {
  test(`/legal/imprint kein Placeholder in ${lang}`, async ({ page }) => {
    await page.context().addCookies([{ name: LANG_COOKIE, value: lang, domain: 'localhost', path: '/' }])
    await page.goto(`${BASE}/legal/imprint`)

    const body = await page.locator('main').textContent()
    expect(body).not.toContain('⚠️ PLACEHOLDER')
    expect(body).not.toContain('PLACEHOLDER')
    // Firmenname immer vorhanden
    expect(body).toContain('Buhl Consulting')
  })
}

// E2E-03: RTL-Attribut korrekt gesetzt
test('Arabisch setzt dir=rtl auf Legal-Seite', async ({ page }) => {
  await page.context().addCookies([{ name: LANG_COOKIE, value: 'ar', domain: 'localhost', path: '/' }])
  await page.goto(`${BASE}/legal/imprint`)
  const dir = await page.locator('html').getAttribute('dir')
  expect(dir).toBe('rtl')
})

test('Hebräisch setzt dir=rtl auf Legal-Seite', async ({ page }) => {
  await page.context().addCookies([{ name: LANG_COOKIE, value: 'he', domain: 'localhost', path: '/' }])
  await page.goto(`${BASE}/legal/imprint`)
  const dir = await page.locator('html').getAttribute('dir')
  expect(dir).toBe('rtl')
})

test('Englisch setzt dir=ltr auf Legal-Seite', async ({ page }) => {
  await page.context().addCookies([{ name: LANG_COOKIE, value: 'en', domain: 'localhost', path: '/' }])
  await page.goto(`${BASE}/legal/imprint`)
  const dir = await page.locator('html').getAttribute('dir')
  expect(dir).toBe('ltr')
})

test('Deutsch setzt dir=ltr auf Legal-Seite', async ({ page }) => {
  await page.context().addCookies([{ name: LANG_COOKIE, value: 'de', domain: 'localhost', path: '/' }])
  await page.goto(`${BASE}/legal/imprint`)
  const dir = await page.locator('html').getAttribute('dir')
  expect(dir).toBe('ltr')
})

// E2E-04: Echte Firmendaten vorhanden
test('Imprint enthält echte Firmendaten', async ({ page }) => {
  await page.goto(`${BASE}/legal/imprint`)
  const body = await page.locator('main').textContent()
  expect(body).toContain('HE 329258')
  expect(body).toContain('CY10329258B')
  expect(body).toContain('Kimonos 1')
  expect(body).toContain('info@pundo.cy')
  expect(body).toContain('Bernhard Buhl')
})

test('Privacy Policy enthält GDPR-Rechte', async ({ page }) => {
  await page.goto(`${BASE}/legal/privacy`)
  const body = await page.locator('main').textContent()
  expect(body).toContain('info@pundo.cy')
  expect(body).toContain('GDPR')
})

test('Terms enthält Datum', async ({ page }) => {
  await page.goto(`${BASE}/legal/terms`)
  const body = await page.locator('main').textContent()
  expect(body).toContain('2026')
  expect(body).toContain('info@pundo.cy')
})
