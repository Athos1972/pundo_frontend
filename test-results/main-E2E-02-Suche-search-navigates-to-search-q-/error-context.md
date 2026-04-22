# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main.spec.ts >> E2E-02: Suche >> search navigates to /search?q=...
- Location: e2e/main.spec.ts:27:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/search\?q=/
Received string:  "http://127.0.0.1:3500/?"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    9 × unexpected value "http://127.0.0.1:3500/?"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "Pundo — Zur Startseite" [ref=e4] [cursor=pointer]:
        - /url: /
        - img "Pundo" [ref=e5]
      - navigation [ref=e6]:
        - link "Shops" [ref=e7] [cursor=pointer]:
          - /url: /shops
        - link "Guides" [ref=e8] [cursor=pointer]:
          - /url: /guides
        - link "For Shops" [ref=e9] [cursor=pointer]:
          - /url: /for-shops
      - generic [ref=e10]:
        - generic [ref=e11]:
          - button "EN" [ref=e12]
          - button "DE" [ref=e13]
          - button "RU" [ref=e14]
          - button "ΕΛ" [ref=e15]
          - button "ع" [ref=e16]
          - button "עב" [ref=e17]
        - link "Sign in" [ref=e18] [cursor=pointer]:
          - /url: /auth/login
  - generic [ref=e19]:
    - generic [ref=e22]:
      - generic [ref=e23]:
        - heading "Discover what Cyprus really has." [level=1] [ref=e24]
        - paragraph [ref=e25]: Shops, artisans & hidden gems — in your language.
      - generic [ref=e27]:
        - searchbox "Find a product or shop..." [active] [ref=e28]
        - button "Search" [ref=e29]:
          - img [ref=e30]
      - generic [ref=e33]:
        - link "🏪 Apparel & Accessories" [ref=e34] [cursor=pointer]:
          - /url: /search?category_id=2988
          - generic [ref=e35]: 🏪
          - generic [ref=e36]: Apparel & Accessories
        - link "🏪 Arts & Entertainment" [ref=e37] [cursor=pointer]:
          - /url: /search?category_id=3228
          - generic [ref=e38]: 🏪
          - generic [ref=e39]: Arts & Entertainment
        - link "🏪 Baby & Toddler" [ref=e40] [cursor=pointer]:
          - /url: /search?category_id=3728
          - generic [ref=e41]: 🏪
          - generic [ref=e42]: Baby & Toddler
        - link "🏪 Business & Industrial" [ref=e43] [cursor=pointer]:
          - /url: /search?category_id=3815
          - generic [ref=e44]: 🏪
          - generic [ref=e45]: Business & Industrial
        - link "+10" [ref=e46] [cursor=pointer]:
          - /url: /search
    - generic [ref=e49]:
      - generic [ref=e50]:
        - heading "Expat Guides" [level=2] [ref=e51]
        - link "All 2 guides →" [ref=e52] [cursor=pointer]:
          - /url: /guides
      - generic [ref=e53]:
        - link "🚗 Mobility Registering Your Car in Cyprus" [ref=e54] [cursor=pointer]:
          - /url: /guides/auto-registration
          - generic [ref=e55]: 🚗
          - generic [ref=e56]: Mobility
          - generic [ref=e57]: Registering Your Car in Cyprus
        - link "🏛️ Authorities What is a Mukhtar?" [ref=e58] [cursor=pointer]:
          - /url: /guides/mukhtar
          - generic [ref=e59]: 🏛️
          - generic [ref=e60]: Authorities
          - generic [ref=e61]: What is a Mukhtar?
    - main [ref=e62]:
      - heading "Shops near you" [level=2] [ref=e63]
  - contentinfo [ref=e68]:
    - generic [ref=e69]:
      - navigation "legal" [ref=e70]:
        - link "About Us" [ref=e71] [cursor=pointer]:
          - /url: /about
        - link "Help" [ref=e72] [cursor=pointer]:
          - /url: /help
        - link "For Shops" [ref=e73] [cursor=pointer]:
          - /url: /for-shops
        - link "Contact" [ref=e74] [cursor=pointer]:
          - /url: /contact
        - link "Imprint" [ref=e75] [cursor=pointer]:
          - /url: /legal/imprint
        - link "Privacy Policy" [ref=e76] [cursor=pointer]:
          - /url: /legal/privacy
        - link "Terms of Service" [ref=e77] [cursor=pointer]:
          - /url: /legal/terms
      - paragraph [ref=e78]: © 2026 Buhl Consulting Ltd
  - button "AI Search" [ref=e79]:
    - img [ref=e80]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | // Cookie-Domain aus E2E_COOKIE_DOMAIN (Env) oder Fallback 127.0.0.1
  4   | const COOKIE_DOMAIN = process.env.E2E_COOKIE_DOMAIN ?? '127.0.0.1'
  5   | 
  6   | // ─── E2E-01: Startseite ───────────────────────────────────────────────────────
  7   | 
  8   | test.describe('E2E-01: Startseite', () => {
  9   |   test('loads with 200 and shows search input', async ({ page }) => {
  10  |     const response = await page.goto('/')
  11  |     expect(response?.status()).toBe(200)
  12  |     await expect(page.locator('input')).toBeVisible()
  13  |   })
  14  | 
  15  |   test('no JS errors on homepage', async ({ page }) => {
  16  |     const errors: string[] = []
  17  |     page.on('pageerror', (err) => errors.push(err.message))
  18  |     await page.goto('/')
  19  |     await page.waitForLoadState('networkidle')
  20  |     expect(errors).toHaveLength(0)
  21  |   })
  22  | })
  23  | 
  24  | // ─── E2E-02: Suche ───────────────────────────────────────────────────────────
  25  | 
  26  | test.describe('E2E-02: Suche', () => {
  27  |   test('search navigates to /search?q=...', async ({ page }) => {
  28  |     await page.goto('/')
  29  |     const input = page.locator('input').first()
  30  |     await input.fill('cat food')
  31  |     await input.press('Enter')
> 32  |     await expect(page).toHaveURL(/\/search\?q=/)
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  33  |   })
  34  | 
  35  |   test('empty search does not crash', async ({ page }) => {
  36  |     const errors: string[] = []
  37  |     // Hydration warnings are expected — React error #418 is the minified form
  38  |     page.on('pageerror', (err) => {
  39  |       if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
  40  |     })
  41  |     await page.goto('/search?q=xyzxyz123notexist')
  42  |     await page.waitForLoadState('networkidle')
  43  |     expect(errors).toHaveLength(0)
  44  |   })
  45  | 
  46  |   test('search results page renders without crash', async ({ page }) => {
  47  |     await page.goto('/search?q=cat')
  48  |     await page.waitForLoadState('networkidle')
  49  |     const status = await page.evaluate(() => document.readyState)
  50  |     expect(status).toBe('complete')
  51  |   })
  52  | })
  53  | 
  54  | // ─── E2E-03: RTL-Layout ───────────────────────────────────────────────────────
  55  | // Language is set via app_lang cookie (not URL param)
  56  | 
  57  | test.describe('E2E-03: RTL-Layout', () => {
  58  |   async function setLang(page: import('@playwright/test').Page, lang: string) {
  59  |     await page.context().addCookies([{
  60  |       name: 'app_lang', value: lang, domain: COOKIE_DOMAIN, path: '/',
  61  |     }])
  62  |   }
  63  | 
  64  |   test('Arabic (ar) sets dir=rtl', async ({ page }) => {
  65  |     await setLang(page, 'ar')
  66  |     await page.goto('/')
  67  |     const dir = await page.locator('html').getAttribute('dir')
  68  |     expect(dir).toBe('rtl')
  69  |   })
  70  | 
  71  |   test('Hebrew (he) sets dir=rtl', async ({ page }) => {
  72  |     await setLang(page, 'he')
  73  |     await page.goto('/')
  74  |     const dir = await page.locator('html').getAttribute('dir')
  75  |     expect(dir).toBe('rtl')
  76  |   })
  77  | 
  78  |   test('English (en) sets dir=ltr', async ({ page }) => {
  79  |     await setLang(page, 'en')
  80  |     await page.goto('/')
  81  |     const dir = await page.locator('html').getAttribute('dir')
  82  |     expect(dir).toBe('ltr')
  83  |   })
  84  | 
  85  |   test('German (de) sets dir=ltr', async ({ page }) => {
  86  |     await setLang(page, 'de')
  87  |     await page.goto('/')
  88  |     const dir = await page.locator('html').getAttribute('dir')
  89  |     expect(dir).toBe('ltr')
  90  |   })
  91  | 
  92  |   test('Greek (el) sets dir=ltr', async ({ page }) => {
  93  |     await setLang(page, 'el')
  94  |     await page.goto('/')
  95  |     const dir = await page.locator('html').getAttribute('dir')
  96  |     expect(dir).toBe('ltr')
  97  |   })
  98  | 
  99  |   test('Russian (ru) sets dir=ltr', async ({ page }) => {
  100 |     await setLang(page, 'ru')
  101 |     await page.goto('/')
  102 |     const dir = await page.locator('html').getAttribute('dir')
  103 |     expect(dir).toBe('ltr')
  104 |   })
  105 | })
  106 | 
  107 | // ─── E2E-04: Produkt-Detailseite ─────────────────────────────────────────────
  108 | 
  109 | test.describe('E2E-04: Produkt-Detailseite', () => {
  110 |   test('unknown slug returns 404 or renders without crash', async ({ page }) => {
  111 |     const errors: string[] = []
  112 |     page.on('pageerror', (err) => errors.push(err.message))
  113 |     const response = await page.goto('/products/this-product-does-not-exist-xyz')
  114 |     // Either 200 (with empty state) or 404 — not 500
  115 |     expect([200, 404]).toContain(response?.status())
  116 |     expect(errors).toHaveLength(0)
  117 |   })
  118 | })
  119 | 
  120 | // ─── E2E-04b: Related Products Carousel ──────────────────────────────────────
  121 | 
  122 | test.describe('E2E-04b: Related Products Carousel', () => {
  123 |   const TEST_SLUG = 'avicentra-avicentra-classic-menu-budgie-1kg'
  124 | 
  125 |   test('carousel section visible when related products exist', async ({ page }) => {
  126 |     const errors: string[] = []
  127 |     page.on('pageerror', (err) => errors.push(err.message))
  128 |     await page.goto(`/products/${TEST_SLUG}`)
  129 |     await page.waitForLoadState('networkidle')
  130 | 
  131 |     // Section must be visible (backend has related products for this slug)
  132 |     const section = page.getByRole('region', { name: /related products/i })
```