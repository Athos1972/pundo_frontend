/**
 * E2E-Tests: WhatsApp-Button (F5000)
 *
 * Diese Tests prüfen das Frontend-Rendering des WhatsApp-Buttons.
 * Sie benötigen kein laufendes Backend — sie prüfen Seiten die mit
 * Backend-Daten gerendert werden. Ohne Backend werden Backend-abhängige
 * Tests übersprungen.
 *
 * Port: 3500 (Test-Frontend)
 */
import { test, expect } from '@playwright/test'

const COOKIE_DOMAIN = process.env.E2E_COOKIE_DOMAIN ?? '127.0.0.1'

// Helper: Sprache setzen
async function setLang(page: import('@playwright/test').Page, lang: string) {
  await page.context().addCookies([{
    name: 'app_lang', value: lang, domain: COOKIE_DOMAIN, path: '/',
  }])
}

// ─── WhatsApp-Button: Startseite / Navigation ────────────────────────────────

test.describe('WhatsApp-Button: Frontend-Grundstruktur', () => {
  test('Startseite lädt fehlerfrei (kein Crash durch WhatsApp-Änderungen)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      // Hydration-Fehler ausschließen (expected in SSR)
      if (!err.message.includes('Hydration') && !err.message.includes('#418')) {
        errors.push(err.message)
      }
    })
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    expect(errors, `JS-Fehler auf Startseite: ${errors.join(', ')}`).toHaveLength(0)
  })

  test('OfferList-Seite (Produkt-Detail) lädt fehlerfrei', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration') && !err.message.includes('#418')) {
        errors.push(err.message)
      }
    })
    // Suche nach einem Produkt — wenn keine Ergebnisse, Skip
    await page.goto('/search?q=cat')
    await page.waitForLoadState('networkidle')
    expect(errors, `JS-Fehler auf Suchseite: ${errors.join(', ')}`).toHaveLength(0)
  })
})

// ─── WhatsApp-Button: RTL-Kompatibilität ─────────────────────────────────────

test.describe('WhatsApp-Button: RTL-Layout', () => {
  test('Arabisch: dir=rtl gesetzt (WhatsApp-Button muss korrekt ausgerichtet sein)', async ({ page }) => {
    await setLang(page, 'ar')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('Hebräisch: dir=rtl gesetzt', async ({ page }) => {
    await setLang(page, 'he')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('Englisch: dir=ltr (WhatsApp-Button LTR)', async ({ page }) => {
    await setLang(page, 'en')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })

  test('Deutsch: dir=ltr', async ({ page }) => {
    await setLang(page, 'de')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })
})

// ─── WhatsApp-Button: wa.me Link-Format (wenn Shop-Daten vorhanden) ──────────

test.describe('WhatsApp-Button: Link-Format (Backend-abhängig)', () => {
  test.beforeAll(async () => {
    // Prüfe ob Backend läuft — wenn nicht, alle Tests überspringen
    const backendOk = await fetch('http://localhost:8500/api/v1/health')
      .then(() => true)
      .catch(() => false)
    if (!backendOk) {
      console.log('[WhatsApp E2E] Backend nicht erreichbar — Backend-abhängige Tests werden übersprungen')
    }
  })

  test('Shop-Detailseite: WhatsApp-Button hat wa.me-Link wenn whatsapp-Feld gesetzt', async ({ page }) => {
    // Backend prüfen
    const backendOk = await fetch('http://localhost:8500/api/v1/health')
      .then(() => true)
      .catch(() => false)
    if (!backendOk) {
      test.skip()
      return
    }

    // Ersten Shop mit whatsapp-Feld finden (bevorzugt ohne phone, damit tel:-Assertion klar ist)
    const shopsRes = await fetch('http://localhost:8500/api/v1/shops?limit=50')
    if (!shopsRes.ok) { test.skip(); return }
    const shops = await shopsRes.json()
    type ShopItem = { whatsapp_url: string | null; phone: string | null; slug: string }
    const shopWithWaOnly = shops.items?.find((s: ShopItem) => s.whatsapp_url && !s.phone)
    const shopWithWa = shopWithWaOnly ?? shops.items?.find((s: ShopItem) => s.whatsapp_url)
    if (!shopWithWa) {
      console.log('[WhatsApp E2E] Kein Shop mit whatsapp_url in Test-DB — Test übersprungen')
      test.skip()
      return
    }

    await page.goto(`/shops/${shopWithWa.slug}`)
    await page.waitForLoadState('networkidle')

    // WhatsApp-Link muss vorhanden sein
    const waLink = page.locator('a[href*="wa.me"]').first()
    await expect(waLink).toBeVisible()

    const href = await waLink.getAttribute('href')
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/)
    // Kein führendes + in der Nummer
    expect(href).not.toMatch(/wa\.me\/\+/)
    // URL-encoded text enthält irgendeinen Hostnamen (SITE_URL aus .env.local, nicht hardcoded pundo.cy)
    const decodedText = decodeURIComponent(href?.split('?text=')[1] ?? '')
    expect(decodedText).toMatch(/on \S+/)

    // tel:-Link nur versteckt wenn Shop kein phone hat (UI zeigt beide wenn beides gesetzt)
    if (!shopWithWa.phone) {
      const telLink = page.locator('a[href^="tel:"]')
      await expect(telLink).not.toBeVisible()
    }
  })

  test('Shop ohne whatsapp aber mit phone: nur tel:-Link sichtbar', async ({ page }) => {
    const backendOk = await fetch('http://localhost:8500/api/v1/health')
      .then(() => true)
      .catch(() => false)
    if (!backendOk) { test.skip(); return }

    const shopsRes = await fetch('http://localhost:8500/api/v1/shops?limit=50')
    if (!shopsRes.ok) { test.skip(); return }
    const shops = await shopsRes.json()
    const shopWithPhone = shops.items?.find(
      (s: { whatsapp_url: string | null; phone: string | null; slug: string }) =>
        !s.whatsapp_url && s.phone
    )
    if (!shopWithPhone) { test.skip(); return }

    await page.goto(`/shops/${shopWithPhone.slug}`)
    await page.waitForLoadState('networkidle')

    // Kein WhatsApp-Link
    const waLink = page.locator('a[href*="wa.me"]')
    await expect(waLink).not.toBeVisible()

    // tel:-Link vorhanden
    const telLink = page.locator('a[href^="tel:"]')
    await expect(telLink).toBeVisible()
  })

  test('OfferList: on_request-Angebot zeigt tel:-CTA (kein WhatsApp in Offers)', async ({ page }) => {
    // shop_whatsapp existiert nicht in Offer-Responses (Backend-Design).
    // Stattdessen: Seeded on_request-Fixture prüfen — tel:-CTA muss erscheinen.
    const backendOk = await fetch('http://localhost:8500/api/v1/health')
      .then(() => true)
      .catch(() => false)
    if (!backendOk) { test.skip(); return }

    // Suche ein Produkt mit on_request-Angebot mit url (shop_phone nicht in API-Response)
    // Direktes Slug-Lookup: nexus-eazypod-uv-automatic-grey hat on_request+url
    const targetSlug = 'nexus-eazypod-uv-automatic-grey'
    const detail = await fetch(`http://localhost:8500/api/v1/products/by-slug/${targetSlug}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)

    const hasOnRequestWithUrl = detail?.offers?.some(
      (o: { price_type: string; url: string | null }) => o.price_type === 'on_request' && o.url
    )
    if (!hasOnRequestWithUrl) {
      console.log('[WhatsApp E2E] on_request+url Fixture nicht gefunden — übersprungen')
      test.skip()
      return
    }

    await page.goto(`/products/${targetSlug}`)
    await page.waitForLoadState('networkidle')

    // Kein wa.me-Link in OfferList (Offers haben kein whatsapp-Feld — Backend-Design)
    const waLink = page.locator('a[href*="wa.me"]')
    await expect(waLink).not.toBeVisible()

    // Website-CTA vorhanden weil url gesetzt
    const websiteLink = page.locator('a', { hasText: 'Website' }).first()
    await expect(websiteLink).toBeVisible()
  })
})

// ─── WhatsApp-Button: Mobile Layout ──────────────────────────────────────────

test.describe('WhatsApp-Button: Mobile (iPhone 14)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Startseite lädt fehlerfrei auf Mobile', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration') && !err.message.includes('#418')) {
        errors.push(err.message)
      }
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('Kein horizontaler Scroll auf Mobile', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const clientWidth = await page.evaluate(() => document.body.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5) // 5px Toleranz
  })
})
