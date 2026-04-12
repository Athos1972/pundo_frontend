# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> E2E-19: Admin URL Structure >> admin/categories URL loads (redirects to login when unauth)
- Location: e2e/admin.spec.ts:373:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://127.0.0.1:3500/admin/categories", waiting until "load"

```

# Test source

```ts
  274 | 
  275 |   test('categories page has 3-field search: q + id + taxonomy_type', async ({ page }) => {
  276 |     const ok = await goAdminPageWithLogin(page, '/admin/categories')
  277 |     if (!ok) test.skip()
  278 |     await expect(page.locator('input[name="q"]')).toBeVisible()
  279 |     await expect(page.locator('input[name="id"]')).toBeVisible()
  280 |     await expect(page.locator('input[name="taxonomy_type"]')).toBeVisible()
  281 |   })
  282 | 
  283 |   test('categories page shows Tree/Table toggle links', async ({ page }) => {
  284 |     const ok = await goAdminPageWithLogin(page, '/admin/categories')
  285 |     if (!ok) test.skip()
  286 |     await expect(page.getByRole('link', { name: /^tree$/i })).toBeVisible()
  287 |     await expect(page.getByRole('link', { name: /^table$/i })).toBeVisible()
  288 |   })
  289 | 
  290 |   test('categories tree view has expand/collapse all buttons', async ({ page }) => {
  291 |     const ok = await goAdminPageWithLogin(page, '/admin/categories?view=tree')
  292 |     if (!ok) test.skip()
  293 |     // If the tree has categories, expand/collapse buttons must be present.
  294 |     // If the test DB has no categories, the tree shows "No categories." — skip gracefully.
  295 |     const noCats = await page.locator('text=No categories').count()
  296 |     if (noCats > 0) test.skip()
  297 |     await expect(
  298 |       page.getByRole('button', { name: /expand all|alle aufklappen/i })
  299 |     ).toBeVisible()
  300 |     await expect(
  301 |       page.getByRole('button', { name: /collapse all|alle zuklappen/i })
  302 |     ).toBeVisible()
  303 |   })
  304 | 
  305 |   test('categories table view renders when ?view=table', async ({ page }) => {
  306 |     const ok = await goAdminPageWithLogin(page, '/admin/categories?view=table')
  307 |     if (!ok) test.skip()
  308 |     expect(page.url()).toContain('view=table')
  309 |   })
  310 | 
  311 |   test('categories taxonomy_type search works', async ({ page }) => {
  312 |     const ok = await goAdminPageWithLogin(page, '/admin/categories?taxonomy_type=google&view=table')
  313 |     if (!ok) test.skip()
  314 |     expect(page.url()).toContain('taxonomy_type=google')
  315 |   })
  316 | })
  317 | 
  318 | // ── E2E-18: Admin Navigation ──────────────────────────────────────────────────
  319 | 
  320 | test.describe('E2E-18: Admin Navigation', () => {
  321 |   test.skip(() => isDevServer(), 'Authenticated admin tests require test stack (port 3002)')
  322 | 
  323 |   test('admin nav links are present when authenticated', async ({ page }) => {
  324 |     const ok = await goAdminPageWithLogin(page, '/admin/dashboard')
  325 |     if (!ok) test.skip()
  326 |     await expect(page.getByRole('link', { name: /shops/i }).first()).toBeVisible()
  327 |     await expect(page.getByRole('link', { name: /products|produkte/i }).first()).toBeVisible()
  328 |     await expect(page.getByRole('link', { name: /brands|marken/i }).first()).toBeVisible()
  329 |     await expect(page.getByRole('link', { name: /offers|angebote/i }).first()).toBeVisible()
  330 |     await expect(page.getByRole('link', { name: /categories|kategorien/i }).first()).toBeVisible()
  331 |   })
  332 | 
  333 |   test('admin dashboard shows category-attribute-definitions link', async ({ page }) => {
  334 |     const ok = await goAdminPageWithLogin(page, '/admin/dashboard')
  335 |     if (!ok) test.skip()
  336 |     // category-attribute-definitions is a dashboard entity card (not in the sidebar nav)
  337 |     await expect(page.getByRole('link', { name: /attribute def/i }).first()).toBeVisible()
  338 |   })
  339 | 
  340 |   test('admin nav shows logout button', async ({ page }) => {
  341 |     const ok = await goAdminPageWithLogin(page, '/admin/dashboard')
  342 |     if (!ok) test.skip()
  343 |     const logoutEl = page.getByRole('button', { name: /logout|sign out|ausloggen/i })
  344 |     await expect(logoutEl.first()).toBeVisible()
  345 |   })
  346 | })
  347 | 
  348 | // ── E2E-19: Admin ID Search Smoke Tests (unauthenticated — page structure only) ──
  349 | // These tests verify URL structure only; auth guard behavior is tested in E2E-12
  350 | 
  351 | test.describe('E2E-19: Admin URL Structure', () => {
  352 |   test('admin/shops URL loads (redirects to login when unauth)', async ({ page }) => {
  353 |     await page.goto('/admin/shops')
  354 |     // Either on shops or redirected to login — neither is a crash
  355 |     expect(page.url()).toMatch(/\/(admin\/shops|admin\/login)/)
  356 |   })
  357 | 
  358 |   test('admin/products URL loads (redirects to login when unauth)', async ({ page }) => {
  359 |     await page.goto('/admin/products')
  360 |     expect(page.url()).toMatch(/\/(admin\/products|admin\/login)/)
  361 |   })
  362 | 
  363 |   test('admin/brands URL loads (redirects to login when unauth)', async ({ page }) => {
  364 |     await page.goto('/admin/brands')
  365 |     expect(page.url()).toMatch(/\/(admin\/brands|admin\/login)/)
  366 |   })
  367 | 
  368 |   test('admin/offers URL loads (redirects to login when unauth)', async ({ page }) => {
  369 |     await page.goto('/admin/offers')
  370 |     expect(page.url()).toMatch(/\/(admin\/offers|admin\/login)/)
  371 |   })
  372 | 
  373 |   test('admin/categories URL loads (redirects to login when unauth)', async ({ page }) => {
> 374 |     await page.goto('/admin/categories')
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  375 |     expect(page.url()).toMatch(/\/(admin\/categories|admin\/login)/)
  376 |   })
  377 | 
  378 |   test('admin/categories?view=table URL is syntactically valid', async ({ page }) => {
  379 |     // Just navigate — no crash expected regardless of auth state
  380 |     const resp = await page.goto('/admin/categories?view=table')
  381 |     expect([200, 307, 404]).toContain(resp?.status())
  382 |   })
  383 | 
  384 |   test('admin/categories?view=tree URL is syntactically valid', async ({ page }) => {
  385 |     const resp = await page.goto('/admin/categories?view=tree')
  386 |     expect([200, 307, 404]).toContain(resp?.status())
  387 |   })
  388 | })
  389 | 
```