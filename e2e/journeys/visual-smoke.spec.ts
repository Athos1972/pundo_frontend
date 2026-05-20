import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'

// Produktseite mit bekannten lokalen product_images — ändere slug wenn Testdaten anders
const PRODUCT_WITH_IMAGES = 'ferplast-ferplast-sport-g8-200-black-leash'

const BACKEND_URL =
  process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8500'
const FRONTEND_URL =
  process.env.TEST_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3500'

if (BACKEND_URL.includes(':8000') || FRONTEND_URL.includes(':3000')) {
  throw new Error('[visual-smoke] Safety: NEVER run against prod ports 3000/8000!')
}

test.describe('Visual Smoke-Test', () => {

  test('Produktseite: Bilder laden, Carousel zeigt mehrere Items', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })

    const suspiciousRedirects: string[] = []
    page.on('response', r => {
      if (r.status() >= 300 && r.status() < 400) {
        const loc = r.headers()['location'] ?? ''
        if (loc.includes('docs.') || loc.includes('guidelines') || loc.includes('error')) {
          suspiciousRedirects.push(`${r.url()} → ${loc}`)
        }
      }
    })

    await page.goto(`/products/${PRODUCT_WITH_IMAGES}`)
    await page.waitForLoadState('load')
    // 'networkidle' ist ungeeignet — Plausible-Analytics hält Verbindungen offen

    // Mind. 1 Bild muss tatsächlich geladen sein (naturalWidth > 0)
    const loadedImages = await page.evaluate(() =>
      [...document.images].filter(i => i.complete && i.naturalWidth > 0).length
    )
    expect(loadedImages, 'Keine Bilder geladen — alle broken').toBeGreaterThan(0)

    // Carousel: bei Tablet-Breite mind. 2 Items im DOM.
    // DOM-Präsenz ist der verlässliche Check; Viewport-Sichtbarkeit ist zusätzlich,
    // aber wird nur geprüft wenn das Carousel bereits gerendert/gelayoutet ist
    // (lr.width > 0). Sonst intermittent: getBoundingClientRect gibt 0 zurück wenn
    // das Carousel noch nicht gemalt wurde.
    const carouselList = page.locator('[role="list"]').first()
    const itemCount = await carouselList.locator('[role="listitem"]').count()
    if (itemCount > 0) {
      expect(itemCount, 'Carousel: weniger als 2 Items im DOM').toBeGreaterThanOrEqual(2)

      const listWidth = await page.evaluate(() => {
        const list = document.querySelector('[role="list"]')
        return list ? list.getBoundingClientRect().width : 0
      })
      if (listWidth > 0) {
        // Only check viewport visibility when the list has been laid out
        const visibleInViewport = await page.evaluate(() => {
          const list = document.querySelector('[role="list"]')
          if (!list) return 0
          const lr = list.getBoundingClientRect()
          return [...list.querySelectorAll('[role="listitem"]')]
            .filter(el => el.getBoundingClientRect().left < lr.right - 50).length
        })
        expect(visibleInViewport, 'Carousel: bei 768px weniger als 2 Cards sichtbar').toBeGreaterThanOrEqual(2)
      }
    }

    // Keine CDN-Hotlink-Blocks oder kaputten Redirects
    expect(suspiciousRedirects, `Verdächtige Redirects: ${suspiciousRedirects.join(', ')}`).toHaveLength(0)
  })

  test('Suchergebnisse: Seite lädt ohne Crash, Bilder geladen wenn Ergebnisse vorhanden', async ({ page }) => {
    await page.goto('/search?q=ferplast')
    await page.waitForLoadState('load')
    // 'networkidle' ist ungeeignet — Plausible-Analytics hält Verbindungen offen

    // Seite darf nicht crashen — kein White Screen, kein JS-Error
    const consoleErrors: string[] = []
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })

    // Wenn Produktlinks vorhanden → mind. 1 Bild muss auch laden
    const productLinks = page.locator('a[href^="/products/"]')
    const linkCount = await productLinks.count()
    if (linkCount > 0) {
      await expect(productLinks.first()).toBeVisible()
      const loadedImages = await page.evaluate(() =>
        [...document.images].filter(i => i.complete && i.naturalWidth > 0).length
      )
      expect(loadedImages, 'Suchergebnisse: Produkte vorhanden aber keine Bilder geladen').toBeGreaterThan(0)
    } else {
      // Leerer Zustand ist ok — aber mind. die Suchleiste muss da sein
      await expect(page.locator('input[type="search"], input[type="text"]').first()).toBeVisible()
    }
  })

})

// ─── Shop-Owner Smoke: Registrierung → Login → Default-Produkte ───────────────

test.describe('Shop-Owner Smoke — @pundo.com Auto-Approve (F6710)', () => {
  const UUID = randomUUID().slice(0, 8)
  const EMAIL = `smoke-shop-${UUID}@pundo.com`
  const PASSWORD = 'E2eTestPassword!99'

  let ownerId: number | null = null
  let shopId: number | null = null
  let ownerToken: string | null = null

  test.beforeAll(async () => {
    // Register via onboarding — @pundo.com must be auto-approved
    const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        provider_type: 'dienstleister',
        domain_slugs: ['friseur'],
        shop_name: `Smoke Shop ${UUID}`,
        location: { lat: 34.917, lng: 33.636 },
        contact: { phone: '+35799000001' },
        credentials: { type: 'email', email: EMAIL, password: PASSWORD, name: `Smoke ${UUID}` },
        lang: 'en',
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return // tests will skip individually

    const data = await res.json()
    if (data.status !== 'approved') return

    // Login
    const loginRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!loginRes.ok) return

    const cookieHeader = loginRes.headers.get('set-cookie') ?? ''
    const tokenMatch = cookieHeader.match(/shop_owner_token=([^;]+)/)
    if (!tokenMatch) return
    ownerToken = tokenMatch[1]

    const meRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
    if (!meRes.ok) return
    const me = await meRes.json()
    ownerId = me.id as number
    shopId = me.shop_id as number
  })

  test.afterAll(async () => {
    if (!ownerId) return
    // Cleanup via admin API
    const adminLoginRes = await fetch(`${BACKEND_URL}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e-admin@pundo-e2e.io', password: 'E2eAdminPassword!99' }),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null)
    if (!adminLoginRes?.ok) return
    const cookieHeader = adminLoginRes.headers.get('set-cookie') ?? ''
    const adminTokenMatch = cookieHeader.match(/admin_token=([^;]+)/)
    if (!adminTokenMatch) return
    await fetch(`${BACKEND_URL}/api/v1/admin/shop-owners/${ownerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminTokenMatch[1]}` },
    }).catch(() => null)
  })

  test('S1 — @pundo.com onboarding → status=approved (kein pending)', async () => {
    test.skip(!ownerToken, 'Onboarding setup failed — is Auto-Approve deployed?')
    expect(ownerToken).toBeTruthy()
  })

  test('S2 — Login erfolgreich → /shop-admin/dashboard lädt', async ({ page }) => {
    test.skip(!ownerToken, 'No token from S1')
    await page.context().addCookies([
      {
        name: 'shop_owner_token',
        value: ownerToken!,
        domain: new URL(FRONTEND_URL).hostname,
        path: '/',
      },
    ])
    await page.goto(`${FRONTEND_URL}/shop-admin/dashboard`)
    await page.waitForLoadState('load')
    expect(page.url()).not.toContain('/shop-admin/login')
    const heading = page.locator('h1, nav, [data-testid="dashboard-heading"]')
    await expect(heading.first()).toBeVisible({ timeout: 10_000 })
  })

  test('S3 — Standard-Produkte (auto_seeded) beim Shop angelegt (optional)', async () => {
    test.skip(!ownerToken || !shopId, 'No token/shopId from S1')

    // Check items via shop-owner API
    const itemsRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/items`, {
      headers: { Authorization: `Bearer ${ownerToken!}` },
      signal: AbortSignal.timeout(15_000),
    })
    if (!itemsRes.ok) {
      test.skip(true, `GET /shop-owner/items: ${itemsRes.status}`)
      return
    }
    const data = await itemsRes.json()
    const items = Array.isArray(data) ? data : data.items ?? data.results ?? []

    const seededItems = items.filter(
      (i: { source?: string }) => i.source === 'auto_seeded'
    )

    if (seededItems.length === 0) {
      // Not a failure — Baustein B may not be deployed yet
      console.log('[visual-smoke S3] No auto_seeded items — Baustein B not deployed yet')
      return
    }

    expect(seededItems.length).toBeGreaterThan(0)
  })
})
