# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main.spec.ts >> E2E-08: Karten-Routing-Links >> map popup shows 3 routing links with correct URLs after clicking a pin
- Location: e2e/main.spec.ts:539:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.leaflet-marker-icon') to be visible

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "Pundo — Zur Startseite" [ref=e4] [cursor=pointer]:
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
    - generic [ref=e16]:
      - link "Home" [ref=e18] [cursor=pointer]:
        - /url: /
        - img [ref=e19]
        - text: Home
      - generic [ref=e22]:
        - searchbox "Find a product or shop..." [ref=e23]: cat
        - button "Search" [ref=e24]:
          - img [ref=e25]
      - generic [ref=e28]:
        - button "In stock" [ref=e29]
        - button "With price only" [ref=e30]
        - button "Online" [pressed] [ref=e31]
      - generic [ref=e32]:
        - generic [ref=e33]: Distance
        - slider "Distance" [ref=e34]: "50"
        - generic [ref=e35]: 50 km
    - generic [ref=e36]:
      - button "List" [ref=e37]
      - button "Map" [active] [ref=e38]
    - generic [ref=e40]:
      - heading "Local Shops" [level=2] [ref=e41]
      - paragraph [ref=e42]: No local shops in this radius.
      - paragraph [ref=e43]: No results found.
  - contentinfo [ref=e44]:
    - generic [ref=e45]:
      - navigation "legal" [ref=e46]:
        - link "About Us" [ref=e47] [cursor=pointer]:
          - /url: /about
        - link "Help" [ref=e48] [cursor=pointer]:
          - /url: /help
        - link "For Shops" [ref=e49] [cursor=pointer]:
          - /url: /for-shops
        - link "Contact" [ref=e50] [cursor=pointer]:
          - /url: /contact
        - link "Imprint" [ref=e51] [cursor=pointer]:
          - /url: /legal/imprint
        - link "Privacy Policy" [ref=e52] [cursor=pointer]:
          - /url: /legal/privacy
        - link "Terms of Service" [ref=e53] [cursor=pointer]:
          - /url: /legal/terms
      - paragraph [ref=e54]: © 2026 Buhl Consulting Ltd
  - button "Spot a price" [ref=e55]:
    - img [ref=e56]
  - button "AI Search" [ref=e59]:
    - img [ref=e60]
```

# Test source

```ts
  426 |       name: 'app_lang', value: 'ar', domain: COOKIE_DOMAIN, path: '/',
  427 |     }])
  428 |     await page.goto('/help')
  429 |     const dir = await page.locator('html').getAttribute('dir')
  430 |     expect(dir).toBe('rtl')
  431 |   })
  432 | 
  433 |   test('/for-shops returns 200 and shows hero heading', async ({ page }) => {
  434 |     const response = await page.goto('/for-shops')
  435 |     expect(response?.status()).toBe(200)
  436 |     await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  437 |     const h1 = await page.getByRole('heading', { level: 1 }).textContent()
  438 |     expect(h1!.length).toBeGreaterThan(5)
  439 |   })
  440 | 
  441 |   test('/for-shops has CTA link pointing to /shop-admin/register', async ({ page }) => {
  442 |     await page.goto('/for-shops')
  443 |     const ctaLinks = await page.getByRole('link', { name: /register|registr|anmeld/i }).all()
  444 |     expect(ctaLinks.length).toBeGreaterThanOrEqual(1)
  445 |     const href = await ctaLinks[0].getAttribute('href')
  446 |     expect(href).toContain('/shop-admin/register')
  447 |   })
  448 | 
  449 |   test('/for-shops feature grid renders at least 4 cards', async ({ page }) => {
  450 |     await page.goto('/for-shops')
  451 |     await page.waitForLoadState('networkidle')
  452 |     // Feature cards are <div> elements inside the grid
  453 |     const headings = await page.getByRole('heading', { level: 3 }).count()
  454 |     expect(headings).toBeGreaterThanOrEqual(4)
  455 |   })
  456 | 
  457 |   test('/for-shops no JS errors', async ({ page }) => {
  458 |     const errors: string[] = []
  459 |     page.on('pageerror', (err) => {
  460 |       if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
  461 |     })
  462 |     await page.goto('/for-shops')
  463 |     await page.waitForLoadState('networkidle')
  464 |     expect(errors).toHaveLength(0)
  465 |   })
  466 | 
  467 |   test('/for-shops RTL: Hebrew shows dir=rtl', async ({ page }) => {
  468 |     await page.context().addCookies([{
  469 |       name: 'app_lang', value: 'he', domain: COOKIE_DOMAIN, path: '/',
  470 |     }])
  471 |     await page.goto('/for-shops')
  472 |     const dir = await page.locator('html').getAttribute('dir')
  473 |     expect(dir).toBe('rtl')
  474 |   })
  475 | 
  476 |   test('footer contains links to /help and /for-shops', async ({ page }) => {
  477 |     await page.goto('/')
  478 |     await page.waitForLoadState('networkidle')
  479 |     const helpLink = page.locator('footer a[href="/help"]')
  480 |     const forShopsLink = page.locator('footer a[href="/for-shops"]')
  481 |     await expect(helpLink).toBeVisible()
  482 |     await expect(forShopsLink).toBeVisible()
  483 |   })
  484 | 
  485 |   test('/shop-admin/help redirects unauthenticated user to login', async ({ page }) => {
  486 |     await page.goto('/shop-admin/help')
  487 |     // Should redirect to login
  488 |     await expect(page).toHaveURL(/\/shop-admin\/login/)
  489 |   })
  490 | })
  491 | 
  492 | test.describe('E2E-11b: ReviewSection how-it-works hint', () => {
  493 |   const TEST_PRODUCT_SLUG = 'acana-acana-wild-prairie-cat-18kg'
  494 | 
  495 |   test('review section contains how-it-works <details> hint', async ({ page }) => {
  496 |     await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
  497 |     await page.waitForLoadState('networkidle')
  498 |     // The inline hint is a <details> inside the review section
  499 |     const reviewSection = page.locator('section[aria-label]').filter({ hasText: /review|bewertung|отзыв/i })
  500 |     const hintDetails = reviewSection.locator('details').first()
  501 |     await expect(hintDetails).toBeVisible()
  502 |   })
  503 | 
  504 |   test('review section hint opens and shows body text', async ({ page }) => {
  505 |     await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
  506 |     await page.waitForLoadState('networkidle')
  507 |     const reviewSection = page.locator('section[aria-label]').filter({ hasText: /review|bewertung|отзыв/i })
  508 |     const hintDetails = reviewSection.locator('details').first()
  509 |     const summary = hintDetails.locator('summary')
  510 |     await summary.click()
  511 |     await expect(hintDetails).toHaveAttribute('open', '')
  512 |   })
  513 | })
  514 | 
  515 | test.describe('E2E-08: Karten-Routing-Links', () => {
  516 |   // Map toggle button is mobile-only (md:hidden on desktop) — use mobile viewport
  517 |   test.use({ viewport: { width: 400, height: 900 } })
  518 | 
  519 |   async function gotoSearchMapWithMarker(page: import('@playwright/test').Page, lang?: string) {
  520 |     await page.goto('/search?q=cat')
  521 |     if (lang) {
  522 |       await page.evaluate((l) => { document.cookie = `app_lang=${l}; path=/` }, lang)
  523 |       await page.reload()
  524 |     }
  525 |     await page.getByRole('button', { name: /map|karte|خريطة/i }).click()
> 526 |     await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 })
      |                ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  527 |     // Give Leaflet time to finish attaching popup event handlers
  528 |     await page.waitForTimeout(1500)
  529 |     // Trigger via native DOM event — Leaflet needs a bubbling click to open its popup
  530 |     await page.evaluate(() => {
  531 |       const marker = document.querySelector('.leaflet-marker-icon') as HTMLElement | null
  532 |       if (marker) {
  533 |         marker.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  534 |       }
  535 |     })
  536 |     await page.waitForSelector('.leaflet-popup-content', { timeout: 8000 })
  537 |   }
  538 | 
  539 |   test('map popup shows 3 routing links with correct URLs after clicking a pin', async ({ page }) => {
  540 |     await gotoSearchMapWithMarker(page)
  541 | 
  542 |     const links = page.locator('.leaflet-popup-content a')
  543 |     await expect(links).toHaveCount(3)
  544 | 
  545 |     const hrefs = await links.evaluateAll((els: HTMLAnchorElement[]) => els.map(e => e.href))
  546 |     expect(hrefs[0]).toContain('google.com/maps/dir/')
  547 |     expect(hrefs[0]).toContain('destination=')
  548 |     expect(hrefs[1]).toContain('maps.apple.com')
  549 |     expect(hrefs[1]).toContain('daddr=')
  550 |     expect(hrefs[2]).toContain('waze.com/ul')
  551 |     expect(hrefs[2]).toContain('navigate=yes')
  552 |   })
  553 | 
  554 |   test('routing links open in new tab (target=_blank)', async ({ page }) => {
  555 |     await gotoSearchMapWithMarker(page)
  556 | 
  557 |     const targets = await page.locator('.leaflet-popup-content a').evaluateAll(
  558 |       (els: HTMLAnchorElement[]) => els.map(e => e.target)
  559 |     )
  560 |     expect(targets.every(t => t === '_blank')).toBe(true)
  561 |   })
  562 | 
  563 |   test('popup dir=rtl for Arabic lang', async ({ page }) => {
  564 |     await gotoSearchMapWithMarker(page, 'ar')
  565 | 
  566 |     const dir = await page.locator('.leaflet-popup-content div').first().getAttribute('dir')
  567 |     expect(dir).toBe('rtl')
  568 |   })
  569 | })
  570 | 
```