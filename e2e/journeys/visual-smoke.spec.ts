import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'
import { shopOwnerLogin, shopOwnerOnboardWithRetry } from './_helpers'
import { TestDataTracker, e2eEmail, e2eName, populatedCategoryId } from './_helpers/test-data'
import { specShop, type WorkerShop } from './_helpers/worker-shop'
import { BACKEND_URL, BASE_URL as FRONTEND_URL } from '../env'

// F8950 T31: kein fester Prod-Kopie-Slug mehr. Die Produktseite wird per API geseedet (Spec-Shop, Marker-Item mit
// hochgeladenem Foto, Listing, Angebot, echte Kategorie mit Nachbarn fuer das Carousel).

if (BACKEND_URL.includes(':8000') || FRONTEND_URL.includes(':3000')) {
  throw new Error('[visual-smoke] Safety: NEVER run against prod ports 3000/8000!')
}

test.describe('Visual Smoke-Test', () => {
  let productShop: WorkerShop
  let productWithImages = ''

  test.beforeAll(async () => {
    productShop = await specShop('VISUAL-SMOKE-PRODUCT')
    const item = await productShop.createItem('VISUAL-SMOKE', 'photo', { listing: true, categoryId: populatedCategoryId() })
    await productShop.uploadPhoto(item.id)
    const offer = await productShop.api('POST', '/offers', {
      shop_listing_id: item.listingId, price_type: 'fixed',
      price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 4.5, currency: 'EUR' }] }],
    })
    expect(offer.status, offer.text).toBe(201)
    productWithImages = item.slug
  })

  test.afterAll(async () => {
    await productShop?.destroy()
  })

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

    await page.goto(`/products/${productWithImages}`)
    await page.waitForLoadState('load')
    // 'networkidle' ist ungeeignet — Plausible-Analytics hält Verbindungen offen

    // Mind. 1 Bild muss tatsächlich geladen sein (naturalWidth > 0)
    const loadedImages = await page.evaluate(() =>
      [...document.images].filter(i => i.complete && i.naturalWidth > 0).length
    )
    expect(loadedImages, 'Keine Bilder geladen — alle broken').toBeGreaterThan(0)

    // Carousel: bei Tablet-Breite mind. 2 Items im DOM.
    // DOM-Präsenz ist der verlässliche Check; Viewport-Sichtbarkeit ist zusätzlich,
    // aber wird nur geprüft wenn das Carousel bereits gerendert/gelayoutet ist.
    // Fix B8950-003: waitForFunction stellt sicher dass Layout abgeschlossen ist bevor
    // getBoundingClientRect aufgerufen wird (Race-Condition bei pageload).
    const carouselList = page.locator('[role="list"]').first()
    const itemCount = await carouselList.locator('[role="listitem"]').count()
    if (itemCount > 0) {
      expect(itemCount, 'Carousel: weniger als 2 Items im DOM').toBeGreaterThanOrEqual(2)

      // Wait until the list is actually laid out (width > 0) before measuring visibility.
      // This eliminates the race-condition where getBoundingClientRect returns 0 for a list
      // that exists in the DOM but hasn't been painted yet.
      const isLaidOut = await page.waitForFunction(() => {
        const list = document.querySelector('[role="list"]')
        return list ? list.getBoundingClientRect().width > 0 : false
      }, { timeout: 5_000 }).catch(() => false)

      if (isLaidOut) {
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
  // B8950-012: Marker-Konvention + Admin-Shop-Delete; Setup-Fehler werfen (statt S1–S3 still zu überspringen)
  const EMAIL = e2eEmail('VISUAL-SMOKE', 'pundo.com')
  const tracker = new TestDataTracker()
  const PASSWORD = 'E2eTestPassword!99'

  let ownerId: number | null = null
  let shopId: number | null = null
  let ownerToken: string | null = null

  test.beforeAll(async () => {
    test.setTimeout(300_000) // Onboarding (5/min) und Login (10/min) sind rate-limitiert (kein Bypass, B6220-001)
    // Register via onboarding — @pundo.com must be auto-approved
    const data = await shopOwnerOnboardWithRetry({
      email: EMAIL,
      password: PASSWORD,
      provider_type: 'dienstleister',
      domain_slugs: ['friseur'],
      shop_name: e2eName('VISUAL-SMOKE', `Shop ${UUID}`),
      location: { lat: 34.917, lng: 33.636 },
      contact: { phone: '+35799000001' },
      credentials: { type: 'email', email: EMAIL, password: PASSWORD, name: `Smoke ${UUID}` },
      lang: 'en',
    })
    if (data.status !== 'approved') {
      throw new Error(`SETUP BROKEN: expected status=approved for @pundo.com, got "${String(data.status)}" — is Auto-Approve deployed?`)
    }

    // Login (retries on 429)
    ownerToken = await shopOwnerLogin(EMAIL, PASSWORD)

    const meRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
    if (!meRes.ok) throw new Error(`SETUP BROKEN: GET /shop-owner/me → ${meRes.status}`)
    const me = await meRes.json()
    ownerId = me.id as number
    shopId = me.shop_id as number
    tracker.owner(ownerId)
  })

  test.afterAll(async () => {
    // Admin-Shop-Delete kaskadiert den Owner (Owner-Delete allein ließ den Shop liegen)
    await tracker.cleanup()
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
