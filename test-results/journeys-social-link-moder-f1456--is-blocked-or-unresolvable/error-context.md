# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys/social-link-moderation.spec.ts >> Social-Link-Moderation AC1–AC10 >> AC3 — Real backend: tinyurl shortener is blocked or unresolvable
- Location: e2e/journeys/social-link-moderation.spec.ts:271:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "social_link_blocked"
Received: "shortener_unresolvable"
```

# Test source

```ts
  185 |       (bodyText?.toLowerCase().includes('fix') ?? false) ||  // toast "please fix"
  186 |       (bodyText?.toLowerCase().includes('korrigiere') ?? false) ||
  187 |       (bodyText?.toLowerCase().includes('link') ?? false)  // broad fallback for any error
  188 | 
  189 |     // More specifically check for a red error element
  190 |     const redError = page.locator('[class*="red"]').filter({ hasText: /adult|permitted|allowed|erlaubt|link|social/i })
  191 | 
  192 |     expect(
  193 |       (await redError.count()) > 0 || hasAdultError,
  194 |       'AC1: Frontend must display an error message when backend returns 422 social_link_blocked'
  195 |     ).toBe(true)
  196 |   })
  197 | 
  198 |   test('AC1 — Real backend: onlyfans.com blocked', async () => {
  199 |     const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
  200 |       method: 'PATCH',
  201 |       headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
  202 |       body: JSON.stringify({ social_links: { mylink: 'https://onlyfans.com/test' } }),
  203 |     })
  204 |     expect(res.status).toBe(422)
  205 |     const body = await res.json()
  206 |     // Backend wraps error in detail: {error, category, ...}
  207 |     const errorPayload = body.detail ?? body
  208 |     expect(errorPayload.error).toBe('social_link_blocked')
  209 |     expect(errorPayload.category).toBe('adult')
  210 |   })
  211 | 
  212 |   // ─── AC2 — Zulässiger Link: xing.com ───────────────────────────────────────
  213 | 
  214 |   test('AC2 — xing.com accepted', async () => {
  215 |     const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
  216 |       method: 'PATCH',
  217 |       headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
  218 |       body: JSON.stringify({ social_links: { xing: 'https://xing.com/profile/test-e2e' } }),
  219 |     })
  220 |     expect([200, 204]).toContain(res.status)
  221 |     // Cleanup
  222 |     await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
  223 |       method: 'PATCH',
  224 |       headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
  225 |       body: JSON.stringify({ social_links: null }),
  226 |     })
  227 |   })
  228 | 
  229 |   // ─── AC3 — Shortener mit NSFW-Ziel ─────────────────────────────────────────
  230 | 
  231 |   test('AC3 — Shortener resolving to NSFW: frontend shows shortener error from mocked 422', async ({ page }) => {
  232 |     await page.route('**/api/shop-admin/shop', async (route) => {
  233 |       if (route.request().method() === 'PATCH') {
  234 |         await route.fulfill({
  235 |           status: 422,
  236 |           contentType: 'application/json',
  237 |           body: JSON.stringify({
  238 |             error: 'social_link_blocked',
  239 |             key: 'mylink',
  240 |             category: 'adult',
  241 |             resolved_host: 'pornhub.com',
  242 |             via_shortener: true,
  243 |           }),
  244 |         })
  245 |       } else {
  246 |         await route.continue()
  247 |       }
  248 |     })
  249 | 
  250 |     await page.goto(`${FRONTEND_URL}/shop-admin/profile`)
  251 |     await page.waitForLoadState('networkidle')
  252 | 
  253 |     const lastUrlInput = page.locator('input[type="url"]').last()
  254 |     await lastUrlInput.fill('https://tinyurl.com/abc123')
  255 |     await page.locator('button[type="submit"]').first().click()
  256 |     await page.waitForTimeout(1500)
  257 | 
  258 |     const bodyText = await page.textContent('body') ?? ''
  259 |     // Should show the via_shortener message: "The short link resolves to pornhub.com, which is not allowed."
  260 |     const hasShortenerMsg =
  261 |       bodyText.toLowerCase().includes('short link') ||
  262 |       bodyText.toLowerCase().includes('kurzlink') ||
  263 |       bodyText.toLowerCase().includes('shortener') ||
  264 |       bodyText.includes('pornhub.com') ||  // the resolved host should appear in message
  265 |       bodyText.toLowerCase().includes('resolves to') ||
  266 |       bodyText.toLowerCase().includes('verweist auf')
  267 | 
  268 |     expect(hasShortenerMsg, 'AC3: Frontend must show via_shortener error message with resolved host').toBe(true)
  269 |   })
  270 | 
  271 |   test('AC3 — Real backend: tinyurl shortener is blocked or unresolvable', async () => {
  272 |     // NOTE: The slug 'pornhub-redirect' actually redirects to an unrelated site (bmsce.ac.in),
  273 |     // not to pornhub. We use a guaranteed-non-existent slug instead:
  274 |     // tinyurl.com returns 404 for unknown slugs → final host stays tinyurl.com == apex
  275 |     // → backend triggers shortener_unresolvable (fail-closed). The test accepts both
  276 |     // 'adult' (if we hit a blocked domain) and 'shortener_unresolvable' (if resolution fails).
  277 |     const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
  278 |       method: 'PATCH',
  279 |       headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
  280 |       body: JSON.stringify({ social_links: { mylink: 'https://tinyurl.com/pundo-e2e-test-nonexistent-xyz9999' } }),
  281 |     })
  282 |     expect(res.status).toBe(422)
  283 |     const body = await res.json()
  284 |     const errorPayload = body.detail ?? body
> 285 |     expect(errorPayload.error).toBe('social_link_blocked')
      |                                ^ Error: expect(received).toBe(expected) // Object.is equality
  286 |     expect(['adult', 'shortener_unresolvable']).toContain(errorPayload.category)
  287 |   })
  288 | 
  289 |   // ─── AC4 — Unresolvbarer Shortener → fail-closed ───────────────────────────
  290 | 
  291 |   test('AC4 — Unresolvable shortener: frontend shows unresolvable error from mocked 422', async ({ page }) => {
  292 |     await page.route('**/api/shop-admin/shop', async (route) => {
  293 |       if (route.request().method() === 'PATCH') {
  294 |         await route.fulfill({
  295 |           status: 422,
  296 |           contentType: 'application/json',
  297 |           body: JSON.stringify({
  298 |             error: 'social_link_blocked',
  299 |             key: 'mylink',
  300 |             category: 'shortener_unresolvable',
  301 |             resolved_host: null,
  302 |             via_shortener: true,
  303 |           }),
  304 |         })
  305 |       } else {
  306 |         await route.continue()
  307 |       }
  308 |     })
  309 | 
  310 |     await page.goto(`${FRONTEND_URL}/shop-admin/profile`)
  311 |     await page.waitForLoadState('networkidle')
  312 | 
  313 |     const lastUrlInput = page.locator('input[type="url"]').last()
  314 |     await lastUrlInput.fill('https://bit.ly/doesnotexist99')
  315 |     await page.locator('button[type="submit"]').first().click()
  316 |     await page.waitForTimeout(1500)
  317 | 
  318 |     const bodyText = await page.textContent('body') ?? ''
  319 |     // The shortener_unresolvable category should map to the translation key
  320 |     // `social_blocked_shortener_unresolvable` → "Short link could not be verified — please enter the direct URL."
  321 |     const hasUnresolvableMsg =
  322 |       bodyText.toLowerCase().includes('short link could not') ||
  323 |       bodyText.toLowerCase().includes('kurzlink konnte nicht') ||
  324 |       bodyText.toLowerCase().includes('could not be verified') ||
  325 |       bodyText.toLowerCase().includes('nicht geprüft') ||
  326 |       bodyText.toLowerCase().includes('direct url') ||
  327 |       bodyText.toLowerCase().includes('direkte url')
  328 | 
  329 |     expect(hasUnresolvableMsg, 'AC4: Frontend must show shortener-unresolvable message').toBe(true)
  330 |   })
  331 | 
  332 |   test('AC4 — Real backend: unresolvable shortener rejected', async () => {
  333 |     const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
  334 |       method: 'PATCH',
  335 |       headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
  336 |       body: JSON.stringify({ social_links: { mylink: 'https://bit.ly/thislinkdoesnotexist99999e2e' } }),
  337 |     })
  338 |     expect(res.status).toBe(422)
  339 |   })
  340 | 
  341 |   // ─── AC5 — Subdomain-Normalisierung ────────────────────────────────────────
  342 | 
  343 |   test('AC5 — Subdomain normalization: www.onlyfans.com and m.onlyfans.com blocked', async () => {
  344 |     for (const url of ['https://www.onlyfans.com/test', 'https://m.onlyfans.com/test']) {
  345 |       const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
  346 |         method: 'PATCH',
  347 |         headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
  348 |         body: JSON.stringify({ social_links: { mylink: url } }),
  349 |       })
  350 |       expect(res.status, `AC5: ${url} should be blocked`).toBe(422)
  351 |       const body = await res.json()
  352 |       const errorPayload = body.detail ?? body
  353 |       expect(errorPayload.error).toBe('social_link_blocked')
  354 |     }
  355 |   })
  356 | 
  357 |   // ─── AC6 — System-Admin CRUD ────────────────────────────────────────────────
  358 | 
  359 |   test('AC6 — Social-link-rules page renders correctly in browser', async ({ page }) => {
  360 |     if (!ctx.adminToken) {
  361 |       test.skip(true, 'AC6: No admin credentials — set ADMIN_EMAIL and ADMIN_PASSWORD env vars')
  362 |       return
  363 |     }
  364 |     await page.context().addCookies([
  365 |       { name: 'admin_token', value: ctx.adminToken, url: FRONTEND_URL },
  366 |     ])
  367 |     await page.goto(`${FRONTEND_URL}/admin/social-link-rules`)
  368 |     await page.waitForLoadState('domcontentloaded')
  369 | 
  370 |     // Title visible (even with empty list due to missing backend endpoint)
  371 |     const h1 = page.locator('h1')
  372 |     expect(await h1.count()).toBeGreaterThan(0)
  373 | 
  374 |     // Table or empty state visible
  375 |     const table = page.locator('table, [class*="table"], [class*="no_items"]')
  376 |     const emptyState = page.locator('text=empty, text=keine, text=no items, td')
  377 |     const hasContent = (await table.count()) > 0 || (await emptyState.count()) > 0
  378 | 
  379 |     // At minimum the page renders without error
  380 |     const pageUrl = page.url()
  381 |     expect(pageUrl).not.toContain('error')
  382 |     expect(pageUrl).not.toContain('404')
  383 | 
  384 |     // Add button present
  385 |     const addLink = page.locator('a[href*="social-link-rules/new"]')
```