// src/lib/price-history.ts — T1
// Pure utility functions for price-history aggregation & statistics.
// No React imports. Framework-free and fully testable.

import type { PriceHistoryItem } from '@/types/api'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface PricePoint {
  /** Numeric price (already parsed and validated) */
  price: number
  /** Unix epoch in milliseconds */
  crawledAt: number
}

export interface PriceStats {
  lowest: number
  highest: number
  average: number
  current: number
  first: number
  /** ISO date string of the earliest crawl in the aggregated series */
  firstSeenAt: string
  /** Trend percentage relative to the first observed price.
   *  Negative = price dropped (good for consumer), positive = price rose. */
  trendPct: number
  /** True when current price equals the lowest ever observed. */
  isCurrentLowest: boolean
}

// ────────────────────────────────────────────────────────────
// T1-A: aggregatePriceHistory
// ────────────────────────────────────────────────────────────

/**
 * Given a raw `PriceHistoryItem[]` from the API:
 * 1. Filters out items with unparseable prices (NaN / non-finite).
 * 2. Sorts ascending by `crawled_at`.
 * 3. For each distinct timestamp, keeps only the **cheapest** price across
 *    all shops (Phase-1 single-line aggregation). This mirrors the design
 *    decision: "günstigster Preis je Zeitpunkt über alle Shops" (Phase 1).
 *
 * NOTE: The function sorts by `crawled_at` itself (defensive — backend sort
 * is not guaranteed during the Backend-Fix transition). Dedup per day/shop
 * is NOT done here — that is the backend's responsibility (AC-2). If the
 * backend sends duplicate timestamps, those will appear as separate points
 * only if they have different epoch-ms values; identical timestamps collapse
 * to one point (minimum price wins).
 */
export function aggregatePriceHistory(items: PriceHistoryItem[]): PricePoint[] {
  // Step 1: parse & filter
  const valid = items
    .map(item => {
      const price = parseFloat(item.price)
      const crawledAt = new Date(item.crawled_at).getTime()
      return { price, crawledAt }
    })
    .filter(p => Number.isFinite(p.price) && Number.isFinite(p.crawledAt))

  if (valid.length === 0) return []

  // Step 2: sort ascending by timestamp
  valid.sort((a, b) => a.crawledAt - b.crawledAt)

  // Step 3: for each distinct crawledAt epoch, keep the cheapest price
  // (Multi-Shop aggregation, Phase 1)
  const byTimestamp = new Map<number, number>()
  for (const { crawledAt, price } of valid) {
    const existing = byTimestamp.get(crawledAt)
    if (existing === undefined || price < existing) {
      byTimestamp.set(crawledAt, price)
    }
  }

  // Re-sort by timestamp (Map insertion order preserves sort from above,
  // but be explicit for correctness).
  const result: PricePoint[] = []
  for (const [crawledAt, price] of byTimestamp) {
    result.push({ crawledAt, price })
  }
  result.sort((a, b) => a.crawledAt - b.crawledAt)

  return result
}

// ────────────────────────────────────────────────────────────
// T1-B: computePriceStats
// ────────────────────────────────────────────────────────────

/**
 * Computes statistics from an aggregated `PricePoint[]`.
 * Returns `null` if fewer than 1 point (cannot compute anything meaningful).
 *
 * Edge cases handled:
 * - All prices identical → trendPct = 0, isCurrentLowest = true.
 * - Single point → returns stats with first === current, trendPct = 0.
 */
export function computePriceStats(points: PricePoint[]): PriceStats | null {
  if (points.length < 1) return null

  const prices = points.map(p => p.price)
  const lowest = Math.min(...prices)
  const highest = Math.max(...prices)
  const average = prices.reduce((sum, p) => sum + p, 0) / prices.length
  const current = prices[prices.length - 1]
  const first = prices[0]

  const trendPct = first !== 0
    ? ((current - first) / Math.abs(first)) * 100
    : 0

  const isCurrentLowest = current <= lowest + Number.EPSILON

  const firstSeenAt = new Date(points[0].crawledAt).toISOString()

  return {
    lowest,
    highest,
    average,
    current,
    first,
    firstSeenAt,
    trendPct,
    isCurrentLowest,
  }
}
