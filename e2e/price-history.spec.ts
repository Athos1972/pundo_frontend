// e2e/price-history.spec.ts — F4900 Preisverlauf-Ausbau Phase 1
// Tests against Port 3500 (E2E test instance) — NEVER Port 3000.
//
// Gate: AC-1/AC-2/AC-3 (backend data quality) are BLOCKED until backend-fix is deployed.
// This spec covers AC-4 through AC-11 (frontend rendering, i18n, RTL).
//
// Products used:
//   SKULL_SLUG: ≥2 aggregated price_history points → stats block + sparkline render.
//               Ermittelt in beforeAll über die Backend-API (bevorzugt der frühere Skull-Artikel).
//               Das Backend liefert nur Crawls der letzten 90 Tage (product_query.py) — ohne
//               aktuelle Crawl-Daten in pundo_test gibt es kein solches Produkt, dann werden die
//               Preisverlauf-Tests mit Begründung übersprungen (kein UI-Weg, Verlauf anzulegen:
//               Shop-Owner-Offers haben kein crawled_at).
//   ZERO_SLUG:  0 price_history entries → no block rendered at all (AC-9)
// NOTE: pundo_test is prod-synced and prices drift, so assertions about which price
// is current/lowest are derived from live backend data (see AC-6 / AC-11), not hard-coded.
//
// Note on AC-8 (exactly 1 entry): tested via unit tests in PriceHistory.test.tsx (T9).
// Route-interception does not work for Server Component API calls (SSR happens server-side),
// and no real product with exactly 1 price_history entry was found in pundo_test.
// AC-8 is BLOCKED at E2E level; unit tests (which pass) cover this path.
//
// Note on CSP inline-style error: a pre-existing CSP violation exists on ALL product pages
// (including /de/) unrelated to this feature. RTL tests exclude this error category.

import { test, expect } from '@playwright/test'
// Production aggregation logic — single source of truth for the expected stats.
// Only a type import (@/types/api) lives inside; it is erased at compile time,
// so this resolves cleanly under Playwright without the @/ alias.
import { aggregatePriceHistory, computePriceStats } from '../src/lib/price-history'

// pundo_test is prod-synced (sync_prod_to_test.sh) and drifts over time, so any
// assertion about *which* price is current/lowest must be derived from live data,
// never hard-coded. This backend is the same instance the SSR page reads from.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'

// Test products
const PREFERRED_HISTORY_SLUG = 'aqua-aqua-della-skull-l-15cm-2'           // hatte früher ≥2 Einträge
const ZERO_SLUG  = 'rs-electrical-aquarium-hang-on-filter-rs-7000-2'      // 0 price_history entries
const HISTORY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000                        // Backend: last 90 days

let SKULL_SLUG = ''
let SKULL_STATS: ReturnType<typeof computePriceStats> = null
let NO_HISTORY_REASON = ''

type HistoryItem = Parameters<typeof aggregatePriceHistory>[0][number]

async function statsFor(request: import('@playwright/test').APIRequestContext, slug: string) {
  const res = await request.get(`${BACKEND_URL}/api/v1/products/by-slug/${encodeURIComponent(slug)}`)
  if (!res.ok()) return null
  const product = await res.json() as { price_history?: HistoryItem[] }
  const points = aggregatePriceHistory(product.price_history ?? [])
  return points.length >= 2 ? computePriceStats(points) : null
}

test.beforeAll(async ({ request }) => {
  const candidates = [PREFERRED_HISTORY_SLUG]
  let newestCrawl = 0
  for (let offset = 0; offset < 1000; offset += 100) {
    const res = await request.get(`${BACKEND_URL}/api/v1/products?limit=100&offset=${offset}`)
    if (!res.ok()) break
    const { items } = await res.json() as { items: Array<{ slug: string; best_offer?: { crawled_at?: string | null } | null }> }
    for (const it of items) {
      const crawled = it.best_offer?.crawled_at ? new Date(it.best_offer.crawled_at).getTime() : 0
      newestCrawl = Math.max(newestCrawl, crawled)
      if (crawled && Date.now() - crawled < HISTORY_WINDOW_MS) candidates.push(it.slug)
    }
    if (items.length < 100) break
  }
  for (const slug of candidates.slice(0, 60)) {
    const stats = await statsFor(request, slug)
    if (stats) { SKULL_SLUG = slug; SKULL_STATS = stats; break }
  }
  if (!SKULL_SLUG) {
    NO_HISTORY_REASON = 'pundo_test hat kein Produkt mit ≥2 Preisverlauf-Punkten im 90-Tage-Fenster '
      + `(neuester Crawl unter den ersten 1000 Produkten: ${newestCrawl ? new Date(newestCrawl).toISOString().slice(0, 10) : 'keiner'}) `
      + '— Testdaten-Drift, nicht per UI/API erzeugbar; Abdeckung über src/tests/PriceHistory.test.tsx'
    console.warn(`[price-history] ${NO_HISTORY_REASON}`)
  } else {
    console.log(`[price-history] Produkt mit Preisverlauf: ${SKULL_SLUG}`)
  }
})

/** Überspringt einen Test, der ein Produkt mit Preisverlauf braucht, wenn pundo_test keins hat. */
function requireHistory() {
  test.skip(!SKULL_SLUG, NO_HISTORY_REASON)
}

// ────────────────────────────────────────────────────────────
// AC-4: Stats block visible with ≥2 data points
// ────────────────────────────────────────────────────────────

test('AC-4: Stats block shows Lowest / Highest / Average with ≥2 price history entries', async ({ page }) => {
  requireHistory()
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
  requireHistory()
  await page.goto(`/en/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  // trendPct=0 → badge not rendered (per architecture §T4: trendPct !== 0 guard).
  // Daten driften: nur prüfen, wenn das gefundene Produkt tatsächlich trendPct=0 hat.
  test.skip(SKULL_STATS?.trendPct !== 0, `Produkt ${SKULL_SLUG} hat trendPct=${SKULL_STATS?.trendPct} ≠ 0`)
  // "since <date>" text should NOT appear
  await expect(page.getByText(/^since /i)).not.toBeVisible()
})

test('AC-5: Stats block renders price values with currency symbol', async ({ page }) => {
  requireHistory()
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

test('AC-6: Best-price notice visibility matches whether current price is the lowest seen', async ({ page, request }) => {
  requireHistory()
  // Derive the expectation from live data instead of assuming a fixed price set:
  // the notice must be shown iff the most recent aggregated price is the lowest ever seen.
  const stats = await statsFor(request, SKULL_SLUG)
  expect(stats, 'product must have aggregatable price history').not.toBeNull()

  await page.goto(`/en/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  const notice = page.getByText('Best price seen so far')
  if (stats!.isCurrentLowest) {
    await expect(notice).toBeVisible()
  } else {
    await expect(notice).not.toBeVisible()
  }
})

// ────────────────────────────────────────────────────────────
// AC-7: Sparkline SVG renders (temporal X positions, polyline present)
// ────────────────────────────────────────────────────────────

test('AC-7: Sparkline SVG with polyline renders inside price history section', async ({ page }) => {
  requireHistory()
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
  requireHistory()
  await page.goto(`/de/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('h2').filter({ hasText: 'Preisverlauf' })).toBeVisible()
  await expect(page.getByText('Tiefstpreis')).toBeVisible()
  await expect(page.getByText('Höchstpreis')).toBeVisible()
  await expect(page.getByText('Durchschnitt')).toBeVisible()
  await expect(page.getByText('Günstigster Preis über alle Shops')).toBeVisible()
})

test('AC-10: Russian locale shows localized price history strings', async ({ page }) => {
  requireHistory()
  await page.goto(`/ru/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('h2').filter({ hasText: 'История цен' })).toBeVisible()
  await expect(page.getByText('Минимум')).toBeVisible()
  await expect(page.getByText('Максимум')).toBeVisible()
})

test('AC-10: Arabic locale shows localized price history strings', async ({ page }) => {
  requireHistory()
  await page.goto(`/ar/products/${SKULL_SLUG}`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('h2').filter({ hasText: 'تاريخ الأسعار' })).toBeVisible()
  await expect(page.getByText('الأدنى')).toBeVisible()
})

test('AC-10: Hebrew locale shows localized price history strings', async ({ page }) => {
  requireHistory()
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

test('AC-11: RTL layout - Arabic price history block renders correctly', async ({ page, request }) => {
  requireHistory()
  const stats = await statsFor(request, SKULL_SLUG)
  expect(stats, 'product must have aggregatable price history').not.toBeNull()

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

  // Best-price notice in Arabic — shown iff current price is the lowest seen (data-driven)
  const notice = page.getByText('أفضل سعر لوحظ حتى الآن')
  if (stats!.isCurrentLowest) {
    await expect(notice).toBeVisible()
  } else {
    await expect(notice).not.toBeVisible()
  }

  // Scope label in Arabic
  await expect(page.getByText('أرخص سعر عبر جميع المتاجر')).toBeVisible()
})

test('AC-11: RTL layout - Hebrew price history block renders correctly', async ({ page }) => {
  requireHistory()
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
