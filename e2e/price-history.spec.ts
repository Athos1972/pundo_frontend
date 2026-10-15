// e2e/price-history.spec.ts — F4900 Preisverlauf-Ausbau Phase 1
// Tests against Port 3500 (E2E test instance) — NEVER Port 3000.
//
// Zwei-Ebenen-Prinzip (docs/e2e-testing.md, „Datenabhängige Tests“):
//
// 1. Funktionale Regression (läuft IMMER, kein Skip) gegen SYNTHETISCHE Fixtures.
//    Global Setup → `pundo_main_backend/scripts/prepare_e2e_db.py --seed-price-history` legt bei
//    jedem Lauf idempotent den Shop `e2e-price-history-shop` und die Items `e2e-price-history-*`
//    an und schreibt deren crawled_at relativ zu „jetzt“ neu (Backend liefert nur die letzten
//    90 Tage, product_query.py). Fälle:
//      falling  — 4 Punkte, aktueller Preis = Tiefstwert, Trend negativ
//      rising   — 3 Punkte, aktueller Preis ≠ Tiefstwert, Trend positiv
//      flat     — 2 gleiche Preise → trendPct = 0 (kein Badge)
//      single   — genau 1 Punkt → Empty-State (AC-8, früher BLOCKED mangels Daten)
//      outside  — einziger Crawl vor 120 Tagen → kein Block (AC-9 + 90-Tage-Grenze)
//    Erwartete Preise sind hier gespiegelt (PRICE_HISTORY_FIXTURES im Backend-Skript).
//
// 2. Realdaten-Check (bedingt): sucht per API auf 8500 ein Produkt aus der Prod-Kopie mit
//    Preisverlauf im 90-Tage-Fenster (synthetische `e2e-*` ausgeschlossen). Gibt es keins →
//    test.skip mit Begründung; sonst Kernprüfungen gegen das echte Produkt.
//
// Note on CSP inline-style error: a pre-existing CSP violation exists on ALL product pages
// (including /de/) unrelated to this feature. RTL tests exclude this error category.

import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
// Production aggregation logic — single source of truth for the expected stats.
// Only a type import (@/types/api) lives inside; it is erased at compile time,
// so this resolves cleanly under Playwright without the @/ alias.
import { aggregatePriceHistory, computePriceStats, type PriceStats } from '../src/lib/price-history'
import { BACKEND_URL } from './env'

if (BACKEND_URL.includes(':8000')) throw new Error('[price-history] Safety: NEVER use production port 8000!')

const HISTORY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000 // Backend: last 90 days
const SYNTHETIC_SLUG_RE = /^e2e-/i

// Mirror of PRICE_HISTORY_FIXTURES (pundo_main_backend/scripts/prepare_e2e_db.py), oldest → newest.
const FIXTURES = {
  falling: { slug: 'e2e-price-history-falling', prices: [24.99, 22.49, 19.99, 17.49], daysAgo: [80, 55, 30, 2] },
  rising: { slug: 'e2e-price-history-rising', prices: [14.99, 12.49, 16.99], daysAgo: [75, 40, 1] },
  flat: { slug: 'e2e-price-history-flat', prices: [9.99, 9.99], daysAgo: [60, 5] },
  single: { slug: 'e2e-price-history-single', prices: [7.5], daysAgo: [3] },
  outside: { slug: 'e2e-price-history-outside-window', prices: [] as number[], daysAgo: [] as number[] },
} as const
type FixtureKey = keyof typeof FIXTURES

type HistoryItem = Parameters<typeof aggregatePriceHistory>[0][number]
const STATS: Partial<Record<FixtureKey, PriceStats>> = {}

const eur = (v: number) => `€${v.toFixed(2)}`
const trendLabel = (pct: number, lang: string) =>
  `${pct < 0 ? '−' : '+'}${new Intl.NumberFormat(lang, { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(Math.abs(pct))} %`

async function fetchHistory(request: APIRequestContext, slug: string): Promise<HistoryItem[] | null> {
  const res = await request.get(`${BACKEND_URL}/api/v1/products/by-slug/${encodeURIComponent(slug)}`)
  if (!res.ok()) return null
  return ((await res.json()) as { price_history?: HistoryItem[] }).price_history ?? []
}

/** The price-history card: parent of the localized h2 heading. */
function section(page: Page, heading: string) {
  // :visible - waehrend des Streamings liegt kurz eine versteckte Kopie (<div hidden id="S:0">) im DOM (F8950 T22)
  return page.locator('h2:visible', { hasText: heading }).locator('..')
}

async function open(page: Page, lang: string, key: FixtureKey) {
  await page.goto(`/${lang}/products/${FIXTURES[key].slug}`)
  // F8950 T22: statt networkidle - der Preisverlauf kommt serverseitig mit der Produktantwort; die Produkt-
  // Ueberschrift ist da, sobald die Seite (inkl. gestreamter Segmente) steht. Danach sind auch die Abwesenheits-
  // Tests (AC-8/AC-9) aussagekraeftig.
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 })
  await page.waitForLoadState('load')
}

function featureErrors(errors: string[]) {
  return errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('hydration') &&
    !e.includes('inline style') // pre-existing CSP issue present on ALL pages
  )
}

// ════════════════════════════════════════════════════════════
// Ebene 1 — synthetische Fixtures (läuft immer)
// ════════════════════════════════════════════════════════════

test.describe('Preisverlauf — synthetische Fixtures', () => {
  test.beforeAll(async ({ request }) => {
    const hint = 'Preisverlauf-Fixture fehlt/ist veraltet — Global Setup prüfen bzw. '
      + '`cd pundo_main_backend && .venv/bin/python scripts/prepare_e2e_db.py --seed-price-history`'
    for (const key of Object.keys(FIXTURES) as FixtureKey[]) {
      const fx = FIXTURES[key]
      const history = await fetchHistory(request, fx.slug)
      expect(history, `${hint} (${fx.slug}: 404)`).not.toBeNull()
      // Fixture contract: exactly the seeded prices, in order, all inside the 90-day window
      expect(history!.map(h => Number(h.price)), `${hint} (${fx.slug}: Preise)`).toEqual([...fx.prices])
      for (const [i, h] of history!.entries()) {
        const ageDays = (Date.now() - new Date(h.crawled_at as string).getTime()) / 86_400_000
        expect(Math.abs(ageDays - fx.daysAgo[i]), `${hint} (${fx.slug}: crawled_at nicht relativ zu jetzt)`).toBeLessThan(2)
      }
      const stats = computePriceStats(aggregatePriceHistory(history!))
      if (stats) STATS[key] = stats
    }
  })

  // ── AC-4: Stats block visible with ≥2 data points ──────────
  test('AC-4: Stats block shows Lowest / Highest / Average with correct values', { tag: '@smoke' }, async ({ page }) => {
    await open(page, 'en', 'falling')
    const card = section(page, 'Price history')
    await expect(card).toBeVisible()
    await expect(card.getByText('Lowest')).toBeVisible()
    await expect(card.getByText('Highest')).toBeVisible()
    await expect(card.getByText('Average')).toBeVisible()

    const s = STATS.falling!
    expect(s.lowest).toBe(17.49)
    expect(s.highest).toBe(24.99)
    await expect(card.getByText(eur(s.lowest), { exact: true }).first()).toBeVisible()
    await expect(card.getByText(eur(s.highest), { exact: true })).toBeVisible()
    await expect(card.getByText(eur(s.average), { exact: true })).toBeVisible()
  })

  // ── AC-5: Trend badge + currency ───────────────────────────
  test('AC-5: Falling price shows a negative trend badge with "since" date', async ({ page }) => {
    await open(page, 'en', 'falling')
    const card = section(page, 'Price history')
    const s = STATS.falling!
    expect(s.trendPct).toBeLessThan(0)
    await expect(card.getByText(trendLabel(s.trendPct, 'en'), { exact: true })).toBeVisible()
    await expect(card.getByText(/^since /)).toBeVisible()
  })

  test('AC-5: Rising price shows a positive trend badge', async ({ page }) => {
    await open(page, 'en', 'rising')
    const card = section(page, 'Price history')
    const s = STATS.rising!
    expect(s.trendPct).toBeGreaterThan(0)
    await expect(card.getByText(trendLabel(s.trendPct, 'en'), { exact: true })).toBeVisible()
  })

  test('AC-5: Trend badge is absent when trendPct=0 (identical prices)', async ({ page }) => {
    await open(page, 'en', 'flat')
    const card = section(page, 'Price history')
    expect(STATS.flat!.trendPct).toBe(0)
    await expect(card.getByText('Lowest')).toBeVisible()
    await expect(card.getByText(/^since /)).toHaveCount(0)
    await expect(card.getByText(/^[+−]\d/)).toHaveCount(0)
  })

  test('AC-5: Stats block renders price values with currency symbol', async ({ page }) => {
    await open(page, 'en', 'rising')
    const card = section(page, 'Price history')
    // current price prominent + stats, all as €XX.XX
    await expect(card.getByText(eur(16.99), { exact: true }).first()).toBeVisible()
    await expect(card.getByText(eur(12.49), { exact: true })).toBeVisible()
    await expect(card.locator('text=/^€\\d+\\.\\d{2}$/')).toHaveCount(4) // current + lowest/highest/average
  })

  // ── AC-6: "Best price seen so far" iff current = lowest ────
  test('AC-6: Best-price notice shown when current price is the lowest seen', async ({ page }) => {
    expect(STATS.falling!.isCurrentLowest).toBe(true)
    await open(page, 'en', 'falling')
    await expect(section(page, 'Price history').getByText('Best price seen so far')).toBeVisible()
  })

  test('AC-6: Best-price notice hidden when current price is above the lowest', async ({ page }) => {
    expect(STATS.rising!.isCurrentLowest).toBe(false)
    await open(page, 'en', 'rising')
    const card = section(page, 'Price history')
    await expect(card.getByText('Lowest')).toBeVisible()
    await expect(card.getByText('Best price seen so far')).toHaveCount(0)
  })

  // ── AC-7: Sparkline with temporal X positions ──────────────
  test('AC-7: Sparkline polyline has one point per crawl, X proportional to time', async ({ page }) => {
    await open(page, 'en', 'falling')
    const svg = section(page, 'Price history').locator('svg[viewBox="0 0 280 48"][aria-hidden="true"]')
    await expect(svg).toBeAttached()
    const pointsAttr = await svg.locator('polyline').getAttribute('points')
    expect(pointsAttr).not.toBeNull()
    const xs = pointsAttr!.trim().split(' ').map(p => Number(p.split(',')[0]))
    const days = FIXTURES.falling.daysAgo
    expect(xs).toHaveLength(days.length)
    // W=280, PAD=4 → x = 4 + (t - tMin) / (tMax - tMin) * 272 ; days are uneven (25/25/28)
    const span = days[0] - days[days.length - 1]
    days.forEach((d, i) => expect(Math.abs(xs[i] - (4 + ((days[0] - d) / span) * 272))).toBeLessThan(1.5))
  })

  // ── AC-8: Empty state at exactly 1 data point ──────────────
  test('AC-8: Exactly one price point shows the empty state, no stats, no sparkline', async ({ page }) => {
    await open(page, 'en', 'single')
    const card = section(page, 'Price history')
    await expect(card).toBeVisible()
    await expect(card.getByText(eur(7.5), { exact: true })).toBeVisible()
    await expect(card.getByText(/No price change observed yet/)).toBeVisible()
    await expect(card.getByText('Lowest')).toHaveCount(0)
    await expect(card.locator('svg[viewBox="0 0 280 48"]')).toHaveCount(0)
  })

  // ── AC-9: No block with 0 entries (only crawl outside window) ──
  test('AC-9: Price history block not rendered when no crawl lies in the 90-day window', async ({ page }) => {
    await open(page, 'en', 'outside')
    await expect(page.locator('h1:visible')).toBeVisible() // page itself rendered
    await expect(page.locator('h2').filter({ hasText: 'Price history' })).toHaveCount(0)
    await expect(page.getByText('Best price seen so far')).toHaveCount(0)
    await expect(page.getByText(/No price change observed yet/)).toHaveCount(0)
  })

  // ── AC-10: i18n ────────────────────────────────────────────
  test('AC-10: German locale shows localized price history strings', async ({ page }) => {
    await open(page, 'de', 'falling')
    const card = section(page, 'Preisverlauf')
    await expect(card).toBeVisible()
    await expect(card.getByText('Tiefstpreis')).toBeVisible()
    await expect(card.getByText('Höchstpreis')).toBeVisible()
    await expect(card.getByText('Durchschnitt')).toBeVisible()
    await expect(card.getByText('Günstigster Preis über alle Shops')).toBeVisible()
    await expect(card.getByText('Bester bisher beobachteter Preis')).toBeVisible()
    await expect(card.getByText(/^seit /)).toBeVisible()
  })

  test('AC-10: Russian locale shows localized price history strings', async ({ page }) => {
    await open(page, 'ru', 'falling')
    const card = section(page, 'История цен')
    await expect(card).toBeVisible()
    await expect(card.getByText('Минимум')).toBeVisible()
    await expect(card.getByText('Максимум')).toBeVisible()
  })

  test('AC-10: Arabic locale shows localized price history strings', async ({ page }) => {
    await open(page, 'ar', 'falling')
    const card = section(page, 'تاريخ الأسعار')
    await expect(card).toBeVisible()
    await expect(card.getByText('الأدنى')).toBeVisible()
  })

  test('AC-10: Hebrew locale shows localized price history strings', async ({ page }) => {
    await open(page, 'he', 'falling')
    const card = section(page, 'היסטוריית מחירים')
    await expect(card).toBeVisible()
    await expect(card.getByText('הנמוך ביותר')).toBeVisible()
  })

  test('AC-10: Localized empty state (de) for exactly one price point', async ({ page }) => {
    await open(page, 'de', 'single')
    await expect(section(page, 'Preisverlauf').getByText(/Noch keine Preisänderung beobachtet/)).toBeVisible()
  })

  // ── AC-11: RTL layout ──────────────────────────────────────
  // The rtl: Tailwind classes are verified via code review; the sparkline is NOT mirrored
  // (per architecture §4 — time runs L→R).
  test('AC-11: RTL layout - Arabic price history block renders correctly', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    await open(page, 'ar', 'rising')
    expect(featureErrors(errors)).toHaveLength(0)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

    const card = section(page, 'تاريخ الأسعار')
    await expect(card.getByText('الأدنى')).toBeVisible()
    await expect(card.getByText('الأعلى')).toBeVisible()
    await expect(card.getByText('أرخص سعر عبر جميع المتاجر')).toBeVisible()
    // rising: current ≠ lowest → no best-price notice
    await expect(card.getByText('أفضل سعر لوحظ حتى الآن')).toHaveCount(0)
  })

  test('AC-11: RTL layout - Hebrew price history block renders correctly', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    await open(page, 'he', 'falling')
    expect(featureErrors(errors)).toHaveLength(0)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

    const card = section(page, 'היסטוריית מחירים')
    await expect(card.getByText('הנמוך ביותר')).toBeVisible()
    await expect(card.getByText('הגבוה ביותר')).toBeVisible()
    await expect(card.getByText('המחיר הזול ביותר בכל החנויות')).toBeVisible()
    // falling: current = lowest → best-price notice
    await expect(card.getByText('המחיר הטוב ביותר שנצפה עד כה')).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════
// Ebene 2 — Realdaten-Check (bedingt)
// ════════════════════════════════════════════════════════════

/** First real (non-synthetic) product with ≥2 aggregated price points among the shops' products. */
async function findRealHistory(request: APIRequestContext, shopSlugs: string[]) {
  for (const shopSlug of shopSlugs) {
    const detail = await request.get(`${BACKEND_URL}/api/v1/shops/by-slug/${encodeURIComponent(shopSlug)}`)
    if (!detail.ok()) continue
    const { id } = await detail.json() as { id: number }
    const list = await request.get(`${BACKEND_URL}/api/v1/products?shop_id=${id}&limit=50`)
    if (!list.ok()) continue
    const { items } = await list.json() as { items: Array<{ slug: string }> }
    for (const it of items.filter(i => !SYNTHETIC_SLUG_RE.test(i.slug)).slice(0, 25)) {
      const points = aggregatePriceHistory((await fetchHistory(request, it.slug)) ?? [])
      const stats = points.length >= 2 ? computePriceStats(points) : null
      if (stats) return { slug: it.slug, stats }
    }
  }
  return null
}

test.describe('Preisverlauf — Realdaten aus der Prod-Kopie (bedingt)', () => {
  let realSlug = ''
  let realStats: PriceStats | null = null
  let skipReason = ''

  test.beforeAll(async ({ request }) => {
    // Kandidaten: Shops, deren letzter Crawl im 90-Tage-Fenster liegt (sitemap/slugs liefert
    // last_scraped = MAX(offers.crawled_at) je Shop) → deren Produkte → erstes mit ≥2 Punkten.
    const res = await request.get(`${BACKEND_URL}/api/v1/sitemap/slugs`)
    expect(res.ok(), 'GET /api/v1/sitemap/slugs').toBe(true)
    const { shops } = await res.json() as { shops: Array<{ slug: string; last_scraped: string | null }> }
    const recent = shops
      .filter(s => !SYNTHETIC_SLUG_RE.test(s.slug) && s.last_scraped)
      .filter(s => Date.now() - new Date(s.last_scraped!).getTime() < HISTORY_WINDOW_MS)
      .sort((a, b) => b.last_scraped!.localeCompare(a.last_scraped!))
    const newest = shops.filter(s => !SYNTHETIC_SLUG_RE.test(s.slug) && s.last_scraped)
      .map(s => s.last_scraped!).sort().at(-1)

    const found = await findRealHistory(request, recent.slice(0, 15).map(s => s.slug))
    if (found) { realSlug = found.slug; realStats = found.stats }
    if (!realSlug) {
      skipReason = 'keine produktiven Preisdaten im 90-Tage-Fenster in pundo_test '
        + `(neuester Crawl eines echten Shops: ${newest ? newest.slice(0, 10) : 'keiner'}; `
        + `${recent.length} Shop(s) im Fenster geprüft) — funktionale Abdeckung über die synthetischen Fixtures`
      console.warn(`[price-history] Realdaten-Check übersprungen: ${skipReason}`)
    } else {
      console.log(`[price-history] Realdaten-Produkt mit Preisverlauf: ${realSlug}`)
    }
  })

  test('Realdaten: Abschnitt sichtbar, Stats plausibel (min ≤ avg ≤ max), Sparkline vorhanden', async ({ page }) => {
    test.skip(!realSlug, skipReason)
    const s = realStats!
    expect(s.lowest).toBeLessThanOrEqual(s.average)
    expect(s.average).toBeLessThanOrEqual(s.highest)
    expect(s.current).toBeGreaterThanOrEqual(s.lowest)
    expect(s.current).toBeLessThanOrEqual(s.highest)

    await page.goto(`/en/products/${realSlug}`)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 })
    const card = section(page, 'Price history')
    await expect(card).toBeVisible()
    await expect(card.getByText('Lowest')).toBeVisible()
    await expect(card.getByText(eur(s.lowest), { exact: true }).first()).toBeVisible()
    await expect(card.getByText(eur(s.highest), { exact: true }).first()).toBeVisible()
    await expect(card.locator('svg[viewBox="0 0 280 48"] polyline')).toBeAttached()
    const notice = card.getByText('Best price seen so far')
    await expect(notice).toHaveCount(s.isCurrentLowest ? 1 : 0)
  })
})

// ────────────────────────────────────────────────────────────
// AC-12 / AC-13: Phase 2 — not implemented yet (out of scope for Phase 1)
// ────────────────────────────────────────────────────────────
