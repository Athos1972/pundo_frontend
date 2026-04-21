# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: coming-soon.spec.ts >> Coming-Soon — Inhalt und Layout >> Countdown-Zahlen erscheinen nach Interval
- Location: e2e/coming-soon.spec.ts:27:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic: НАЙДИ
    - generic [ref=e3]:
      - generic [ref=e5]:
        - button "EN" [ref=e6]
        - button "DE" [ref=e7]
        - button "RU" [ref=e8]
        - button "ΕΛ" [ref=e9]
        - button "ع" [ref=e10]
        - button "עב" [ref=e11]
      - img "Pundo" [ref=e13]
      - heading "Find everything." [level=1] [ref=e14]
      - paragraph [ref=e15]: The English-language product & shop locator for Cyprus — launching soon.
      - paragraph [ref=e16]: Launching
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]: "10"
          - generic [ref=e21]: days
        - generic [ref=e22]: ":"
        - generic [ref=e23]:
          - generic [ref=e24]: "10"
          - generic [ref=e25]: hours
        - generic [ref=e26]: ":"
        - generic [ref=e27]:
          - generic [ref=e28]: "31"
          - generic [ref=e29]: min
        - generic [ref=e30]: ":"
        - generic [ref=e31]:
          - generic [ref=e32]: "11"
          - generic [ref=e33]: sec
      - generic [ref=e37]:
        - textbox "Your email" [ref=e38]
        - button "Notify me" [ref=e39] [cursor=pointer]
  - alert [ref=e40]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | // Coming-Soon-Seite — direkt über /coming-soon Route getestet.
  4   | // Der Host-Header-Rewrite (naidivse.com → /coming-soon) ist via curl verifiziert
  5   | // (Browser kann Host-Header nicht überschreiben).
  6   | 
  7   | test.describe('Coming-Soon — Inhalt und Layout', () => {
  8   |   test.beforeEach(async ({ page }) => {
  9   |     await page.goto('/coming-soon')
  10  |   })
  11  | 
  12  |   test('Seite lädt ohne Fehler', async ({ page }) => {
  13  |     await expect(page.locator('main')).toBeVisible()
  14  |     const errors: string[] = []
  15  |     page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  16  |     expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  17  |   })
  18  | 
  19  |   test('Tagline ist sichtbar', async ({ page }) => {
  20  |     await expect(page.getByText('Find everything.')).toBeVisible()
  21  |   })
  22  | 
  23  |   test('Logo ist sichtbar', async ({ page }) => {
  24  |     await expect(page.locator('img[alt]')).toBeVisible()
  25  |   })
  26  | 
  27  |   test('Countdown-Zahlen erscheinen nach Interval', async ({ page }) => {
  28  |     // Countdown startet mit 00 und tickt nach 1s — wir warten kurz
  29  |     await page.waitForTimeout(1200)
  30  |     // Mindestens eine Zahl > 0 (12 Tage bis Launch)
  31  |     const digits = await page.locator('.tabular-nums').allTextContents()
  32  |     const values = digits.map(Number)
> 33  |     expect(values.some(v => v > 0)).toBe(true)
      |                                     ^ Error: expect(received).toBe(expected) // Object.is equality
  34  |   })
  35  | 
  36  |   test('E-Mail-Formular ist vorhanden', async ({ page }) => {
  37  |     await expect(page.locator('input[type="email"]')).toBeVisible()
  38  |     await expect(page.locator('button[type="submit"]')).toBeVisible()
  39  |   })
  40  | 
  41  |   test('Ungültige E-Mail: Browser-Validation verhindert Submit', async ({ page }) => {
  42  |     await page.locator('input[type="email"]').fill('kein-at-zeichen')
  43  |     const isValid = await page.locator('input[type="email"]').evaluate(
  44  |       (el: HTMLInputElement) => el.validity.valid
  45  |     )
  46  |     expect(isValid).toBe(false)
  47  |   })
  48  | 
  49  |   test('Kein horizontaler Scroll auf 375px', async ({ page }) => {
  50  |     await page.setViewportSize({ width: 375, height: 812 })
  51  |     const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  52  |     const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  53  |     expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
  54  |   })
  55  | 
  56  |   test('kein pundo-Header (keine Navigation, kein Sign-In)', async ({ page }) => {
  57  |     await expect(page.getByRole('banner')).not.toBeVisible()
  58  |   })
  59  | })
  60  | 
  61  | test.describe('Coming-Soon — E-Mail API', () => {
  62  |   test('Valide E-Mail abschicken → Erfolgsmeldung erscheint', async ({ page }) => {
  63  |     await page.goto('/coming-soon')
  64  |     await page.locator('input[type="email"]').fill('e2e-test@example.com')
  65  |     await page.locator('button[type="submit"]').click()
  66  |     // Erwarte Erfolgs- oder Fehlermeldung (API schreibt in Datei)
  67  |     await expect(
  68  |       page.getByText("Done! We'll let you know.").or(page.getByText('Something went wrong.'))
  69  |     ).toBeVisible({ timeout: 5000 })
  70  |   })
  71  | })
  72  | 
  73  | test.describe('Coming-Soon — RTL (Arabisch)', () => {
  74  |   test('dir=rtl auf main-Element bei app_lang=ar Cookie', async ({ page, context }) => {
  75  |     await context.addCookies([
  76  |       { name: 'app_lang', value: 'ar', domain: 'localhost', path: '/' },
  77  |     ])
  78  |     await page.goto('/coming-soon')
  79  |     const dir = await page.locator('main').getAttribute('dir')
  80  |     expect(dir).toBe('rtl')
  81  |   })
  82  | 
  83  |   test('Arabischer Tagline-Text sichtbar', async ({ page, context }) => {
  84  |     await context.addCookies([
  85  |       { name: 'app_lang', value: 'ar', domain: 'localhost', path: '/' },
  86  |     ])
  87  |     await page.goto('/coming-soon')
  88  |     await expect(page.getByText('اعثر على كل شيء.')).toBeVisible()
  89  |   })
  90  | })
  91  | 
  92  | test.describe('Coming-Soon — Proxy-Rewrite Verifikation (via API)', () => {
  93  |   test('GET / mit Host: naidivse.com liefert Coming-Soon-Inhalt', async ({ request }) => {
  94  |     const res = await request.get('http://localhost:3500/', {
  95  |       headers: { Host: 'naidivse.com' },
  96  |     })
  97  |     const body = await res.text()
  98  |     expect(body).toContain('Find everything')
  99  |   })
  100 | })
  101 | 
```