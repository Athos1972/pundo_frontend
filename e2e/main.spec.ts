import { test, expect } from '@playwright/test'
import { waitForHydrated, waitForPageHydrated } from './journeys/_helpers/hydration'
import { BACKEND_URL } from './env'
import { specShop, type WorkerShop } from './journeys/_helpers/worker-shop'
import { populatedCategoryId } from './journeys/_helpers/test-data'

// F8950 T17: dir/lang-Matrix und Startseiten-Smoke leben in language-smoke.spec.ts (E2E-01, E2E-03, /help- und /for-shops-RTL hier gestrichen).
// Cookie-Domain aus E2E_COOKIE_DOMAIN (Env) oder Fallback 127.0.0.1
const COOKIE_DOMAIN = process.env.E2E_COOKIE_DOMAIN ?? '127.0.0.1'

// F8950 T31: kein fester Prod-Kopie-Slug mehr. Die Produktseiten-Tests seeden per API ein Marker-Item mit Listing und
// Festpreis-Angebot in einem eigenen Spec-Shop; die Kategorie ist eine echte mit >= 5 Items, damit "verwandte Produkte"
// (Items derselben Kategorie) existieren.
async function seedProduct(label: string): Promise<{ shop: WorkerShop; slug: string }> {
  const shop = await specShop(`MAIN-${label}`)
  const item = await shop.createItem('MAIN', label.toLowerCase(), { listing: true, categoryId: populatedCategoryId() })
  const offer = await shop.api('POST', '/offers', {
    shop_listing_id: item.listingId, price_type: 'fixed',
    price_tiers: [{ unit: 'per_piece', steps: [{ min_quantity: 1, price: 4.5, currency: 'EUR' }] }],
  })
  expect(offer.status, offer.text).toBe(201)
  return { shop, slug: item.slug }
}

// ─── E2E-02: Suche ───────────────────────────────────────────────────────────

test.describe('E2E-02: Suche', () => {
  test('search navigates to /search?q=...', { tag: '@smoke' }, async ({ page, context }) => {
    // Suppress LanguagePickerOverlay (blockiert sonst Klicks)
    await context.addCookies([{ name: 'app_lang', value: 'en', domain: COOKIE_DOMAIN, path: '/' }])
    await page.goto('/')
    // F8950 T22: statt networkidle - Enter vor der Hydration hat keinen Handler
    await waitForPageHydrated(page)
    const input = page.locator('input').first()
    await input.click()
    await input.fill('cat food')
    await input.press('Enter')
    // URL is now lang-prefixed: /en/search?q= (or similar lang)
    await expect(page).toHaveURL(/\/search\?q=/, { timeout: 8000 })
  })

  test('empty search does not crash', async ({ page }) => {
    const errors: string[] = []
    // Hydration warnings are expected — React error #418 is the minified form
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
    })
    await page.goto('/search?q=xyzxyz123notexist')
    await waitForPageHydrated(page)
    await expect(page.locator('p:visible', { hasText: 'No results found.' }).first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('search results page renders without crash', async ({ page }) => {
    await page.goto('/search?q=cat')
    await waitForPageHydrated(page)
    const status = await page.evaluate(() => document.readyState)
    expect(status).toBe('complete')
  })
})

// ─── E2E-04: Produkt-Detailseite ─────────────────────────────────────────────

test.describe('E2E-04: Produkt-Detailseite', () => {
  test('unknown slug returns 404 or renders without crash', { tag: '@smoke' }, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    const response = await page.goto('/products/this-product-does-not-exist-xyz')
    // Either 200 (with empty state) or 404 — not 500
    expect([200, 404]).toContain(response?.status())
    expect(errors).toHaveLength(0)
  })
})

// ─── E2E-04b: Related Products Carousel ──────────────────────────────────────

test.describe('E2E-04b: Related Products Carousel', () => {
  let TEST_SLUG = ''
  let seed: WorkerShop

  test.beforeAll(async () => {
    const seeded = await seedProduct('RELATED')
    seed = seeded.shop
    TEST_SLUG = seeded.slug
  })

  test.afterAll(async () => {
    await seed?.destroy()
  })

  test('carousel section visible when related products exist', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(`/products/${TEST_SLUG}`)
    await waitForPageHydrated(page)

    // Section must be visible (backend has related products for this slug)
    const section = page.getByRole('region', { name: /related products/i })
    await expect(section).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('carousel heading is rendered', async ({ page }) => {
    await page.goto(`/products/${TEST_SLUG}`)
    await expect(page.getByRole('heading', { name: /related products/i })).toBeVisible()
  })

  test('current product does not appear in carousel', async ({ page }) => {
    await page.goto(`/products/${TEST_SLUG}`)

    const section = page.getByRole('region', { name: /related products/i })
    // Erst abwarten, bis das Karussell gerendert ist (sonst waere die Link-Liste unten trivial leer)
    await expect(section).toBeVisible()
    // All links inside the carousel must NOT point back to the current product
    const carouselLinks = section.getByRole('link')
    const hrefs = await carouselLinks.evaluateAll((links) =>
      links.map((l) => (l as HTMLAnchorElement).href)
    )
    for (const href of hrefs) {
      expect(href).not.toContain(TEST_SLUG)
    }
  })

  test('carousel cards are clickable and link to products', async ({ page }) => {
    await page.goto(`/products/${TEST_SLUG}`)

    const section = page.getByRole('region', { name: /related products/i })
    const firstCard = section.getByRole('listitem').first()
    const link = firstCard.getByRole('link').first()
    const href = await link.getAttribute('href')
    // hrefs are now lang-prefixed: /en/products/... or /de/products/...
    expect(href).toMatch(/\/products\//)
  })

  test('page loads without crash when /related returns 500 (graceful fallback)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // Intercept /related endpoint and return 500
    await page.route(`**/api/v1/products/${TEST_SLUG}/related**`, (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    )
    await page.goto(`/products/${TEST_SLUG}`)
    await waitForPageHydrated(page)

    // Page must render (offers section visible), carousel absent
    await expect(page.getByRole('heading', { name: /all offers/i })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('RTL: carousel renders correctly in Arabic', async ({ page }) => {
    await page.context().addCookies([{
      name: 'app_lang', value: 'ar', domain: COOKIE_DOMAIN, path: '/',
    }])
    const errors: string[] = []
    // Hydration warnings are expected — #418 is the minified form
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
    })
    await page.goto(`/products/${TEST_SLUG}`)
    await waitForPageHydrated(page)

    // dir=rtl must be set
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    expect(errors).toHaveLength(0)
  })

  test.describe('mobile 375px', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('carousel does not cause horizontal page overflow', async ({ page }) => {
      await page.goto(`/products/${TEST_SLUG}`)
      // Karussell muss gerendert sein, bevor die Breite gemessen wird (sonst misst man die leere Seite)
      await expect(page.getByRole('region', { name: /related products/i })).toBeVisible()

      // Outer document must not overflow — the scroll must be contained inside the carousel
      const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const docClientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(docScrollWidth).toBeLessThanOrEqual(docClientWidth + 1) // 1px tolerance
    })
  })
})

// ─── E2E-05: Shop-Seite ───────────────────────────────────────────────────────

test.describe('E2E-05: Shop-Seite', () => {
  test('unknown shop slug returns 404 or renders without crash', { tag: '@smoke' }, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    const response = await page.goto('/shops/nonexistent-shop-xyz')
    expect([200, 404]).toContain(response?.status())
    expect(errors).toHaveLength(0)
  })
})

// ─── E2E-06: Responsive Mobile ───────────────────────────────────────────────

test.describe('E2E-06: Responsive Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('homepage has no horizontal overflow', async ({ page }) => {
    await page.goto('/')
    await waitForPageHydrated(page)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // 1px tolerance
  })

  test('search input is present and usable on mobile', async ({ page }) => {
    await page.goto('/')
    const input = page.locator('input').first()
    await expect(input).toBeVisible()
    const box = await input.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(36) // touch-friendly
  })
})

// ─── E2E-07: Auth Redirect ────────────────────────────────────────────────────

test.describe('E2E-07: Auth & Shop-Admin Redirect', () => {
  test('unauthenticated user on /shop-admin/dashboard redirects to /shop-admin/login', { tag: '@smoke' }, async ({ page }) => {
    // No shop_owner_token cookie → proxy redirects to login
    await page.goto('/shop-admin/dashboard')
    // After redirect (proxy or server-side), should be on login
    expect(page.url()).toContain('/shop-admin/login')
  })

  test('shop-admin login page renders', async ({ page }) => {
    const response = await page.goto('/shop-admin/login')
    expect(response?.status()).toBe(200)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('shop-admin register page renders', async ({ page }) => {
    // /shop-admin/register redirects to /shop-admin/onboarding (Quick-Onboarding Wizard)
    await page.goto('/shop-admin/register')
    await expect(page.locator('input, h1, h2, form, button').first()).toBeAttached()
    const url = page.url()
    expect(url).toMatch(/\/shop-admin\/(register|onboarding)/)
    // Onboarding wizard uses h2 and buttons (not h1/form/input) — check for any interactive content
    const hasContent = await page.locator('input, h1, h2, form, button').count()
    expect(hasContent).toBeGreaterThan(0)
  })
})

// ─── E2E-07b: Fehler-Handling ────────────────────────────────────────────────

test.describe('E2E-07b: Fehler-Handling', () => {
  test('404 page for completely unknown route', async ({ page }) => {
    const response = await page.goto('/this/route/does/not/exist/at/all')
    expect(response?.status()).toBe(404)
  })
})

// ─── E2E-09: Customer Auth Pages ─────────────────────────────────────────────

test.describe('E2E-09: Customer Auth Pages', () => {
  test('unauthenticated /account redirects to /auth/login', { tag: '@smoke' }, async ({ page }) => {
    // No customer_token cookie → should redirect
    await page.goto('/account')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('login page renders email and password fields', async ({ page }) => {
    const response = await page.goto('/auth/login')
    expect(response?.status()).toBe(200)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('signup page renders required fields', async ({ page }) => {
    const response = await page.goto('/auth/signup')
    expect(response?.status()).toBe(200)
    // Während der Hydration steht das Formular kurz doppelt im DOM (Next 16.3) → erst nach
    // Hydration prüfen, dann muss genau eine Instanz übrig sein.
    await waitForHydrated(page.locator('input[type="email"]'))
    await expect(page.locator('input[type="email"]')).toHaveCount(1)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('verify-email without params redirects to signup', async ({ page }) => {
    await page.goto('/auth/verify-email')
    // No email param → redirect to signup
    await expect(page).toHaveURL(/\/auth\/signup/)
  })

  test('login page RTL (Arabic)', async ({ page }) => {
    await page.context().addCookies([{
      name: 'app_lang', value: 'ar', domain: COOKIE_DOMAIN, path: '/',
    }])
    await page.goto('/auth/login')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('no JS errors on login page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
    })
    await page.goto('/auth/login')
    await waitForPageHydrated(page)
    expect(errors).toHaveLength(0)
  })

  test('no JS errors on signup page', async ({ page, context }) => {
    // Suppress LanguagePickerOverlay to prevent it from blocking networkidle
    await context.addCookies([{ name: 'app_lang', value: 'en', domain: COOKIE_DOMAIN, path: '/' }])
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
    })
    await page.goto('/auth/signup')
    // Kein networkidle: das Turnstile-Widget (B6220-003) hält eine blob:-Anfrage dauerhaft offen.
    // Submit-Button aktiv = hydratisiert + Captcha-Token erhalten (F8950 T22: das fruehere 1-s-Nachlaufen entfaellt;
    // Hydration-Fehler treten vor diesem Zustand auf).
    await page.waitForLoadState('load')
    await expect(page.locator('form button[type="submit"]:not([disabled])').first()).toBeVisible({ timeout: 20_000 })
    expect(errors).toHaveLength(0)
  })
})

// ─── E2E-10: Review Section on Product/Shop Pages ────────────────────────────

test.describe('E2E-10: Review Section', () => {
  let TEST_PRODUCT_SLUG = ''
  let seed: WorkerShop

  test.beforeAll(async () => {
    const seeded = await seedProduct('REVIEW')
    seed = seeded.shop
    TEST_PRODUCT_SLUG = seeded.slug
  })

  test.afterAll(async () => {
    await seed?.destroy()
  })

  test('product page renders without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
    })
    await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
    await waitForPageHydrated(page)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('product page shows review section or login prompt', async ({ page }) => {
    await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
    // Review-Bereich muss gerendert sein, bevor der DOM gelesen wird
    await expect(page.locator('section[aria-label]').filter({ hasText: /review|bewertung|отзыв/i }).first()).toBeVisible()
    // ReviewForm should be present (either login prompt or star input)
    const body = await page.content()
    const hasStars = await page.locator('[aria-label$="stars"]').count()
    const hasLoginHint = body.includes('/auth/login') || body.includes('Sign in') || body.includes('anmelden') || body.includes('Anmelden')
    expect(hasStars > 0 || hasLoginHint).toBe(true)
  })

  test('RTL: product page with Arabic sets dir=rtl', async ({ page }) => {
    await page.context().addCookies([{
      name: 'app_lang', value: 'ar', domain: COOKIE_DOMAIN, path: '/',
    }])
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
    })
    await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
    await waitForPageHydrated(page)
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    expect(errors).toHaveLength(0)
  })
})

// ─── E2E-11: Help & For-Shops Pages ─────────────────────────────────────────

test.describe('E2E-11: Help & For-Shops Pages', () => {
  test('/help returns 200 and shows FAQ heading', async ({ page }) => {
    const response = await page.goto('/help')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const h1 = await page.getByRole('heading', { level: 1 }).textContent()
    expect(h1).toMatch(/help|faq|hilfe|aide|ayuda/i)
  })

  test('/help renders at least one <details> accordion item', async ({ page }) => {
    await page.goto('/help')
    await expect(page.locator('details').first()).toBeAttached()
    const count = await page.locator('details').count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('/help accordion opens on click', async ({ page, context }) => {
    // Set app_lang cookie to prevent LanguagePickerOverlay from appearing (it renders
    // after ~2600ms delay and would cover the accordion, blocking Playwright's click)
    await context.addCookies([{ name: 'app_lang', value: 'en', domain: COOKIE_DOMAIN, path: '/' }])
    await page.goto('/help')
    const firstDetails = page.locator('details').first()
    const summary = firstDetails.locator('summary')
    // Initially closed
    await expect(firstDetails).not.toHaveAttribute('open')
    await summary.click()
    // Now open
    await expect(firstDetails).toHaveAttribute('open', '')
  })

  test('/help no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
    })
    await page.goto('/help')
    await waitForPageHydrated(page)
    expect(errors).toHaveLength(0)
  })

  test('/for-shops returns 200 and shows hero heading', async ({ page }) => {
    const response = await page.goto('/for-shops')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const h1 = await page.getByRole('heading', { level: 1 }).textContent()
    expect(h1!.length).toBeGreaterThan(5)
  })

  test('/for-shops has CTA link pointing to /shop-admin/register', async ({ page }) => {
    await page.goto('/for-shops')
    // Web-first: .all() does not wait, so a not-yet-rendered link flaked the count to 0.
    const cta = page.getByRole('link', { name: /register|registr|anmeld/i }).first()
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', /\/shop-admin\/register/)
  })

  test('/for-shops feature grid renders at least 4 cards', async ({ page }) => {
    await page.goto('/for-shops')
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible()
    // Feature cards are <div> elements inside the grid
    const headings = await page.getByRole('heading', { level: 3 }).count()
    expect(headings).toBeGreaterThanOrEqual(4)
  })

  test('/for-shops no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
    })
    await page.goto('/for-shops')
    await waitForPageHydrated(page)
    expect(errors).toHaveLength(0)
  })

  test('footer contains links to /help and /for-shops', async ({ page }) => {
    await page.goto('/')
    // hrefs are now lang-prefixed (e.g. /en/help) — use contains-selector
    const helpLink = page.locator('footer a[href*="/help"]')
    const forShopsLink = page.locator('footer a[href*="/for-shops"]')
    await expect(helpLink).toBeVisible()
    await expect(forShopsLink).toBeVisible()
  })

  test('/shop-admin/help redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/shop-admin/help')
    // Should redirect to login
    await expect(page).toHaveURL(/\/shop-admin\/login/)
  })
})

test.describe('E2E-11b: ReviewSection how-it-works hint', () => {
  let TEST_PRODUCT_SLUG = ''
  let seed: WorkerShop

  test.beforeAll(async () => {
    const seeded = await seedProduct('HINT')
    seed = seeded.shop
    TEST_PRODUCT_SLUG = seeded.slug
  })

  test.afterAll(async () => {
    await seed?.destroy()
  })

  test('review section contains how-it-works <details> hint', async ({ page, context }) => {
    // Suppress LanguagePickerOverlay
    await context.addCookies([{ name: 'app_lang', value: 'en', domain: COOKIE_DOMAIN, path: '/' }])
    await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
    // The inline hint is a <details> inside the review section
    const reviewSection = page.locator('section[aria-label]').filter({ hasText: /review|bewertung|отзыв/i })
    const hintDetails = reviewSection.locator('details').first()
    await expect(hintDetails).toBeVisible()
  })

  test('review section hint opens and shows body text', async ({ page, context }) => {
    // Suppress LanguagePickerOverlay
    await context.addCookies([{ name: 'app_lang', value: 'en', domain: COOKIE_DOMAIN, path: '/' }])
    await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
    await waitForPageHydrated(page)
    const reviewSection = page.locator('section[aria-label]').filter({ hasText: /review|bewertung|отзыв/i })
    const hintDetails = reviewSection.locator('details').first()
    const summary = hintDetails.locator('summary')
    await summary.click()
    await expect(hintDetails).toHaveAttribute('open', '')
  })
})

test.describe('E2E-08: Karten-Routing-Links', () => {
  // Map toggle button is mobile-only (md:hidden on desktop) — use mobile viewport
  test.use({ viewport: { width: 400, height: 900 } })

  async function gotoSearchMapWithMarker(
    page: import('@playwright/test').Page,
    request: import('@playwright/test').APIRequestContext,
    lang?: string,
  ) {
    // F8950 T22: der Aufruf ging ueber die baseURL (Frontend 3500, dort gibt es /api/v1/shops nicht) und lieferte nie
    // Treffer -> alle drei Karten-Tests liefen als stiller Skip. Jetzt gegen das Backend. pundo_test ist eine Prod-Kopie
    // mit geolokalisierten Shops; fehlen sie, ist das ein Setup-Fehler und kein Skip-Grund.
    const searchRes = await request.get(`${BACKEND_URL}/api/v1/shops?limit=1&lat=34.9009&lng=33.623&max_dist_km=100`)
    expect(searchRes.ok(), 'GET /api/v1/shops (Backend)').toBe(true)
    const searchData = await searchRes.json()
    // Die Antwort hat kein `total`-Feld (das hatte der alte Check gelesen -> immer 0), nur `items`.
    expect((searchData.items ?? []).length, 'geolokalisierte Shops in pundo_test (Karten-Marker)').toBeGreaterThan(0)

    // F8950 T22: Sprache ueber den URL-Praefix (/ar/...). Der fruehere Cookie-Wechsel + reload blieb wirkungslos, weil
    // /search auf /en/search umgeleitet wird und der Praefix die Sprache bestimmt (Popup blieb ltr).
    await page.goto(lang ? `/${lang}/search?q=cat` : '/search?q=cat')
    // F8950 T22: die Karte ist auf Mobile inzwischen immer sichtbar (kein "Map"-Umschalter mehr); der Klick bleibt
    // fuer Layouts mit Umschalter erhalten.
    const mapToggle = page.getByRole('button', { name: /^(map|karte|خريطة)$/i })
    if (await mapToggle.count() > 0) await mapToggle.first().click()
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 })
    // F8950 T22: statt festem 1,5-s-Timeout (Leaflet haengt die Popup-Handler erst nach dem Marker-Rendern an):
    // den Klick wiederholen, bis das Popup da ist. Trigger via native DOM event - Leaflet braucht einen
    // bubbling click, um das Popup zu oeffnen.
    await expect(async () => {
      await page.evaluate(() => {
        const marker = document.querySelector('.leaflet-marker-icon') as HTMLElement | null
        if (marker) {
          marker.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
        }
      })
      await expect(page.locator('.leaflet-popup-content')).toBeAttached({ timeout: 1_000 })
    }).toPass({ timeout: 15_000 })
  }

  test('map popup shows 3 routing links with correct URLs after clicking a pin', async ({ page, request }) => {
    await gotoSearchMapWithMarker(page, request)

    const links = page.locator('.leaflet-popup-content a')
    await expect(links).toHaveCount(3)

    const hrefs = await links.evaluateAll((els: HTMLAnchorElement[]) => els.map(e => e.href))
    expect(hrefs[0]).toContain('google.com/maps/dir/')
    expect(hrefs[0]).toContain('destination=')
    expect(hrefs[1]).toContain('maps.apple.com')
    expect(hrefs[1]).toContain('daddr=')
    expect(hrefs[2]).toContain('waze.com/ul')
    expect(hrefs[2]).toContain('navigate=yes')
  })

  test('routing links open in new tab (target=_blank)', async ({ page, request }) => {
    await gotoSearchMapWithMarker(page, request)

    const targets = await page.locator('.leaflet-popup-content a').evaluateAll(
      (els: HTMLAnchorElement[]) => els.map(e => e.target)
    )
    expect(targets.every(t => t === '_blank')).toBe(true)
  })

  test('popup dir=rtl for Arabic lang', async ({ page, request }) => {
    await gotoSearchMapWithMarker(page, request, 'ar')

    const dir = await page.locator('.leaflet-popup-content div').first().getAttribute('dir')
    expect(dir).toBe('rtl')
  })
})
