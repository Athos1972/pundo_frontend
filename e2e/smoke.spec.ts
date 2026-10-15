/**
 * Visual Smoke-Test — Phase 3 (runs on EVERY e2e-tester invocation)
 *
 * Tests public pages that render without requiring backend data.
 * For backend-dependent pages (search, shops) a degraded-gracefully check is performed.
 * F8950 T17: dir-Matrix (RTL/LTR) lebt in language-smoke.spec.ts.
 */
import { test, expect } from '@playwright/test'
import { RUN_ID } from './journeys/_helpers/test-data'
import { BACKEND_URL as BACKEND } from './env'

test.describe('Visual Smoke-Test', { tag: '@smoke' }, () => {

  test('Startseite lädt und zeigt Hero', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')

    // Should render without JS errors
    const jsErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') jsErrors.push(msg.text())
    })

    // Logo visible
    const logo = page.locator('header img')
    await expect(logo).toBeVisible()

    // No uncaught JS errors
    expect(jsErrors.filter(e => !e.includes('net::ERR_') && !e.includes('Failed to fetch'))).toHaveLength(0)
  })

  test('Mobile Header: Search- und Shops-Icon sichtbar bei < 768px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForLoadState('load')

    // Mobile icon links have aria-label attributes; desktop nav links do NOT.
    // This selector exclusively targets the mobile icon buttons.
    // href is now lang-prefixed (e.g. /en/search), use contains-selector
    const mobileSearchIcon = page.locator('a[href*="/search"][aria-label]')
    const mobileShopsIcon = page.locator('a[href*="/shops"][aria-label]')

    await expect(mobileSearchIcon).toBeVisible()
    await expect(mobileShopsIcon).toBeVisible()
  })

  test('Desktop Header: Nav-Links sichtbar bei >= 768px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await page.waitForLoadState('load')

    // F8950 T15: vorher `navCount >= 0` (Tautologie). Jetzt: der Header rendert auf Desktop-Breite.
    await expect(page.locator('header')).toBeVisible()
  })

  test('Shops-Seite: lädt und zeigt Suchfeld', async ({ page }) => {
    await page.goto('/shops')
    await page.waitForLoadState('domcontentloaded')
    // Search input should be present (web-first: wartet auf Client-Rendering statt festem Timeout).
    // :visible, weil waehrend des Streamings kurz eine versteckte Kopie (<div hidden id="S:0">) im DOM liegt.
    const searchInput = page.locator('input[type="search"]:visible')
    await expect(searchInput).toBeVisible()

    // F8950 T15: vorher `headingCount >= 0` (Tautologie). Jetzt: genau eine H1 (SEO-Pflicht).
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('Shops-Seite: Suchfeld akzeptiert Text-Eingabe', async ({ page }) => {
    await page.goto('/shops')
    await page.waitForLoadState('domcontentloaded')

    const searchInput = page.locator('input[type="search"]:visible')
    await expect(searchInput).toBeVisible()

    await searchInput.fill('Bio')
    await expect(searchInput).toHaveValue('Bio')
  })

})

// ─── Avatar-Upload Smoke-Test ──────────────────────────────────────────────────
//
// Regression für: broken-image Bug (parents[3]-Pfadfehler in main.py +
// fehlendes /avatars/* Rewrite in next.config.ts).
//
// Flow:
//   1. Frischen @pundo.com-User via Backend-API anlegen (kein Turnstile, kein OTP)
//   2. customer_token Cookie manuell im Browser-Kontext setzen
//   3. Minimales PNG via /api/customer/.../avatar hochladen (Frontend-Proxy)
//   4. /account aufrufen — Server rendert Session mit neuer avatar_url
//   5. Header-Avatar prüfen: img sichtbar + naturalWidth > 0 (kein broken image)
//
// Ports: Frontend 3500 · Backend 8500 · DB: pundo_test
// Cleanup: Kunde mit Marker e2e-<run>-… → vom Teardown e2e/cleanup-run.ts (--run-id) gelöscht


// 10×10-Pixel PNG (PIL-generiert, img.load()-sicher) — für Avatar-Upload-Test
const MINIMAL_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAFUlEQVR4nGP8n2LEgBsw' +
  '4ZFjGLnSAPVyAal0iGFgAAAAAElFTkSuQmCC'

test.describe('Avatar-Upload Smoke-Test', { tag: '@smoke' }, () => {

  test('Registrierung → Avatar-Upload → korrekte Anzeige im Header', async ({ page, context }) => {
    // ── Schritt 1: Backend-Erreichbarkeit prüfen ──────────────────────────
    let backendOk = false
    try {
      const probe = await fetch(`${BACKEND}/api/v1/health`, { signal: AbortSignal.timeout(3000) }).catch(() =>
        fetch(`${BACKEND}/`, { signal: AbortSignal.timeout(3000) })
      )
      backendOk = probe.status < 500
    } catch { /* ignore */ }
    if (!backendOk) {
      test.skip(true, `Backend auf ${BACKEND} nicht erreichbar — Avatar-Smoke übersprungen`)
      return
    }

    // ── Schritt 2: @pundo.com-User registrieren ───────────────────────────
    // Direkt ans Backend (kein Turnstile), @pundo.com → auto-approve → kein OTP
    // B8950-012: Marker-Konvention (verankerter Selektor ^e2e-<run>-) → der Reporter räumt den Kunden nach grünem Lauf weg
    const email = `e2e-${RUN_ID}-smoke-avatar-${Date.now()}@pundo.com`
    const signupRes = await fetch(`${BACKEND}/api/v1/customer/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'SmokeTest!99', display_name: 'Smoke Avatar' }),
      signal: AbortSignal.timeout(15_000),
    })
    const signupBody = await signupRes.text()
    expect(signupRes.status, `Signup schlug fehl: ${signupBody}`).toBe(201)

    const signupData = JSON.parse(signupBody) as { is_verified: boolean }
    expect(signupData.is_verified, '@pundo.com-User sollte sofort verifiziert sein').toBe(true)

    // Cookie aus dem Set-Cookie-Header extrahieren
    const setCookieHeader = signupRes.headers.get('set-cookie') ?? ''
    const tokenMatch = setCookieHeader.match(/customer_token=([^;]+)/)
    expect(tokenMatch, 'customer_token fehlt im Signup-Response').toBeTruthy()
    const token = tokenMatch![1]

    // Cookie für den Browser-Kontext setzen (domain = Frontend-Host)
    await context.addCookies([{
      name: 'customer_token',
      value: token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }])

    // ── Schritt 3: Avatar hochladen (via Frontend-Proxy) ──────────────────
    // Der catch-all /api/customer/[...path] liest den Cookie server-seitig
    // und leitet mit Authorization-Header ans Backend weiter.
    const pngBuffer = Buffer.from(MINIMAL_PNG_B64, 'base64')
    const uploadRes = await page.request.post(
      '/api/customer/customer/auth/avatar',
      {
        multipart: {
          file: { name: 'avatar.png', mimeType: 'image/png', buffer: pngBuffer },
        },
      }
    )
    expect(uploadRes.status(), `Avatar-Upload schlug fehl: ${await uploadRes.text()}`).toBe(200)

    const uploadData = await uploadRes.json() as { avatar_url: string }
    expect(uploadData.avatar_url, 'avatar_url sollte mit /avatars/ beginnen')
      .toMatch(/^\/avatars\//)

    const avatarUrl = uploadData.avatar_url

    // ── Schritt 4: /account aufrufen ──────────────────────────────────────
    await page.goto('/account')
    await page.waitForLoadState('load')

    // Nach Login-Redirect prüfen — falls /auth/login erscheint, ist der Cookie nicht gesetzt
    const currentUrl = page.url()
    expect(currentUrl, 'Redirect zu Login — Cookie wurde nicht akzeptiert')
      .not.toContain('/auth/login')

    // ── Schritt 5: Avatar im Header prüfen ────────────────────────────────
    // Der Header liest session.user.avatar_url aus dem SessionProvider.
    // Die Server-Session (getCustomerSession) liefert nach dem Upload die neue URL.
    const headerAvatar = page.locator('header img[src*="/avatars/"]')
    await expect(headerAvatar, 'Avatar-Bild im Header nicht sichtbar').toBeVisible({ timeout: 8000 })

    // naturalWidth > 0 → Bild wurde tatsächlich geladen (kein broken image)
    const isLoaded = await headerAvatar.evaluate(
      (img: HTMLImageElement) => img.complete && img.naturalWidth > 0
    )
    expect(isLoaded, 'Avatar-Bild im Header ist broken (naturalWidth = 0)').toBe(true)

    // src stimmt mit der vom Backend zurückgelieferten URL überein
    const src = await headerAvatar.getAttribute('src')
    expect(src).toBe(avatarUrl)
  })

})
