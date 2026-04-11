/**
 * E2E tests for price_type feature
 *
 * Tests what can be verified without specific backend data:
 * - Filter chip "With price only" renders on search page
 * - Filter chip toggles URL param ?with_price=1
 * - Filter chip renders with correct label in all 6 languages
 * - PriceFilterToggle renders on product detail page (via PriceFilterToggle)
 * - RTL: filter chip label is correct in AR + HE
 *
 * Tests requiring backend data with price_type != 'fixed' are marked
 * as SKIP_NEEDS_DATA and will pass vacuously.
 */
import { test, expect } from '@playwright/test'

// ─── E2E-P1: Filter chip renders on search page ──────────────────────────────

test.describe('price_type: Filter chip on search page', () => {
  test('renders "With price only" chip in EN', async ({ page }) => {
    await page.goto('/search')
    await expect(page.getByRole('button', { name: 'With price only' })).toBeVisible()
  })

  test('chip is inactive (not accent) by default', async ({ page }) => {
    await page.goto('/search')
    const chip = page.getByRole('button', { name: 'With price only' })
    const cls = await chip.getAttribute('class')
    expect(cls).toContain('border')
    expect(cls).not.toContain('bg-accent text-white')
  })

  test('clicking chip adds ?with_price=1 to URL', async ({ page }) => {
    await page.goto('/search')
    await page.getByRole('button', { name: 'With price only' }).click()
    await expect(page).toHaveURL(/with_price=1/)
  })

  test('clicking chip twice removes ?with_price=1', async ({ page }) => {
    await page.goto('/search')
    const chip = page.getByRole('button', { name: 'With price only' })
    await chip.click()
    await expect(page).toHaveURL(/with_price=1/)
    await chip.click()
    await expect(page).not.toHaveURL(/with_price=1/)
  })

  test('?with_price=1 chip shows accent style (active)', async ({ page }) => {
    await page.goto('/search?with_price=1')
    const chip = page.getByRole('button', { name: 'With price only' })
    const cls = await chip.getAttribute('class')
    expect(cls).toContain('bg-accent')
  })

  test('?with_price=1 persists after page reload', async ({ page }) => {
    await page.goto('/search?with_price=1')
    await page.reload()
    await expect(page).toHaveURL(/with_price=1/)
    const chip = page.getByRole('button', { name: 'With price only' })
    const cls = await chip.getAttribute('class')
    expect(cls).toContain('bg-accent')
  })

  test('no JS errors on search page with with_price=1', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/search?with_price=1')
    await page.waitForTimeout(1000)
    // React error #418 is a known hydration mismatch in Suspense+useSearchParams (pre-existing)
    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('404') && !e.includes('#418') && !e.includes('Hydration'))
    expect(critical).toHaveLength(0)
  })
})

// ─── E2E-P2: Filter chip in all 6 languages ──────────────────────────────────

const filterLabels: Record<string, string> = {
  en: 'With price only',
  de: 'Nur mit Preis',
  ru: 'Только с ценой',
  el: 'Μόνο με τιμή',
  ar: 'بسعر فقط',
  he: 'עם מחיר בלבד',
}

for (const [lang, label] of Object.entries(filterLabels)) {
  test(`filter_price_only label correct in ${lang}`, async ({ page }) => {
    await page.context().addCookies([{ name: 'pundo_lang', value: lang, domain: '127.0.0.1', path: '/' }])
    await page.goto('/search')
    await expect(page.getByRole('button', { name: label })).toBeVisible()
  })
}

// ─── E2E-P3: RTL layout with filter chip ─────────────────────────────────────

test.describe('price_type: RTL layout', () => {
  test('AR search page has dir=rtl and filter chip visible', async ({ page }) => {
    await page.context().addCookies([{ name: 'pundo_lang', value: 'ar', domain: '127.0.0.1', path: '/' }])
    await page.goto('/search')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    await expect(page.getByRole('button', { name: 'بسعر فقط' })).toBeVisible()
  })

  test('HE search page has dir=rtl and filter chip visible', async ({ page }) => {
    await page.context().addCookies([{ name: 'pundo_lang', value: 'he', domain: '127.0.0.1', path: '/' }])
    await page.goto('/search')
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')
    await expect(page.getByRole('button', { name: 'עם מחיר בלבד' })).toBeVisible()
  })
})

// ─── E2E-P4: Product detail page has PriceFilterToggle ───────────────────────

test.describe('price_type: PriceFilterToggle on product detail', () => {
  test('PriceFilterToggle button renders on a product page (if product exists)', async ({ page }) => {
    // First find a real product slug from the search results
    await page.goto('/search')
    await page.waitForTimeout(2000) // wait for client-side load
    const firstProductLink = page.locator('a[href^="/products/"]').first()
    const count = await firstProductLink.count()

    if (count === 0) {
      // No products in DB — skip
      test.skip()
      return
    }

    const href = await firstProductLink.getAttribute('href')
    await page.goto(href!)
    await expect(page.getByRole('button', { name: 'With price only' })).toBeVisible({ timeout: 5000 })
  })

  test('PriceFilterToggle ?with_price=1 on product page shows active chip', async ({ page }) => {
    // Find a real product slug
    await page.goto('/search')
    await page.waitForTimeout(2000)
    const firstProductLink = page.locator('a[href^="/products/"]').first()
    const count = await firstProductLink.count()

    if (count === 0) {
      test.skip()
      return
    }

    const href = await firstProductLink.getAttribute('href')
    await page.goto(`${href}?with_price=1`)
    const chip = page.getByRole('button', { name: 'With price only' })
    await expect(chip).toBeVisible()
    const cls = await chip.getAttribute('class')
    expect(cls).toContain('bg-accent')
  })
})

// ─── E2E-P5: Mobile responsive ───────────────────────────────────────────────

test.describe('price_type: Mobile responsive', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('filter chips visible on mobile without overflow', async ({ page }) => {
    await page.goto('/search')
    await expect(page.getByRole('button', { name: 'With price only' })).toBeVisible()
    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5) // 5px tolerance
  })
})
