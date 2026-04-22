# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: community-feedback.spec.ts >> Community-Feedback: Shop-Detailseite >> Keine JS-Fehler auf Shop-Seite nach Community-Integration
- Location: e2e/community-feedback.spec.ts:40:7

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 0
Received length: 1
Received array:  ["WebSocket connection to 'ws://127.0.0.1:3500/_next/webpack-hmr?id=_UXxCityhlbhaHZBWXkw7' failed: Error during WebSocket handshake: net::ERR_INVALID_HTTP_RESPONSE"]
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
    - generic [ref=e20]:
      - button "Back" [ref=e21]:
        - img [ref=e22]
        - text: Back
      - generic [ref=e24]:
        - heading "PET BAZAAR" [level=1] [ref=e25]
        - paragraph [ref=e26]: Zakynthou 24, Larnaca
        - generic [ref=e27]:
          - link "+357 24 626650" [ref=e28] [cursor=pointer]:
            - /url: tel:+357 24 626650
            - img [ref=e29]
            - text: +357 24 626650
          - link "facebook.com" [ref=e31] [cursor=pointer]:
            - /url: https://www.facebook.com/p/Pet-Bazaar-Cyprus-100075907552527/
            - img [ref=e32]
            - text: facebook.com
      - generic [ref=e36]:
        - heading "Opening hours" [level=2] [ref=e37]
        - generic [ref=e38]:
          - generic [ref=e39]:
            - generic [ref=e40]: Monday
            - generic [ref=e41]: Closed
          - generic [ref=e42]:
            - generic [ref=e43]: Tuesday
            - generic [ref=e44]: Closed
          - generic [ref=e45]:
            - generic [ref=e46]: Wednesday
            - generic [ref=e47]: Closed
          - generic [ref=e48]:
            - generic [ref=e49]: Thursday
            - generic [ref=e50]: Closed
          - generic [ref=e51]:
            - generic [ref=e52]: Friday
            - generic [ref=e53]: Closed
          - generic [ref=e54]:
            - generic [ref=e55]: Saturday
            - generic [ref=e56]: Closed
          - generic [ref=e57]:
            - generic [ref=e58]: Sunday
            - generic [ref=e59]: Closed
          - generic [ref=e60]:
            - generic [ref=e61]: Public holiday
            - generic [ref=e62]: Closed
      - region "Reviews" [ref=e63]:
        - heading "Reviews" [level=2] [ref=e64]
        - group [ref=e65]:
          - generic "How do reviews work? ▾" [ref=e66] [cursor=pointer]:
            - generic [ref=e67]: How do reviews work?
            - generic [ref=e68]: ▾
        - generic [ref=e69]:
          - heading "Write a review" [level=3] [ref=e70]
          - paragraph [ref=e71]:
            - link "Sign in" [ref=e72] [cursor=pointer]:
              - /url: /auth/login
            - text: to write a review
        - paragraph [ref=e73]: No reviews yet. Be the first!
  - contentinfo [ref=e74]:
    - generic [ref=e75]:
      - navigation "legal" [ref=e76]:
        - link "About Us" [ref=e77] [cursor=pointer]:
          - /url: /about
        - link "Help" [ref=e78] [cursor=pointer]:
          - /url: /help
        - link "For Shops" [ref=e79] [cursor=pointer]:
          - /url: /for-shops
        - link "Contact" [ref=e80] [cursor=pointer]:
          - /url: /contact
        - link "Imprint" [ref=e81] [cursor=pointer]:
          - /url: /legal/imprint
        - link "Privacy Policy" [ref=e82] [cursor=pointer]:
          - /url: /legal/privacy
        - link "Terms of Service" [ref=e83] [cursor=pointer]:
          - /url: /legal/terms
      - paragraph [ref=e84]: © 2026 Buhl Consulting Ltd
  - button "AI Search" [ref=e85]:
    - img [ref=e86]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | // E2E-Tests für Community-Feedback-System (F3200 / F3400 / F3500)
  4  | // Läuft auf Port 3500 (Test-Frontend) + 8500 (Test-Backend)
  5  | 
  6  | test.describe('Community-Feedback: Shop-Detailseite', () => {
  7  | 
  8  |   test('CommunityFeedbackSection erscheint auf Shop-Seite', async ({ page }) => {
  9  |     // Finde einen gültigen Shop-Slug
  10 |     const res = await page.request.get('/api/v1/shops?limit=1')
  11 |     const json = await res.json()
  12 |     const slug = json?.items?.[0]?.slug
  13 |     test.skip(!slug, 'Kein Shop in Test-DB')
  14 | 
  15 |     await page.goto(`/shops/${slug}`)
  16 |     await expect(page).not.toHaveURL(/404/)
  17 | 
  18 |     // Section soll vorhanden sein — entweder mit Daten oder hidden (kein Fehler)
  19 |     // Note: Next.js App Router always renders an empty role="alert" (RouteAnnouncer) — we check for non-empty error alerts
  20 |     const visibleErrorAlerts = await page.locator('[role="alert"]:not(:empty)').count()
  21 |     expect(visibleErrorAlerts).toBe(0)
  22 |   })
  23 | 
  24 |   test('Login-CTA erscheint für nicht-eingeloggte User', async ({ page }) => {
  25 |     const res = await page.request.get('/api/v1/shops?limit=1')
  26 |     const json = await res.json()
  27 |     const slug = json?.items?.[0]?.slug
  28 |     test.skip(!slug, 'Kein Shop in Test-DB')
  29 | 
  30 |     await page.goto(`/shops/${slug}`)
  31 | 
  32 |     // Wenn Section sichtbar ist, soll Login-Link da sein
  33 |     const communitySection = page.locator('section[aria-label*="Community"]')
  34 |     if (await communitySection.count() > 0) {
  35 |       const loginLink = communitySection.locator('a[href="/auth/login"]')
  36 |       await expect(loginLink).toBeVisible()
  37 |     }
  38 |   })
  39 | 
  40 |   test('Keine JS-Fehler auf Shop-Seite nach Community-Integration', async ({ page }) => {
  41 |     const consoleErrors: string[] = []
  42 |     page.on('console', msg => {
  43 |       if (msg.type() === 'error') consoleErrors.push(msg.text())
  44 |     })
  45 | 
  46 |     const res = await page.request.get('/api/v1/shops?limit=1')
  47 |     const json = await res.json()
  48 |     const slug = json?.items?.[0]?.slug
  49 |     test.skip(!slug, 'Kein Shop in Test-DB')
  50 | 
  51 |     await page.goto(`/shops/${slug}`)
  52 |     await page.waitForLoadState('networkidle')
  53 | 
  54 |     // Keine JS-Fehler (Next.js hydration errors etc.)
  55 |     // Exclude known false-positives: favicons, browser extensions, CSP inline-style warnings (pre-existing)
  56 |     const relevantErrors = consoleErrors.filter(e =>
  57 |       !e.includes('favicon') &&
  58 |       !e.includes('Extension') &&
  59 |       !e.includes('Content-Security-Policy') &&
  60 |       !e.includes('Content Security Policy') // Chrome formats CSP violations without dashes
  61 |     )
> 62 |     expect(relevantErrors).toHaveLength(0)
     |                            ^ Error: expect(received).toHaveLength(expected)
  63 |   })
  64 | })
  65 | 
  66 | test.describe('Community-Feedback: RTL-Layout', () => {
  67 |   test('Community-Section hat rtl:flex-row-reverse für AR', async ({ page }) => {
  68 |     // Prüfen ob RTL auf html-Ebene gesetzt wird
  69 |     await page.context().addCookies([{ name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' }])
  70 |     await page.goto('/')
  71 |     const dir = await page.locator('html').getAttribute('dir')
  72 |     expect(dir).toBe('rtl')
  73 |   })
  74 | 
  75 |   test('LTR für DE', async ({ page }) => {
  76 |     await page.context().addCookies([{ name: 'app_lang', value: 'de', domain: '127.0.0.1', path: '/' }])
  77 |     await page.goto('/')
  78 |     const dir = await page.locator('html').getAttribute('dir')
  79 |     expect(dir).toBe('ltr')
  80 |   })
  81 | })
  82 | 
  83 | test.describe('Trust-Profil: Account-Seite', () => {
  84 |   test('Account-Seite leitet nicht-eingeloggte User zu /auth/login weiter', async ({ page }) => {
  85 |     await page.goto('/account')
  86 |     await expect(page).toHaveURL(/\/auth\/login/)
  87 |   })
  88 | })
  89 | 
```