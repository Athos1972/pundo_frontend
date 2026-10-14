/**
 * E2E — dezenter Sprach-Hinweis (F6310, ersetzt LanguagePickerOverlay, 2026-10-14)
 *
 * Fixtures: keine Backend-Daten nötig (anonymer Besucher, Startseite / Suche).
 *
 * Covers:
 *   H1 — Erstbesuch (Consent erledigt, kein lang_hint_dismissed) zeigt den Hinweis
 *   H2 — Hinweis ist nicht im SSR-HTML
 *   H3 — Schließen (X) setzt lang_hint_dismissed; nach Reload kein Hinweis
 *   H4 — Sprachwahl navigiert auf /{lang}/…, erhält den Query-String, setzt html[lang]/dir
 *   H5 — Browsersprache als Vorschlag ("Русский?")
 *   H6 — Hinweis blockiert keine Klicks / keinen Fokus (Desktop + Mobile)
 *   H7 — Returning Visitor mit Cookie sieht ihn nicht
 *   H8 — Wartet, bis der Cookie-Consent-Banner erledigt ist
 *   H9 — Header-Sprachumschalter gilt als bewusste Wahl
 *   H10 — Kein Hinweis auf Bypass-Bereichen (shop-admin)
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const COOKIE_DOMAIN = process.env.E2E_COOKIE_DOMAIN ?? '127.0.0.1'
const HINT_COOKIE = 'lang_hint_dismissed'
const CONSENT_VALUE = encodeURIComponent(JSON.stringify({ v: 1, necessary: true, statistics: true, marketing: false }))

async function addCookie(context: BrowserContext, name: string, value: string) {
  await context.addCookies([{ name, value, domain: COOKIE_DOMAIN, path: '/', sameSite: 'Lax' }])
}

/** Erstbesucher, der den Consent-Banner schon erledigt hat (sonst wartet der Hinweis). */
async function firstVisitor(context: BrowserContext) {
  await addCookie(context, 'app_cookie_consent', CONSENT_VALUE)
}

const hint = (page: Page) => page.getByTestId('language-hint')

async function hintCookie(context: BrowserContext) {
  return (await context.cookies()).find(c => c.name === HINT_COOKIE)
}

test.describe('LanguageHint — F6310', () => {
  test('H1: Erstbesuch zeigt "Sprache: Deutsch · Ändern"', async ({ page, context }) => {
    await firstVisitor(context)
    await page.goto('/de')
    const region = page.getByRole('region', { name: 'Sprachauswahl' })
    await expect(region).toBeVisible()
    await expect(region).toContainText('Sprache: Deutsch')
    await expect(region.getByRole('button', { name: 'Ändern' })).toBeVisible()
    await expect(region.getByRole('button', { name: 'Sprach-Hinweis schließen' })).toBeVisible()
  })

  test('H2: Hinweis ist nicht im SSR-HTML', async ({ request }) => {
    const res = await request.get('/de', {
      headers: { cookie: `app_cookie_consent=${CONSENT_VALUE}` },
    })
    expect(res.ok()).toBe(true)
    const html = await res.text()
    expect(html).not.toContain('data-testid="language-hint"')
    expect(html).not.toContain('Sprach-Hinweis schließen')
  })

  test('H3: Schließen setzt Cookie, nach Reload kein Hinweis', async ({ page, context }) => {
    await firstVisitor(context)
    await page.goto('/en')
    await expect(hint(page)).toBeVisible()
    await page.getByRole('button', { name: 'Close language hint' }).click()
    await expect(hint(page)).toHaveCount(0)

    const cookie = await hintCookie(context)
    expect(cookie?.value).toBe('1')
    // ~1 Jahr Laufzeit
    expect(cookie!.expires - Date.now() / 1000).toBeGreaterThan(364 * 24 * 3600)

    await page.reload()
    await page.waitForLoadState('load')
    await page.waitForTimeout(500) // Hydration abwarten — Hinweis darf auch danach nicht erscheinen
    await expect(hint(page)).toHaveCount(0)
  })

  test('H4a: Sprachwahl navigiert auf /ru und setzt html[lang]', async ({ page, context }) => {
    await firstVisitor(context)
    await page.goto('/en')
    await page.getByRole('button', { name: 'Change' }).click()
    const list = page.getByRole('list', { name: 'Choose language' })
    for (const name of ['English', 'Deutsch', 'Русский', 'Ελληνικά', 'العربية', 'עברית']) {
      await expect(list.getByRole('button', { name, exact: true })).toBeVisible()
    }
    await list.getByRole('button', { name: 'Русский' }).click()
    await expect(page).toHaveURL(/\/ru$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(hint(page)).toHaveCount(0)
    expect((await hintCookie(context))?.value).toBe('1')
    expect((await context.cookies()).find(c => c.name === 'app_lang')?.value).toBe('ru')
  })

  test('H4b: Sprachwahl Arabisch → dir=rtl, Query-String bleibt erhalten', async ({ page, context }) => {
    await firstVisitor(context)
    await page.goto('/en/search?q=coffee')
    await page.getByRole('button', { name: 'Change' }).click()
    await page.getByRole('list', { name: 'Choose language' }).getByRole('button', { name: 'العربية' }).click()
    await expect(page).toHaveURL(/\/ar\/search\?q=coffee$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('H5: Browsersprache wird als Vorschlag gezeigt', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ru-RU' })
    try {
      await firstVisitor(context)
      const page = await context.newPage()
      await page.goto('/de')
      const suggestion = page.getByTestId('language-hint-suggestion')
      await expect(suggestion).toHaveText('Русский?')
      await suggestion.click()
      await expect(page).toHaveURL(/\/ru$/)
      await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
    } finally {
      await context.close()
    }
  })

  for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
    test(`H6: blockiert keine Klicks und keinen Fokus (${viewport.width}px)`, async ({ page, context }) => {
      await page.setViewportSize(viewport)
      await firstVisitor(context)
      await page.goto('/en')
      await expect(hint(page)).toBeVisible()

      // Kein Backdrop, kein Scroll-Lock, kein Fokus-Klau, kein Dialog
      const state = await page.evaluate(() => {
        const h = document.querySelector('[data-testid="language-hint"]')!
        const center = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
        return {
          centerInsideHint: !!center && h.contains(center),
          bodyOverflow: getComputedStyle(document.body).overflow,
          focusInsideHint: h.contains(document.activeElement),
          modal: !!document.querySelector('[aria-modal="true"]'),
        }
      })
      expect(state).toEqual({ centerInsideHint: false, bodyOverflow: 'visible', focusInsideHint: false, modal: false })

      // Hinweis bleibt klein (Toast, kein Banner über die ganze Breite)
      const box = (await hint(page).boundingBox())!
      expect(box.height).toBeLessThan(80)
      expect(box.width).toBeLessThan(viewport.width - 40)

      // Darunter-/danebenliegende Elemente sind klickbar (trial = Actionability inkl. "nicht verdeckt")
      await page.locator('header a').first().click({ trial: true })
      const bottomTab = page.locator('nav[aria-label] button').last()
      if (viewport.width < 768 && await bottomTab.isVisible()) {
        await bottomTab.click({ trial: true })
      }
      // Seite ganz nach unten scrollen: der Footer-Link unter dem Hinweis ist erreichbar
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.locator('footer a').last().click({ trial: true })
    })
  }

  test('H7: Returning Visitor mit lang_hint_dismissed sieht keinen Hinweis', async ({ page, context }) => {
    await firstVisitor(context)
    await addCookie(context, HINT_COOKIE, '1')
    await page.goto('/de')
    await page.waitForLoadState('load')
    await page.waitForTimeout(500)
    await expect(hint(page)).toHaveCount(0)
  })

  test('H8: erscheint erst, nachdem der Cookie-Consent-Banner erledigt ist', async ({ page }) => {
    await page.goto('/en')
    const banner = page.locator('[role="dialog"][aria-modal="false"]')
    await expect(banner).toBeVisible()
    await expect(hint(page)).toHaveCount(0)
    await page.getByRole('button', { name: /necessary only/i }).click()
    await expect(banner).toHaveCount(0)
    await expect(hint(page)).toBeVisible()
  })

  test('H9: Wahl über den Header-Umschalter blendet den Hinweis aus', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await firstVisitor(context)
    await page.goto('/en')
    await expect(hint(page)).toBeVisible()
    await page.locator('header').getByTitle('DE').click()
    await expect(page).toHaveURL(/\/de$/)
    await expect(hint(page)).toHaveCount(0)
    expect((await hintCookie(context))?.value).toBe('1')
  })

  test('H10: kein Hinweis auf Bypass-Bereichen (shop-admin)', async ({ page, context }) => {
    await firstVisitor(context)
    await page.goto('/shop-admin/login')
    await page.waitForLoadState('load')
    await page.waitForTimeout(500)
    await expect(hint(page)).toHaveCount(0)
  })
})
