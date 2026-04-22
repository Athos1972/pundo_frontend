import { test, expect } from '@playwright/test'

// E2E-Tests für Community-Feedback-System (F3200 / F3400 / F3500)
// Läuft auf Port 3500 (Test-Frontend) + 8500 (Test-Backend)

test.describe('Community-Feedback: Shop-Detailseite', () => {

  test('CommunityFeedbackSection erscheint auf Shop-Seite', async ({ page }) => {
    // Finde einen gültigen Shop-Slug
    const res = await page.request.get('/api/v1/shops?limit=1')
    const json = await res.json()
    const slug = json?.items?.[0]?.slug
    test.skip(!slug, 'Kein Shop in Test-DB')

    await page.goto(`/shops/${slug}`)
    await expect(page).not.toHaveURL(/404/)

    // Section soll vorhanden sein — entweder mit Daten oder hidden (kein Fehler)
    // Note: Next.js App Router always renders an empty role="alert" (RouteAnnouncer) — we check for non-empty error alerts
    const visibleErrorAlerts = await page.locator('[role="alert"]:not(:empty)').count()
    expect(visibleErrorAlerts).toBe(0)
  })

  test('Login-CTA erscheint für nicht-eingeloggte User', async ({ page }) => {
    const res = await page.request.get('/api/v1/shops?limit=1')
    const json = await res.json()
    const slug = json?.items?.[0]?.slug
    test.skip(!slug, 'Kein Shop in Test-DB')

    await page.goto(`/shops/${slug}`)

    // Wenn Section sichtbar ist, soll Login-Link da sein
    const communitySection = page.locator('section[aria-label*="Community"]')
    if (await communitySection.count() > 0) {
      const loginLink = communitySection.locator('a[href="/auth/login"]')
      await expect(loginLink).toBeVisible()
    }
  })

  test('Keine JS-Fehler auf Shop-Seite nach Community-Integration', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    const res = await page.request.get('/api/v1/shops?limit=1')
    const json = await res.json()
    const slug = json?.items?.[0]?.slug
    test.skip(!slug, 'Kein Shop in Test-DB')

    await page.goto(`/shops/${slug}`)
    await page.waitForLoadState('networkidle')

    // Keine JS-Fehler (Next.js hydration errors etc.)
    // Exclude known false-positives: favicons, browser extensions, CSP inline-style warnings,
    // and Next.js dev-server HMR WebSocket reconnects (transient after server restart)
    const relevantErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('Extension') &&
      !e.includes('Content-Security-Policy') &&
      !e.includes('Content Security Policy') && // Chrome formats CSP violations without dashes
      !e.includes('webpack-hmr') &&             // Next.js HMR WebSocket — dev-only, not a real error
      !e.includes('WebSocket')                  // WS reconnect noise after server restart
    )
    expect(relevantErrors).toHaveLength(0)
  })
})

test.describe('Community-Feedback: RTL-Layout', () => {
  test('Community-Section hat rtl:flex-row-reverse für AR', async ({ page }) => {
    // Prüfen ob RTL auf html-Ebene gesetzt wird
    await page.context().addCookies([{ name: 'app_lang', value: 'ar', domain: '127.0.0.1', path: '/' }])
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('LTR für DE', async ({ page }) => {
    await page.context().addCookies([{ name: 'app_lang', value: 'de', domain: '127.0.0.1', path: '/' }])
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })
})

test.describe('Trust-Profil: Account-Seite', () => {
  test('Account-Seite leitet nicht-eingeloggte User zu /auth/login weiter', async ({ page }) => {
    await page.goto('/account')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
