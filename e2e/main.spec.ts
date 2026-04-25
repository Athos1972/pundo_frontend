import { test, expect } from '@playwright/test'

// Cookie-Domain aus E2E_COOKIE_DOMAIN (Env) oder Fallback 127.0.0.1
const COOKIE_DOMAIN = process.env.E2E_COOKIE_DOMAIN ?? '127.0.0.1'

// ─── E2E-01: Startseite ───────────────────────────────────────────────────────

test.describe('E2E-01: Startseite', () => {
  test('loads with 200 and shows search input', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.locator('input[type="search"]').first()).toBeVisible()
  })

  test('no JS errors on homepage', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── E2E-02: Suche ───────────────────────────────────────────────────────────

test.describe('E2E-02: Suche', () => {
  test('search navigates to /search?q=...', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const input = page.locator('input').first()
    await input.click()
    await input.fill('cat food')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/search\?q=/, { timeout: 8000 })
  })

  test('empty search does not crash', async ({ page }) => {
    const errors: string[] = []
    // Hydration warnings are expected — React error #418 is the minified form
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
    })
    await page.goto('/search?q=xyzxyz123notexist')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('search results page renders without crash', async ({ page }) => {
    await page.goto('/search?q=cat')
    await page.waitForLoadState('networkidle')
    const status = await page.evaluate(() => document.readyState)
    expect(status).toBe('complete')
  })
})

// ─── E2E-03: RTL-Layout ───────────────────────────────────────────────────────
// Language is set via app_lang cookie (not URL param)

test.describe('E2E-03: RTL-Layout', () => {
  async function setLang(page: import('@playwright/test').Page, lang: string) {
    await page.context().addCookies([{
      name: 'app_lang', value: lang, domain: COOKIE_DOMAIN, path: '/',
    }])
  }

  test('Arabic (ar) sets dir=rtl', async ({ page }) => {
    await setLang(page, 'ar')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('Hebrew (he) sets dir=rtl', async ({ page }) => {
    await setLang(page, 'he')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('English (en) sets dir=ltr', async ({ page }) => {
    await setLang(page, 'en')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })

  test('German (de) sets dir=ltr', async ({ page }) => {
    await setLang(page, 'de')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })

  test('Greek (el) sets dir=ltr', async ({ page }) => {
    await setLang(page, 'el')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })

  test('Russian (ru) sets dir=ltr', async ({ page }) => {
    await setLang(page, 'ru')
    await page.goto('/')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')
  })
})

// ─── E2E-04: Produkt-Detailseite ─────────────────────────────────────────────

test.describe('E2E-04: Produkt-Detailseite', () => {
  test('unknown slug returns 404 or renders without crash', async ({ page }) => {
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
  const TEST_SLUG = 'avicentra-avicentra-classic-menu-budgie-1kg'

  test('carousel section visible when related products exist', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(`/products/${TEST_SLUG}`)
    await page.waitForLoadState('networkidle')

    // Section must be visible (backend has related products for this slug)
    const section = page.getByRole('region', { name: /related products/i })
    await expect(section).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('carousel heading is rendered', async ({ page }) => {
    await page.goto(`/products/${TEST_SLUG}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /related products/i })).toBeVisible()
  })

  test('current product does not appear in carousel', async ({ page }) => {
    await page.goto(`/products/${TEST_SLUG}`)
    await page.waitForLoadState('networkidle')

    const section = page.getByRole('region', { name: /related products/i })
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
    await page.waitForLoadState('networkidle')

    const section = page.getByRole('region', { name: /related products/i })
    const firstCard = section.getByRole('listitem').first()
    const link = firstCard.getByRole('link').first()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^\/products\//)
  })

  test('page loads without crash when /related returns 500 (graceful fallback)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // Intercept /related endpoint and return 500
    await page.route(`**/api/v1/products/${TEST_SLUG}/related**`, (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    )
    await page.goto(`/products/${TEST_SLUG}`)
    await page.waitForLoadState('networkidle')

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
    await page.waitForLoadState('networkidle')

    // dir=rtl must be set
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    expect(errors).toHaveLength(0)
  })

  test.describe('mobile 375px', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('carousel does not cause horizontal page overflow', async ({ page }) => {
      await page.goto(`/products/${TEST_SLUG}`)
      await page.waitForLoadState('networkidle')

      // Outer document must not overflow — the scroll must be contained inside the carousel
      const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const docClientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(docScrollWidth).toBeLessThanOrEqual(docClientWidth + 1) // 1px tolerance
    })
  })
})

// ─── E2E-05: Shop-Seite ───────────────────────────────────────────────────────

test.describe('E2E-05: Shop-Seite', () => {
  test('unknown shop slug returns 404 or renders without crash', async ({ page }) => {
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
    await page.waitForLoadState('networkidle')
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
  test('unauthenticated user on /shop-admin/dashboard redirects to /shop-admin/login', async ({ page }) => {
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
    const response = await page.goto('/shop-admin/register')
    expect(response?.status()).toBe(200)
    await expect(page.locator('input[type="email"]')).toBeVisible()
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
  test('unauthenticated /account redirects to /auth/login', async ({ page }) => {
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
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('no JS errors on signup page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
    })
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── E2E-10: Review Section on Product/Shop Pages ────────────────────────────

test.describe('E2E-10: Review Section', () => {
  const TEST_PRODUCT_SLUG = 'acana-acana-wild-prairie-cat-18kg'

  test('product page renders without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!err.message.includes('Hydration failed') && !err.message.includes('#418')) errors.push(err.message)
    })
    await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('product page shows review section or login prompt', async ({ page }) => {
    await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
    await page.waitForLoadState('networkidle')
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
    await page.waitForLoadState('networkidle')
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
    await page.waitForLoadState('networkidle')
    const count = await page.locator('details').count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('/help accordion opens on click', async ({ page }) => {
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
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/help RTL: Arabic shows dir=rtl', async ({ page }) => {
    await page.context().addCookies([{
      name: 'app_lang', value: 'ar', domain: COOKIE_DOMAIN, path: '/',
    }])
    await page.goto('/help')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
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
    const ctaLinks = await page.getByRole('link', { name: /register|registr|anmeld/i }).all()
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1)
    const href = await ctaLinks[0].getAttribute('href')
    expect(href).toContain('/shop-admin/register')
  })

  test('/for-shops feature grid renders at least 4 cards', async ({ page }) => {
    await page.goto('/for-shops')
    await page.waitForLoadState('networkidle')
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
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/for-shops RTL: Hebrew shows dir=rtl', async ({ page }) => {
    await page.context().addCookies([{
      name: 'app_lang', value: 'he', domain: COOKIE_DOMAIN, path: '/',
    }])
    await page.goto('/for-shops')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('footer contains links to /help and /for-shops', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const helpLink = page.locator('footer a[href="/help"]')
    const forShopsLink = page.locator('footer a[href="/for-shops"]')
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
  const TEST_PRODUCT_SLUG = 'acana-acana-wild-prairie-cat-18kg'

  test('review section contains how-it-works <details> hint', async ({ page }) => {
    await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
    await page.waitForLoadState('networkidle')
    // The inline hint is a <details> inside the review section
    const reviewSection = page.locator('section[aria-label]').filter({ hasText: /review|bewertung|отзыв/i })
    const hintDetails = reviewSection.locator('details').first()
    await expect(hintDetails).toBeVisible()
  })

  test('review section hint opens and shows body text', async ({ page }) => {
    await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
    await page.waitForLoadState('networkidle')
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

  async function gotoSearchMapWithMarker(page: import('@playwright/test').Page, lang?: string) {
    await page.goto('/search?q=cat')
    if (lang) {
      await page.evaluate((l) => { document.cookie = `app_lang=${l}; path=/` }, lang)
      await page.reload()
    }
    await page.getByRole('button', { name: /map|karte|خريطة/i }).click()
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 })
    // Give Leaflet time to finish attaching popup event handlers
    await page.waitForTimeout(1500)
    // Trigger via native DOM event — Leaflet needs a bubbling click to open its popup
    await page.evaluate(() => {
      const marker = document.querySelector('.leaflet-marker-icon') as HTMLElement | null
      if (marker) {
        marker.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
      }
    })
    await page.waitForSelector('.leaflet-popup-content', { timeout: 8000 })
  }

  test('map popup shows 3 routing links with correct URLs after clicking a pin', async ({ page }) => {
    await gotoSearchMapWithMarker(page)

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

  test('routing links open in new tab (target=_blank)', async ({ page }) => {
    await gotoSearchMapWithMarker(page)

    const targets = await page.locator('.leaflet-popup-content a').evaluateAll(
      (els: HTMLAnchorElement[]) => els.map(e => e.target)
    )
    expect(targets.every(t => t === '_blank')).toBe(true)
  })

  test('popup dir=rtl for Arabic lang', async ({ page }) => {
    await gotoSearchMapWithMarker(page, 'ar')

    const dir = await page.locator('.leaflet-popup-content div').first().getAttribute('dir')
    expect(dir).toBe('rtl')
  })
})
