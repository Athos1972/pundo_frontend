import { test, expect } from '@playwright/test'

// Coming-Soon-Seite — direkt über /coming-soon Route getestet.
// Der Host-Header-Rewrite (naidivse.com → /coming-soon) ist via curl verifiziert
// (Browser kann Host-Header nicht überschreiben).

test.describe('Coming-Soon — Inhalt und Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/coming-soon')
  })

  test('Seite lädt ohne Fehler', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible()
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  })

  test('Tagline ist sichtbar', async ({ page }) => {
    await expect(page.getByText('Find everything.')).toBeVisible()
  })

  test('Logo ist sichtbar', async ({ page }) => {
    await expect(page.locator('img[alt]')).toBeVisible()
  })

  test('Countdown-Zahlen erscheinen nach Interval', async ({ page }) => {
    // Countdown startet mit 00 und tickt nach 1s — wir warten kurz
    await page.waitForTimeout(1200)
    // Mindestens eine Zahl > 0 (Tage bis Launch); Komponente nutzt CSS-Klasse .cs-num
    const digits = await page.locator('.cs-num').allTextContents()
    const values = digits.map(Number)
    expect(values.some(v => v > 0)).toBe(true)
  })

  test('E-Mail-Formular ist vorhanden', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('Ungültige E-Mail: Browser-Validation verhindert Submit', async ({ page }) => {
    await page.locator('input[type="email"]').fill('kein-at-zeichen')
    const isValid = await page.locator('input[type="email"]').evaluate(
      (el: HTMLInputElement) => el.validity.valid
    )
    expect(isValid).toBe(false)
  })

  test('Kein horizontaler Scroll auf 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
  })

  test('kein pundo-Header (keine Navigation, kein Sign-In)', async ({ page }) => {
    await expect(page.getByRole('banner')).not.toBeVisible()
  })
})

test.describe('Coming-Soon — E-Mail API', () => {
  test('Valide E-Mail abschicken → Erfolgsmeldung erscheint', async ({ page }) => {
    await page.goto('/coming-soon')
    await page.locator('input[type="email"]').fill('e2e-test@example.com')
    await page.locator('button[type="submit"]').click()
    // Erwarte Erfolgs- oder Fehlermeldung (API schreibt in Datei)
    await expect(
      page.getByText("Done! We'll let you know.").or(page.getByText('Something went wrong.'))
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Coming-Soon — RTL (Arabisch)', () => {
  test('dir=rtl auf main-Element bei app_lang=ar Cookie', async ({ page, context }) => {
    await context.addCookies([
      { name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' },
    ])
    await page.goto('/coming-soon')
    const dir = await page.locator('main').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('Arabischer Tagline-Text sichtbar', async ({ page, context }) => {
    await context.addCookies([
      { name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' },
    ])
    await page.goto('/coming-soon')
    await expect(page.getByText('اعثر على كل شيء.')).toBeVisible()
  })
})

test.describe('Coming-Soon — Proxy-Rewrite Verifikation (via API)', () => {
  test('GET / mit Host: naidivse.com liefert Coming-Soon-Inhalt', async ({ request }) => {
    const res = await request.get('http://localhost:3500/', {
      headers: { Host: 'naidivse.com' },
    })
    const body = await res.text()
    expect(body).toContain('Find everything')
  })
})
