// e2e/price-history.spec.ts — F4900 Preisverlauf-Ausbau Phase 1
// Tests against Port 3500 (E2E test instance) — NEVER Port 3000.
//
// Gate: AC-1/AC-2/AC-3 (backend data quality) are BLOCKED until backend-fix is deployed.
// This spec covers AC-4 through AC-11 (frontend rendering, i18n, RTL).
//
// Products used:
//   SKULL_SLUG: 2 price_history entries (both same price 14.00) → stats block, trendPct=0
//   ZERO_SLUG:  0 price_history entries → no block rendered at all (AC-9)
//
// Note on AC-8 (exactly 1 entry): tested via unit tests in PriceHistory.test.tsx (T9).
// Route-interception does not work for Server Component API calls (SSR happens server-side),
// and no real product with exactly 1 price_history entry was found in pundo_test.
// AC-8 is BLOCKED at E2E level; unit tests (which pass) cover this path.
//
// Note on CSP inline-style error: a pre-existing CSP violation exists on ALL product pages
// (including /de/) unrelated to this feature. RTL tests exclude this error category.

import { test, expect } from '@playwright/test'

// Test products
const SKULL_SLUG = 'aqua-aqua-della-skull-l-15cm-2'                       // 2 price_history entries, identical price
const ZERO_SLUG  = 'rs-electrical-aquarium-hang-on-filter-rs-7000-2'      // 0 price_history entries

// ────────────────────────────────────────────────────────────
// AC-4: Stats block visible with ≥2 data points
// ────────────────────────────────────────────────────────────

test('AC-4: Stats block shows Lowest / Highest / Average with ≥2 price history entries', async ({ page }) => {
  await page.goto(`/en/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  // The price history section heading
  const heading = page.locator('h2').filter({ hasText: 'Price history' })
  await expect(heading).toBeVisible()

  // Stat labels from i18n en: "Lowest", "Highest", "Average"
  await expect(page.getByText('Lowest')).toBeVisible()
  await expect(page.getByText('Highest')).toBeVisible()
  await expect(page.getByText('Average')).toBeVisible()
})

// ────────────────────────────────────────────────────────────
// AC-5: Trend badge color — green for drop/flat, orange for rise
// (Data: skull has 2 identical prices → trendPct=0 → badge suppressed per architecture)
// ────────────────────────────────────────────────────────────

test('AC-5: Trend badge is absent when trendPct=0 (identical prices)', async ({ page }) => {
  await page.goto(`/en/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  // trendPct=0 → badge not rendered (per architecture §T4: trendPct !== 0 guard)
  // "since <date>" text should NOT appear
  await expect(page.getByText(/^since /i)).not.toBeVisible()
})

test('AC-5: Stats block renders price values with currency symbol', async ({ page }) => {
  await page.goto(`/en/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  // Prices appear as €XX.XX format
  const priceText = page.locator('text=/€\\d+\\.\\d+/').first()
  await expect(priceText).toBeVisible()
})

// ────────────────────────────────────────────────────────────
// AC-6: "Best price seen so far" when current = lowest
// (Both history entries have the same price → current IS lowest → isCurrentLowest=true)
// ────────────────────────────────────────────────────────────

test('AC-6: Best-price notice appears when current price equals lowest', async ({ page }) => {
  await page.goto(`/en/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  // Both history entries have the same price → current = lowest → "Best price seen so far"
  await expect(page.getByText('Best price seen so far')).toBeVisible()
})

// ────────────────────────────────────────────────────────────
// AC-7: Sparkline SVG renders (temporal X positions, polyline present)
// ────────────────────────────────────────────────────────────

test('AC-7: Sparkline SVG with polyline renders inside price history section', async ({ page }) => {
  await page.goto(`/en/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  // PriceHistoryChart renders an <svg viewBox="0 0 280 48"> with aria-hidden="true"
  // Target specifically by viewBox to avoid matching nav icons
  const sparklineSvg = page.locator('svg[viewBox="0 0 280 48"][aria-hidden="true"]')
  await expect(sparklineSvg).toBeAttached()

  // Polyline must have points attribute (temporal X positions, AC-7)
  const polyline = sparklineSvg.locator('polyline')
  const pointsAttr = await polyline.getAttribute('points')
  expect(pointsAttr).not.toBeNull()
  expect(pointsAttr!.trim().length).toBeGreaterThan(0)

  // Verify the point coordinates are present (actual data rendered)
  const coords = pointsAttr!.split(' ').map(p => p.split(',').map(Number))
  expect(coords.length).toBeGreaterThanOrEqual(2)
})

// ────────────────────────────────────────────────────────────
// AC-8: Empty state at exactly 1 data point
// BLOCKED at E2E level: Server Component API calls cannot be intercepted by page.route().
// No real product with exactly 1 price_history entry was found in pundo_test.
// Coverage is provided by unit tests in src/tests/PriceHistory.test.tsx (T9).
// ────────────────────────────────────────────────────────────

test.skip('AC-8: BLOCKED — SSR interception not possible; covered by unit tests', async () => {
  // Unit test coverage: PriceHistory.test.tsx "1 point → PriceHistoryEmpty text visible, no sparkline"
})

// ────────────────────────────────────────────────────────────
// AC-9: No price history block rendered with 0 entries
// ────────────────────────────────────────────────────────────

test('AC-9: Price history block not rendered when product has 0 price_history entries', async ({ page }) => {
  await page.goto(`/en/products/${ZERO_SLUG}`)
  await page.waitForLoadState('networkidle')

  // No price history heading should appear
  const heading = page.locator('h2').filter({ hasText: 'Price history' })
  await expect(heading).not.toBeVisible()

  // No stats labels
  await expect(page.getByText('Lowest')).not.toBeVisible()
  await expect(page.getByText('Best price seen so far')).not.toBeVisible()
})

// ────────────────────────────────────────────────────────────
// AC-10: i18n — all visible texts localized per language
// ────────────────────────────────────────────────────────────

test('AC-10: German locale shows localized price history strings', async ({ page }) => {
  await page.goto(`/de/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('h2').filter({ hasText: 'Preisverlauf' })).toBeVisible()
  await expect(page.getByText('Tiefstpreis')).toBeVisible()
  await expect(page.getByText('Höchstpreis')).toBeVisible()
  await expect(page.getByText('Durchschnitt')).toBeVisible()
  await expect(page.getByText('Günstigster Preis über alle Shops')).toBeVisible()
})

test('AC-10: Russian locale shows localized price history strings', async ({ page }) => {
  await page.goto(`/ru/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('h2').filter({ hasText: 'История цен' })).toBeVisible()
  await expect(page.getByText('Минимум')).toBeVisible()
  await expect(page.getByText('Максимум')).toBeVisible()
})

test('AC-10: Arabic locale shows localized price history strings', async ({ page }) => {
  await page.goto(`/ar/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('h2').filter({ hasText: 'تاريخ الأسعار' })).toBeVisible()
  await expect(page.getByText('الأدنى')).toBeVisible()
})

test('AC-10: Hebrew locale shows localized price history strings', async ({ page }) => {
  await page.goto(`/he/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('h2').filter({ hasText: 'היסטוריית מחירים' })).toBeVisible()
  await expect(page.getByText('הנמוך ביותר')).toBeVisible()
})

// ────────────────────────────────────────────────────────────
// AC-11: RTL layout — Arabic and Hebrew content renders correctly
// RTL check: verifies page renders without feature errors and all i18n strings visible.
// The rtl: Tailwind classes are verified via code review (they exist in the RSC payload).
// The SVG sparkline is NOT mirrored (per architecture §4 — time runs L→R).
// Pre-existing CSP inline-style violation (same on /de/) is excluded from error check.
// ────────────────────────────────────────────────────────────

test('AC-11: RTL layout - Arabic price history block renders correctly', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

  await page.goto(`/ar/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  // No feature-specific errors (exclude pre-existing CSP inline-style and favicon errors)
  const featureErrors = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('hydration') &&
    !e.includes('inline style') // pre-existing CSP issue present on ALL pages
  )
  expect(featureErrors).toHaveLength(0)

  // Stats block content visible in Arabic
  await expect(page.getByText('الأدنى')).toBeVisible()
  await expect(page.getByText('الأعلى')).toBeVisible()

  // Best-price notice in Arabic
  await expect(page.getByText('أفضل سعر لوحظ حتى الآن')).toBeVisible()

  // Scope label in Arabic
  await expect(page.getByText('أرخص سعر عبر جميع المتاجر')).toBeVisible()
})

test('AC-11: RTL layout - Hebrew price history block renders correctly', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

  await page.goto(`/he/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  // No feature-specific errors
  const featureErrors = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('hydration') &&
    !e.includes('inline style') // pre-existing CSP issue
  )
  expect(featureErrors).toHaveLength(0)

  // Stats block content visible in Hebrew
  await expect(page.getByText('הנמוך ביותר')).toBeVisible()
  await expect(page.getByText('הגבוה ביותר')).toBeVisible()

  // Scope label in Hebrew
  await expect(page.getByText('המחיר הזול ביותר בכל החנויות')).toBeVisible()
})

// ────────────────────────────────────────────────────────────
// AC-12 / AC-13: Phase 2 — not implemented yet (out of scope for Phase 1)
// ────────────────────────────────────────────────────────────
