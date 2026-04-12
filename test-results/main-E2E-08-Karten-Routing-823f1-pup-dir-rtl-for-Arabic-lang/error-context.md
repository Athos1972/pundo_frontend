# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main.spec.ts >> E2E-08: Karten-Routing-Links >> popup dir=rtl for Arabic lang
- Location: e2e/main.spec.ts:430:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://127.0.0.1:3500/search?q=cat", waiting until "load"

```

# Test source

```ts
  287 |     await page.goto('/account')
  288 |     await expect(page).toHaveURL(/\/auth\/login/)
  289 |   })
  290 | 
  291 |   test('login page renders email and password fields', async ({ page }) => {
  292 |     const response = await page.goto('/auth/login')
  293 |     expect(response?.status()).toBe(200)
  294 |     await expect(page.locator('input[type="email"]')).toBeVisible()
  295 |     await expect(page.locator('input[type="password"]')).toBeVisible()
  296 |   })
  297 | 
  298 |   test('signup page renders required fields', async ({ page }) => {
  299 |     const response = await page.goto('/auth/signup')
  300 |     expect(response?.status()).toBe(200)
  301 |     await expect(page.locator('input[type="email"]')).toBeVisible()
  302 |     await expect(page.locator('input[type="password"]')).toBeVisible()
  303 |   })
  304 | 
  305 |   test('verify-email without params redirects to signup', async ({ page }) => {
  306 |     await page.goto('/auth/verify-email')
  307 |     // No email param → redirect to signup
  308 |     await expect(page).toHaveURL(/\/auth\/signup/)
  309 |   })
  310 | 
  311 |   test('login page RTL (Arabic)', async ({ page }) => {
  312 |     await page.context().addCookies([{
  313 |       name: 'pundo_lang', value: 'ar', domain: '127.0.0.1', path: '/',
  314 |     }])
  315 |     await page.goto('/auth/login')
  316 |     const dir = await page.locator('html').getAttribute('dir')
  317 |     expect(dir).toBe('rtl')
  318 |   })
  319 | 
  320 |   test('no JS errors on login page', async ({ page }) => {
  321 |     const errors: string[] = []
  322 |     page.on('pageerror', (err) => {
  323 |       if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
  324 |     })
  325 |     await page.goto('/auth/login')
  326 |     await page.waitForLoadState('networkidle')
  327 |     expect(errors).toHaveLength(0)
  328 |   })
  329 | 
  330 |   test('no JS errors on signup page', async ({ page }) => {
  331 |     const errors: string[] = []
  332 |     page.on('pageerror', (err) => {
  333 |       if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
  334 |     })
  335 |     await page.goto('/auth/signup')
  336 |     await page.waitForLoadState('networkidle')
  337 |     expect(errors).toHaveLength(0)
  338 |   })
  339 | })
  340 | 
  341 | // ─── E2E-10: Review Section on Product/Shop Pages ────────────────────────────
  342 | 
  343 | test.describe('E2E-10: Review Section', () => {
  344 |   const TEST_PRODUCT_SLUG = 'acana-acana-wild-prairie-cat-18kg'
  345 | 
  346 |   test('product page renders without crash', async ({ page }) => {
  347 |     const errors: string[] = []
  348 |     page.on('pageerror', (err) => {
  349 |       if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
  350 |     })
  351 |     await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
  352 |     await page.waitForLoadState('networkidle')
  353 |     expect(errors).toHaveLength(0)
  354 |   })
  355 | 
  356 |   test('product page shows review section or login prompt', async ({ page }) => {
  357 |     await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
  358 |     await page.waitForLoadState('networkidle')
  359 |     // ReviewForm should be present (either login prompt or star input)
  360 |     const body = await page.content()
  361 |     const hasStars = await page.locator('[aria-label$="stars"]').count()
  362 |     const hasLoginHint = body.includes('/auth/login') || body.includes('Sign in') || body.includes('anmelden') || body.includes('Anmelden')
  363 |     expect(hasStars > 0 || hasLoginHint).toBe(true)
  364 |   })
  365 | 
  366 |   test('RTL: product page with Arabic sets dir=rtl', async ({ page }) => {
  367 |     await page.context().addCookies([{
  368 |       name: 'pundo_lang', value: 'ar', domain: '127.0.0.1', path: '/',
  369 |     }])
  370 |     const errors: string[] = []
  371 |     page.on('pageerror', (err) => {
  372 |       if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
  373 |     })
  374 |     await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
  375 |     await page.waitForLoadState('networkidle')
  376 |     const dir = await page.locator('html').getAttribute('dir')
  377 |     expect(dir).toBe('rtl')
  378 |     expect(errors).toHaveLength(0)
  379 |   })
  380 | })
  381 | 
  382 | test.describe('E2E-08: Karten-Routing-Links', () => {
  383 |   // Map toggle button is mobile-only (md:hidden on desktop) — use mobile viewport
  384 |   test.use({ viewport: { width: 400, height: 900 } })
  385 | 
  386 |   async function gotoSearchMapWithMarker(page: import('@playwright/test').Page, lang?: string) {
> 387 |     await page.goto('/search?q=cat')
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  388 |     if (lang) {
  389 |       await page.evaluate((l) => { document.cookie = `pundo_lang=${l}; path=/` }, lang)
  390 |       await page.reload()
  391 |     }
  392 |     await page.getByRole('button', { name: /map|karte|خريطة/i }).click()
  393 |     await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 })
  394 |     // Give Leaflet time to finish attaching popup event handlers
  395 |     await page.waitForTimeout(1500)
  396 |     // Trigger via native DOM event — Leaflet needs a bubbling click to open its popup
  397 |     await page.evaluate(() => {
  398 |       const marker = document.querySelector('.leaflet-marker-icon') as HTMLElement | null
  399 |       if (marker) {
  400 |         marker.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  401 |       }
  402 |     })
  403 |     await page.waitForSelector('.leaflet-popup-content', { timeout: 8000 })
  404 |   }
  405 | 
  406 |   test('map popup shows 3 routing links with correct URLs after clicking a pin', async ({ page }) => {
  407 |     await gotoSearchMapWithMarker(page)
  408 | 
  409 |     const links = page.locator('.leaflet-popup-content a')
  410 |     await expect(links).toHaveCount(3)
  411 | 
  412 |     const hrefs = await links.evaluateAll((els: HTMLAnchorElement[]) => els.map(e => e.href))
  413 |     expect(hrefs[0]).toContain('google.com/maps/dir/')
  414 |     expect(hrefs[0]).toContain('destination=')
  415 |     expect(hrefs[1]).toContain('maps.apple.com')
  416 |     expect(hrefs[1]).toContain('daddr=')
  417 |     expect(hrefs[2]).toContain('waze.com/ul')
  418 |     expect(hrefs[2]).toContain('navigate=yes')
  419 |   })
  420 | 
  421 |   test('routing links open in new tab (target=_blank)', async ({ page }) => {
  422 |     await gotoSearchMapWithMarker(page)
  423 | 
  424 |     const targets = await page.locator('.leaflet-popup-content a').evaluateAll(
  425 |       (els: HTMLAnchorElement[]) => els.map(e => e.target)
  426 |     )
  427 |     expect(targets.every(t => t === '_blank')).toBe(true)
  428 |   })
  429 | 
  430 |   test('popup dir=rtl for Arabic lang', async ({ page }) => {
  431 |     await gotoSearchMapWithMarker(page, 'ar')
  432 | 
  433 |     const dir = await page.locator('.leaflet-popup-content div').first().getAttribute('dir')
  434 |     expect(dir).toBe('rtl')
  435 |   })
  436 | })
  437 | 
```