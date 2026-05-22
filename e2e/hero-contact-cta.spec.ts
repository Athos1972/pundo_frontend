import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3500'

test.describe('hero-contact-cta-20260522 — AC-Tests', () => {

  test('AC-7a: Inline-CTA erscheint unter SearchBar (pundo /de)', async ({ page }) => {
    await page.goto(BASE + '/de')
    await page.waitForLoadState('networkidle')
    const cta = page.locator('a[href="/de/contact"]').filter({ hasText: /nichts gefunden|sag uns bescheid/i })
    await expect(cta.first()).toBeVisible()
  })

  test('AC-7a: Inline-CTA erscheint unabhängig vom dismissed-State', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('pundo_pain_dismissed', '1')
    })
    await page.goto(BASE + '/de')
    await page.waitForLoadState('networkidle')
    const cta = page.locator('a[href="/de/contact"]').filter({ hasText: /nichts gefunden|sag uns bescheid/i })
    await expect(cta.first()).toBeVisible()
  })

  test('AC-9: CTA-Link nutzt localePath (/de/contact)', async ({ page }) => {
    await page.goto(BASE + '/de')
    const links = await page.locator('a[href="/de/contact"]').count()
    expect(links).toBeGreaterThan(0)
  })

  test('AC-9: CTA-Link in englischer Sprache (/en/contact)', async ({ page }) => {
    await page.goto(BASE + '/en')
    await page.waitForLoadState('networkidle')
    const cta = page.locator('a[href="/en/contact"]').filter({ hasText: /can't find|tell us/i })
    await expect(cta.first()).toBeVisible()
  })

  test('AC-7b: 0-Treffer-Block erscheint bei echter Suche ohne Ergebnis', async ({ page }) => {
    await page.goto(BASE + '/de/search?q=xyzqwerty123notfound')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Produkt oder Shop fehlt?')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Jetzt melden')).toBeVisible()
    const ctaLink = page.locator('a[href="/de/contact"]').filter({ hasText: 'Jetzt melden' })
    await expect(ctaLink).toBeVisible()
  })

  test('AC-7b: 0-Treffer-Block erscheint NICHT bei leerer Query (q < 2 Zeichen)', async ({ page }) => {
    await page.goto(BASE + '/de/search?q=x')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Produkt oder Shop fehlt?')).not.toBeVisible()
  })

  test('AC-4: Contact-Page zeigt Name+Email Felder für anonyme Nutzer', async ({ page }) => {
    await page.goto(BASE + '/de/contact')
    await expect(page.getByText('Name')).toBeVisible()
    await expect(page.getByText('E-Mail')).toBeVisible()
  })

  test('AC-8 RTL: Inline-CTA auf arabischer Startseite', async ({ page }) => {
    await page.goto(BASE + '/ar')
    await page.waitForLoadState('networkidle')
    const html = await page.locator('html').getAttribute('dir')
    expect(html).toBe('rtl')
    const cta = page.locator('a[href="/ar/contact"]').filter({ hasText: /لم تجده|أخبرنا/i })
    await expect(cta.first()).toBeVisible()
  })

  test('AC-8 RTL: Inline-CTA auf hebräischer Startseite', async ({ page }) => {
    await page.goto(BASE + '/he')
    await page.waitForLoadState('networkidle')
    const html = await page.locator('html').getAttribute('dir')
    expect(html).toBe('rtl')
    const cta = page.locator('a[href="/he/contact"]').filter({ hasText: /לא מצאת|ספר לנו/i })
    await expect(cta.first()).toBeVisible()
  })

})
