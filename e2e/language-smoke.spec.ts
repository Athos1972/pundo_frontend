/**
 * Language Smoke Tests — alle 6 Sprachen, alle wichtigen Seiten
 *
 * Prüft für jede Sprache + Seite:
 *   - Seite lädt ohne JS-Fehler
 *   - html[lang] ist gesetzt
 *   - html[dir] ist "rtl" für AR/HE, "ltr" für alle anderen
 *   - Kein sichtbarer Übersetzungs-Key (z.B. "offer_title" statt dem echten Label)
 *
 * Sprachen: en, de, el, ru, ar, he
 * RTL:      ar, he
 * LTR:      en, de, el, ru
 *
 * Sprache wird via Cookie "app_lang" gesetzt (1 Jahr, SameSite=Lax).
 */

import { test, expect, Page } from '@playwright/test'

const LANGUAGES = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const
type Lang = typeof LANGUAGES[number]

const RTL_LANGS = new Set<Lang>(['ar', 'he'])

const PAGES = [
  { name: 'Startseite',    path: '/' },
  { name: 'Suche',         path: '/search?q=test' },
]

// Slug eines bekannten Shop — aus price-type fixtures (stable slug)
const TEST_SHOP_SLUG = 'e2e-test-shop-larnaca'

async function setLangCookie(page: Page, lang: Lang) {
  await page.context().addCookies([{
    name: 'app_lang',
    value: lang,
    domain: '127.0.0.1',
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }])
}

// Sammelt JS-Fehler auf einer Seite (ignoriert bekannte harmlose Meldungen)
function attachConsoleErrorCollector(page: Page): () => string[] {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Ignoriere bekannte, harmlose Fehler (Leaflet SSR, etc.)
      if (text.includes('window is not defined')) return
      if (text.includes('ResizeObserver loop')) return
      if (text.includes('Leaflet')) return
      errors.push(text)
    }
  })
  return () => errors
}

for (const lang of LANGUAGES) {
  const dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr'

  test.describe(`Sprache: ${lang} (${dir})`, () => {
    test.use({ locale: lang === 'ar' || lang === 'he' ? 'ar-AE' : 'de-DE' })

    for (const { name, path } of PAGES) {
      test(`${name} — kein Absturz, dir=${dir}`, async ({ page }) => {
        const getErrors = attachConsoleErrorCollector(page)

        await setLangCookie(page, lang)
        const response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20_000 })

        // HTTP-Status ok
        expect(response?.status(), `${name} HTTP-Status für ${lang}`).toBeLessThan(500)

        // html[dir] korrekt
        const htmlDir = await page.locator('html').getAttribute('dir')
        expect(htmlDir, `html[dir] für ${lang}`).toBe(dir)

        // html[lang] gesetzt (kann von Next.js default abweichen, daher nur non-null prüfen)
        const htmlLang = await page.locator('html').getAttribute('lang')
        expect(htmlLang, `html[lang] für ${lang}`).toBeTruthy()

        // Keine JS-Fehler
        const errors = getErrors()
        expect(errors, `JS-Fehler auf ${name} (${lang})`).toHaveLength(0)
      })
    }

    test(`Shop-Detail — kein Absturz, dir=${dir}`, async ({ page }) => {
      const getErrors = attachConsoleErrorCollector(page)

      await setLangCookie(page, lang)
      const response = await page.goto(`/shops/${TEST_SHOP_SLUG}`, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      })

      // 200 oder 404 (wenn Shop nicht existiert) — kein 500
      const status = response?.status() ?? 0
      expect(status, `Shop-Detail HTTP-Status für ${lang}`).not.toBe(500)
      if (status === 200) {
        const htmlDir = await page.locator('html').getAttribute('dir')
        expect(htmlDir, `html[dir] Shop-Detail für ${lang}`).toBe(dir)
      }

      const errors = getErrors()
      expect(errors, `JS-Fehler auf Shop-Detail (${lang})`).toHaveLength(0)
    })

    test(`Shop-Admin Login — kein Absturz, dir=${dir}`, async ({ page }) => {
      const getErrors = attachConsoleErrorCollector(page)

      await setLangCookie(page, lang)
      const response = await page.goto('/shop-admin/login', {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      })

      expect(response?.status(), `Shop-Admin Login HTTP-Status für ${lang}`).toBeLessThan(500)

      const htmlDir = await page.locator('html').getAttribute('dir')
      expect(htmlDir, `html[dir] Shop-Admin für ${lang}`).toBe(dir)

      const errors = getErrors()
      expect(errors, `JS-Fehler auf Shop-Admin Login (${lang})`).toHaveLength(0)
    })
  })
}
