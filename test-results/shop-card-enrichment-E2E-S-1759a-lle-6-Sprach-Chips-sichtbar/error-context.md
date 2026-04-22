# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shop-card-enrichment.spec.ts >> E2E-S7: Neue Filter-Chips >> alle 6 Sprach-Chips sichtbar
- Location: e2e/shop-card-enrichment.spec.ts:379:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'EL' })
Expected: visible
Error: strict mode violation: getByRole('button', { name: 'EL' }) resolved to 2 elements:
    1) <button class="flex-shrink-0 text-sm px-3 py-1 rounded-full border transition-colors bg-surface border-border text-text-muted hover:border-accent">Delivery</button> aka getByRole('button', { name: 'Delivery' })
    2) <button class="flex-shrink-0 text-sm px-3 py-1 rounded-full border transition-colors bg-surface border-border text-text-muted hover:border-accent">EL</button> aka getByRole('button', { name: 'EL', exact: true })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'EL' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
  - main [ref=e19]:
    - button "Back" [ref=e20]:
      - img [ref=e21]
      - text: Back
    - heading "Shops" [level=1] [ref=e23]
    - generic [ref=e25]:
      - generic [ref=e26]:
        - button "Open now" [ref=e27]
        - button "Parking" [ref=e28]
        - button "Delivery" [ref=e29]
        - button "Online only" [ref=e30]
      - generic [ref=e31]:
        - button "EL" [ref=e32]
        - button "EN" [ref=e33]
        - button "DE" [ref=e34]
        - button "RU" [ref=e35]
        - button "AR" [ref=e36]
        - button "HE" [ref=e37]
      - generic [ref=e38]:
        - generic [ref=e39]: "Distance:"
        - slider "Distance" [disabled] [ref=e40]: "25"
        - generic [ref=e41]: ≤ 25 km
  - contentinfo [ref=e47]:
    - generic [ref=e48]:
      - navigation "legal" [ref=e49]:
        - link "About Us" [ref=e50] [cursor=pointer]:
          - /url: /about
        - link "Help" [ref=e51] [cursor=pointer]:
          - /url: /help
        - link "For Shops" [ref=e52] [cursor=pointer]:
          - /url: /for-shops
        - link "Contact" [ref=e53] [cursor=pointer]:
          - /url: /contact
        - link "Imprint" [ref=e54] [cursor=pointer]:
          - /url: /legal/imprint
        - link "Privacy Policy" [ref=e55] [cursor=pointer]:
          - /url: /legal/privacy
        - link "Terms of Service" [ref=e56] [cursor=pointer]:
          - /url: /legal/terms
      - paragraph [ref=e57]: © 2026 Buhl Consulting Ltd
  - button "AI Search" [ref=e58]:
    - img [ref=e59]
```

# Test source

```ts
  284 |     await page.waitForLoadState('networkidle')
  285 | 
  286 |     // Avatar auf Detail-Seite: sollte größer sein
  287 |     // Prüfe dass ein img oder role="img" Div mit großer Größe vorhanden ist
  288 |     const detailAvatar = page.locator('[role="img"]').first()
  289 |     await expect(detailAvatar).toBeVisible()
  290 | 
  291 |     const box = await detailAvatar.boundingBox()
  292 |     // 80px Avatar (w-20 h-20 in Tailwind = 80px)
  293 |     // Toleranz: mind. 70px damit Test nicht fragil ist
  294 |     expect(box?.width).toBeGreaterThanOrEqual(70)
  295 |     expect(box?.height).toBeGreaterThanOrEqual(70)
  296 |   })
  297 | 
  298 |   test('Broken Favicon fällt auf Fallback-Initial zurück', async ({ page }) => {
  299 |     // Dieser Test prüft, dass onError Handler funktioniert
  300 |     // Falls ein Favicon-URL ungültig ist, sollte der Fallback-Circle sichtbar sein
  301 |     await page.goto('/shops')
  302 |     await page.waitForLoadState('networkidle')
  303 | 
  304 |     // Suche nach einem Avatar-Div mit Text (Fallback mit Initial)
  305 |     // Fallback-Avatar hat role="img" und eine Farben-Klasse + Text
  306 |     const avatarWithText = page.locator('div[role="img"]').filter({ hasText: /[A-Z?]/ }).first()
  307 |     if (await avatarWithText.isVisible()) {
  308 |       // Fallback ist vorhanden und sichtbar — kein Fehler
  309 |       expect(true).toBe(true)
  310 |     } else {
  311 |       // Falls keine Fallbacks sichtbar sind, sind die Favicons vermutlich geladen
  312 |       const images = page.locator('img[alt]')
  313 |       expect(await images.count()).toBeGreaterThanOrEqual(0)
  314 |     }
  315 |   })
  316 | 
  317 |   test('RTL (Arabisch): Avatar-Layout spiegelt sich korrekt', async ({ page }) => {
  318 |     await page.context().addCookies([{
  319 |       name: 'app_lang', value: 'ar', domain: COOKIE_DOMAIN, path: '/',
  320 |     }])
  321 |     await page.goto('/shops')
  322 |     await page.waitForLoadState('networkidle')
  323 | 
  324 |     const cards = page.locator('a[href^="/shops/"]')
  325 |     if (await cards.count() === 0) return
  326 | 
  327 |     // Prüfe dass HTML dir="rtl" gesetzt ist
  328 |     const htmlDir = await page.locator('html').getAttribute('dir')
  329 |     expect(htmlDir).toBe('rtl')
  330 | 
  331 |     // Avatar sollte trotzdem sichtbar sein
  332 |     const avatar = cards.first().locator('[role="img"], img').first()
  333 |     await expect(avatar).toBeVisible()
  334 |   })
  335 | })
  336 | 
  337 | // ─── E2E-S7: Neue Filter-Chips (Parking, Delivery, Online-only, Sprache) ──────
  338 | 
  339 | test.describe('E2E-S7: Neue Filter-Chips', () => {
  340 |   test('Parking-Chip sichtbar (EN)', async ({ page }) => {
  341 |     await setLang(page, 'en')
  342 |     await page.goto('/shops')
  343 |     await page.waitForLoadState('networkidle')
  344 |     await expect(page.getByRole('button', { name: 'Parking' })).toBeVisible()
  345 |   })
  346 | 
  347 |   test('Delivery-Chip sichtbar (EN)', async ({ page }) => {
  348 |     await setLang(page, 'en')
  349 |     await page.goto('/shops')
  350 |     await page.waitForLoadState('networkidle')
  351 |     await expect(page.getByRole('button', { name: 'Delivery' })).toBeVisible()
  352 |   })
  353 | 
  354 |   test('Online-only-Chip sichtbar (EN)', async ({ page }) => {
  355 |     await setLang(page, 'en')
  356 |     await page.goto('/shops')
  357 |     await page.waitForLoadState('networkidle')
  358 |     await expect(page.getByRole('button', { name: 'Online only' })).toBeVisible()
  359 |   })
  360 | 
  361 |   test('Parking-Chip sichtbar (DE: Parkplatz)', async ({ page }) => {
  362 |     await setLang(page, 'de')
  363 |     await page.goto('/shops')
  364 |     await page.waitForLoadState('networkidle')
  365 |     await expect(page.getByRole('button', { name: 'Parkplatz' })).toBeVisible()
  366 |   })
  367 | 
  368 |   test('Parking-Chip toggle: kein Crash beim Klick', async ({ page }) => {
  369 |     const errors: string[] = []
  370 |     page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  371 |     await setLang(page, 'en')
  372 |     await page.goto('/shops')
  373 |     await page.waitForLoadState('networkidle')
  374 |     await page.getByRole('button', { name: 'Parking' }).click()
  375 |     await page.waitForLoadState('networkidle')
  376 |     expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  377 |   })
  378 | 
  379 |   test('alle 6 Sprach-Chips sichtbar', async ({ page }) => {
  380 |     await setLang(page, 'en')
  381 |     await page.goto('/shops')
  382 |     await page.waitForLoadState('networkidle')
  383 |     for (const code of ['EL', 'EN', 'DE', 'RU', 'AR', 'HE']) {
> 384 |       await expect(page.getByRole('button', { name: code })).toBeVisible()
      |                                                              ^ Error: expect(locator).toBeVisible() failed
  385 |     }
  386 |   })
  387 | 
  388 |   test('Sprach-Chip toggle: kein Crash beim Klick (EL)', async ({ page }) => {
  389 |     const errors: string[] = []
  390 |     page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  391 |     await setLang(page, 'en')
  392 |     await page.goto('/shops')
  393 |     await page.waitForLoadState('networkidle')
  394 |     await page.getByRole('button', { name: 'EL' }).click()
  395 |     await page.waitForLoadState('networkidle')
  396 |     expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  397 |   })
  398 | 
  399 |   test('Filter-Chips RTL: Chips-Zeile hat rtl:flex-row-reverse bei ar', async ({ page }) => {
  400 |     await setLang(page, 'ar')
  401 |     await page.goto('/shops')
  402 |     await page.waitForLoadState('networkidle')
  403 |     // Check the chip row containing the parking button
  404 |     const parkingBtn = page.getByRole('button', { name: 'موقف سيارات' })
  405 |     await expect(parkingBtn).toBeVisible()
  406 |     const parent = parkingBtn.locator('..')
  407 |     const cls = await parent.getAttribute('class') ?? ''
  408 |     expect(cls).toContain('rtl:flex-row-reverse')
  409 |   })
  410 | })
  411 | 
```