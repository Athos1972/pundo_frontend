# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main.spec.ts >> E2E-02: Suche >> search navigates to /search?q=...
- Location: e2e/main.spec.ts:24:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/search\?q=/
Received string:  "http://127.0.0.1:3000/?"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    9 × unexpected value "http://127.0.0.1:3000/?"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "pundo — Zur Startseite" [ref=e4] [cursor=pointer]:
        - /url: /
        - img "Pundo" [ref=e5]
      - generic [ref=e6]:
        - generic [ref=e7]:
          - button "EN" [ref=e8]
          - button "DE" [ref=e9]
          - button "RU" [ref=e10]
          - button "ΕΛ" [ref=e11]
          - button "ع" [ref=e12]
          - button "עב" [ref=e13]
        - link "Sign in" [ref=e14] [cursor=pointer]:
          - /url: /auth/login
  - generic [ref=e15]:
    - generic [ref=e18]:
      - heading "Find products in Larnaca." [level=1] [ref=e19]
      - paragraph [ref=e20]: Find products in local shops – even when they're not online.
      - generic [ref=e22]:
        - searchbox "Find a product or shop..." [active] [ref=e23]
        - button "Search" [ref=e24]:
          - img [ref=e25]
      - generic [ref=e29]:
        - link "🏪 Apparel & Accessories" [ref=e30] [cursor=pointer]:
          - /url: /search?category_id=2988
          - generic [ref=e31]: 🏪
          - generic [ref=e32]: Apparel & Accessories
        - link "🏪 Arts & Entertainment" [ref=e33] [cursor=pointer]:
          - /url: /search?category_id=3228
          - generic [ref=e34]: 🏪
          - generic [ref=e35]: Arts & Entertainment
        - link "🏪 Baby & Toddler" [ref=e36] [cursor=pointer]:
          - /url: /search?category_id=3728
          - generic [ref=e37]: 🏪
          - generic [ref=e38]: Baby & Toddler
        - link "🏪 Business & Industrial" [ref=e39] [cursor=pointer]:
          - /url: /search?category_id=3815
          - generic [ref=e40]: 🏪
          - generic [ref=e41]: Business & Industrial
        - link "+10" [ref=e42] [cursor=pointer]:
          - /url: /search
    - main [ref=e43]:
      - heading "Shops near you" [level=2] [ref=e44]
  - contentinfo [ref=e49]:
    - generic [ref=e50]:
      - navigation "legal" [ref=e51]:
        - link "About Us" [ref=e52] [cursor=pointer]:
          - /url: /about
        - link "Help" [ref=e53] [cursor=pointer]:
          - /url: /help
        - link "For Shops" [ref=e54] [cursor=pointer]:
          - /url: /for-shops
        - link "Contact" [ref=e55] [cursor=pointer]:
          - /url: /contact
        - link "Imprint" [ref=e56] [cursor=pointer]:
          - /url: /legal/imprint
        - link "Privacy Policy" [ref=e57] [cursor=pointer]:
          - /url: /legal/privacy
        - link "Terms of Service" [ref=e58] [cursor=pointer]:
          - /url: /legal/terms
      - paragraph [ref=e59]: © 2026 pundo
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | // ─── E2E-01: Startseite ───────────────────────────────────────────────────────
  4   | 
  5   | test.describe('E2E-01: Startseite', () => {
  6   |   test('loads with 200 and shows search input', async ({ page }) => {
  7   |     const response = await page.goto('/')
  8   |     expect(response?.status()).toBe(200)
  9   |     await expect(page.locator('input')).toBeVisible()
  10  |   })
  11  | 
  12  |   test('no JS errors on homepage', async ({ page }) => {
  13  |     const errors: string[] = []
  14  |     page.on('pageerror', (err) => errors.push(err.message))
  15  |     await page.goto('/')
  16  |     await page.waitForLoadState('networkidle')
  17  |     expect(errors).toHaveLength(0)
  18  |   })
  19  | })
  20  | 
  21  | // ─── E2E-02: Suche ───────────────────────────────────────────────────────────
  22  | 
  23  | test.describe('E2E-02: Suche', () => {
  24  |   test('search navigates to /search?q=...', async ({ page }) => {
  25  |     await page.goto('/')
  26  |     const input = page.locator('input').first()
  27  |     await input.fill('cat food')
  28  |     await input.press('Enter')
> 29  |     await expect(page).toHaveURL(/\/search\?q=/)
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  30  |   })
  31  | 
  32  |   test('empty search does not crash', async ({ page }) => {
  33  |     const errors: string[] = []
  34  |     // Hydration warnings are expected — React error #418 is the minified form
  35  |     page.on('pageerror', (err) => {
  36  |       if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
  37  |     })
  38  |     await page.goto('/search?q=xyzxyz123notexist')
  39  |     await page.waitForLoadState('networkidle')
  40  |     expect(errors).toHaveLength(0)
  41  |   })
  42  | 
  43  |   test('search results page renders without crash', async ({ page }) => {
  44  |     await page.goto('/search?q=cat')
  45  |     await page.waitForLoadState('networkidle')
  46  |     const status = await page.evaluate(() => document.readyState)
  47  |     expect(status).toBe('complete')
  48  |   })
  49  | })
  50  | 
  51  | // ─── E2E-03: RTL-Layout ───────────────────────────────────────────────────────
  52  | // Language is set via pundo_lang cookie (not URL param)
  53  | 
  54  | test.describe('E2E-03: RTL-Layout', () => {
  55  |   async function setLang(page: import('@playwright/test').Page, lang: string) {
  56  |     await page.context().addCookies([{
  57  |       name: 'pundo_lang', value: lang, domain: '127.0.0.1', path: '/',
  58  |     }])
  59  |   }
  60  | 
  61  |   test('Arabic (ar) sets dir=rtl', async ({ page }) => {
  62  |     await setLang(page, 'ar')
  63  |     await page.goto('/')
  64  |     const dir = await page.locator('html').getAttribute('dir')
  65  |     expect(dir).toBe('rtl')
  66  |   })
  67  | 
  68  |   test('Hebrew (he) sets dir=rtl', async ({ page }) => {
  69  |     await setLang(page, 'he')
  70  |     await page.goto('/')
  71  |     const dir = await page.locator('html').getAttribute('dir')
  72  |     expect(dir).toBe('rtl')
  73  |   })
  74  | 
  75  |   test('English (en) sets dir=ltr', async ({ page }) => {
  76  |     await setLang(page, 'en')
  77  |     await page.goto('/')
  78  |     const dir = await page.locator('html').getAttribute('dir')
  79  |     expect(dir).toBe('ltr')
  80  |   })
  81  | 
  82  |   test('German (de) sets dir=ltr', async ({ page }) => {
  83  |     await setLang(page, 'de')
  84  |     await page.goto('/')
  85  |     const dir = await page.locator('html').getAttribute('dir')
  86  |     expect(dir).toBe('ltr')
  87  |   })
  88  | 
  89  |   test('Greek (el) sets dir=ltr', async ({ page }) => {
  90  |     await setLang(page, 'el')
  91  |     await page.goto('/')
  92  |     const dir = await page.locator('html').getAttribute('dir')
  93  |     expect(dir).toBe('ltr')
  94  |   })
  95  | 
  96  |   test('Russian (ru) sets dir=ltr', async ({ page }) => {
  97  |     await setLang(page, 'ru')
  98  |     await page.goto('/')
  99  |     const dir = await page.locator('html').getAttribute('dir')
  100 |     expect(dir).toBe('ltr')
  101 |   })
  102 | })
  103 | 
  104 | // ─── E2E-04: Produkt-Detailseite ─────────────────────────────────────────────
  105 | 
  106 | test.describe('E2E-04: Produkt-Detailseite', () => {
  107 |   test('unknown slug returns 404 or renders without crash', async ({ page }) => {
  108 |     const errors: string[] = []
  109 |     page.on('pageerror', (err) => errors.push(err.message))
  110 |     const response = await page.goto('/products/this-product-does-not-exist-xyz')
  111 |     // Either 200 (with empty state) or 404 — not 500
  112 |     expect([200, 404]).toContain(response?.status())
  113 |     expect(errors).toHaveLength(0)
  114 |   })
  115 | })
  116 | 
  117 | // ─── E2E-04b: Related Products Carousel ──────────────────────────────────────
  118 | 
  119 | test.describe('E2E-04b: Related Products Carousel', () => {
  120 |   const TEST_SLUG = 'avicentra-avicentra-classic-menu-budgie-1kg'
  121 | 
  122 |   test('carousel section visible when related products exist', async ({ page }) => {
  123 |     const errors: string[] = []
  124 |     page.on('pageerror', (err) => errors.push(err.message))
  125 |     await page.goto(`/products/${TEST_SLUG}`)
  126 |     await page.waitForLoadState('networkidle')
  127 | 
  128 |     // Section must be visible (backend has related products for this slug)
  129 |     const section = page.getByRole('region', { name: /related products/i })
```