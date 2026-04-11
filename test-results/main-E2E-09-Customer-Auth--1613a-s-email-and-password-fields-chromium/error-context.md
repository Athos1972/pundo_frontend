# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main.spec.ts >> E2E-09: Customer Auth Pages >> login page renders email and password fields
- Location: e2e/main.spec.ts:291:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[type="email"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[type="email"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "Etwas ist schiefgelaufen" [level=1] [ref=e4]
    - button "Erneut versuchen" [ref=e5]
  - contentinfo [ref=e6]:
    - generic [ref=e7]:
      - navigation "legal" [ref=e8]:
        - link "About Us" [ref=e9] [cursor=pointer]:
          - /url: /about
        - link "Contact" [ref=e10] [cursor=pointer]:
          - /url: /contact
        - link "Imprint" [ref=e11] [cursor=pointer]:
          - /url: /legal/imprint
        - link "Privacy Policy" [ref=e12] [cursor=pointer]:
          - /url: /legal/privacy
        - link "Terms of Service" [ref=e13] [cursor=pointer]:
          - /url: /legal/terms
      - paragraph [ref=e14]: © 2026 pundo
  - generic [ref=e19] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e20]:
      - img [ref=e21]
    - generic [ref=e24]:
      - button "Open issues overlay" [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]: "0"
          - generic [ref=e28]: "1"
        - generic [ref=e29]: Issue
      - button "Collapse issues badge" [ref=e30]:
        - img [ref=e31]
  - alert [ref=e33]
```

# Test source

```ts
  194 |     // dir=rtl must be set
  195 |     const dir = await page.locator('html').getAttribute('dir')
  196 |     expect(dir).toBe('rtl')
  197 |     expect(errors).toHaveLength(0)
  198 |   })
  199 | 
  200 |   test.describe('mobile 375px', () => {
  201 |     test.use({ viewport: { width: 375, height: 812 } })
  202 | 
  203 |     test('carousel does not cause horizontal page overflow', async ({ page }) => {
  204 |       await page.goto(`/products/${TEST_SLUG}`)
  205 |       await page.waitForLoadState('networkidle')
  206 | 
  207 |       // Outer document must not overflow — the scroll must be contained inside the carousel
  208 |       const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  209 |       const docClientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  210 |       expect(docScrollWidth).toBeLessThanOrEqual(docClientWidth + 1) // 1px tolerance
  211 |     })
  212 |   })
  213 | })
  214 | 
  215 | // ─── E2E-05: Shop-Seite ───────────────────────────────────────────────────────
  216 | 
  217 | test.describe('E2E-05: Shop-Seite', () => {
  218 |   test('unknown shop slug returns 404 or renders without crash', async ({ page }) => {
  219 |     const errors: string[] = []
  220 |     page.on('pageerror', (err) => errors.push(err.message))
  221 |     const response = await page.goto('/shops/nonexistent-shop-xyz')
  222 |     expect([200, 404]).toContain(response?.status())
  223 |     expect(errors).toHaveLength(0)
  224 |   })
  225 | })
  226 | 
  227 | // ─── E2E-06: Responsive Mobile ───────────────────────────────────────────────
  228 | 
  229 | test.describe('E2E-06: Responsive Mobile', () => {
  230 |   test.use({ viewport: { width: 390, height: 844 } })
  231 | 
  232 |   test('homepage has no horizontal overflow', async ({ page }) => {
  233 |     await page.goto('/')
  234 |     await page.waitForLoadState('networkidle')
  235 |     const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  236 |     const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  237 |     expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // 1px tolerance
  238 |   })
  239 | 
  240 |   test('search input is present and usable on mobile', async ({ page }) => {
  241 |     await page.goto('/')
  242 |     const input = page.locator('input').first()
  243 |     await expect(input).toBeVisible()
  244 |     const box = await input.boundingBox()
  245 |     expect(box?.height).toBeGreaterThanOrEqual(36) // touch-friendly
  246 |   })
  247 | })
  248 | 
  249 | // ─── E2E-07: Auth Redirect ────────────────────────────────────────────────────
  250 | 
  251 | test.describe('E2E-07: Auth & Shop-Admin Redirect', () => {
  252 |   test('unauthenticated user on /shop-admin/dashboard redirects to /shop-admin/login', async ({ page }) => {
  253 |     // No shop_owner_token cookie → proxy redirects to login
  254 |     await page.goto('/shop-admin/dashboard')
  255 |     // After redirect (proxy or server-side), should be on login
  256 |     expect(page.url()).toContain('/shop-admin/login')
  257 |   })
  258 | 
  259 |   test('shop-admin login page renders', async ({ page }) => {
  260 |     const response = await page.goto('/shop-admin/login')
  261 |     expect(response?.status()).toBe(200)
  262 |     await expect(page.locator('input[type="email"]')).toBeVisible()
  263 |     await expect(page.locator('input[type="password"]')).toBeVisible()
  264 |   })
  265 | 
  266 |   test('shop-admin register page renders', async ({ page }) => {
  267 |     const response = await page.goto('/shop-admin/register')
  268 |     expect(response?.status()).toBe(200)
  269 |     await expect(page.locator('input[type="email"]')).toBeVisible()
  270 |   })
  271 | })
  272 | 
  273 | // ─── E2E-07b: Fehler-Handling ────────────────────────────────────────────────
  274 | 
  275 | test.describe('E2E-07b: Fehler-Handling', () => {
  276 |   test('404 page for completely unknown route', async ({ page }) => {
  277 |     const response = await page.goto('/this/route/does/not/exist/at/all')
  278 |     expect(response?.status()).toBe(404)
  279 |   })
  280 | })
  281 | 
  282 | // ─── E2E-09: Customer Auth Pages ─────────────────────────────────────────────
  283 | 
  284 | test.describe('E2E-09: Customer Auth Pages', () => {
  285 |   test('unauthenticated /account redirects to /auth/login', async ({ page }) => {
  286 |     // No customer_token cookie → should redirect
  287 |     await page.goto('/account')
  288 |     await expect(page).toHaveURL(/\/auth\/login/)
  289 |   })
  290 | 
  291 |   test('login page renders email and password fields', async ({ page }) => {
  292 |     const response = await page.goto('/auth/login')
  293 |     expect(response?.status()).toBe(200)
> 294 |     await expect(page.locator('input[type="email"]')).toBeVisible()
      |                                                       ^ Error: expect(locator).toBeVisible() failed
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
  313 |       name: 'pundo_lang', value: 'ar', domain: 'localhost', path: '/',
  314 |     }])
  315 |     await page.goto('/auth/login')
  316 |     const dir = await page.locator('html').getAttribute('dir')
  317 |     expect(dir).toBe('rtl')
  318 |   })
  319 | 
  320 |   test('no JS errors on login page', async ({ page }) => {
  321 |     const errors: string[] = []
  322 |     page.on('pageerror', (err) => {
  323 |       if (!err.message.includes('Hydration failed')) errors.push(err.message)
  324 |     })
  325 |     await page.goto('/auth/login')
  326 |     await page.waitForLoadState('networkidle')
  327 |     expect(errors).toHaveLength(0)
  328 |   })
  329 | 
  330 |   test('no JS errors on signup page', async ({ page }) => {
  331 |     const errors: string[] = []
  332 |     page.on('pageerror', (err) => {
  333 |       if (!err.message.includes('Hydration failed')) errors.push(err.message)
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
  349 |       if (!err.message.includes('Hydration failed')) errors.push(err.message)
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
  360 |     // The section container always renders even for unauthenticated users
  361 |     const body = await page.content()
  362 |     // Either star buttons or a login link/button must exist
  363 |     const hasStars = await page.locator('[aria-label$="stars"]').count()
  364 |     const hasLoginHint = body.includes('login') || body.includes('Login') || body.includes('anmelden') || body.includes('Anmelden')
  365 |     expect(hasStars > 0 || hasLoginHint).toBe(true)
  366 |   })
  367 | 
  368 |   test('RTL: product page with Arabic sets dir=rtl', async ({ page }) => {
  369 |     await page.context().addCookies([{
  370 |       name: 'pundo_lang', value: 'ar', domain: 'localhost', path: '/',
  371 |     }])
  372 |     const errors: string[] = []
  373 |     page.on('pageerror', (err) => {
  374 |       if (!err.message.includes('Hydration failed')) errors.push(err.message)
  375 |     })
  376 |     await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
  377 |     await page.waitForLoadState('networkidle')
  378 |     const dir = await page.locator('html').getAttribute('dir')
  379 |     expect(dir).toBe('rtl')
  380 |     expect(errors).toHaveLength(0)
  381 |   })
  382 | })
  383 | 
  384 | test.describe('E2E-08: Karten-Routing-Links', () => {
  385 |   test('map popup shows 3 routing links with correct URLs after clicking a pin', async ({ page }) => {
  386 |     await page.goto('/search?q=cat')
  387 |     // Switch to map view
  388 |     await page.getByRole('button', { name: /map|karte/i }).click()
  389 |     // Wait for Leaflet to load
  390 |     await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 })
  391 |     // Click first marker
  392 |     await page.locator('.leaflet-marker-icon').first().click()
  393 |     // Wait for popup
  394 |     await page.waitForSelector('.leaflet-popup-content', { timeout: 5000 })
```