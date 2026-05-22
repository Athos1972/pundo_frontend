// src/tests/price-history.test.ts — T2
// Unit-Tests für src/lib/price-history.ts

import { describe, it, expect } from 'vitest'
import { aggregatePriceHistory, computePriceStats } from '@/lib/price-history'
import type { PriceHistoryItem } from '@/types/api'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function item(price: string, crawled_at: string, shop_id = 1): PriceHistoryItem {
  return { shop_id, price, crawled_at }
}

const T1 = '2026-04-17T10:00:00Z'
const T2 = '2026-04-18T10:00:00Z'
const T3 = '2026-04-19T10:00:00Z'

// ─────────────────────────────────────────────
// aggregatePriceHistory
// ─────────────────────────────────────────────

describe('aggregatePriceHistory', () => {
  it('returns [] for empty input', () => {
    expect(aggregatePriceHistory([])).toEqual([])
  })

  it('returns 1 point for a single valid item', () => {
    const result = aggregatePriceHistory([item('10.00', T1)])
    expect(result).toHaveLength(1)
    expect(result[0].price).toBe(10)
  })

  it('filters out NaN prices', () => {
    const result = aggregatePriceHistory([
      item('not-a-number', T1),
      item('', T2),
      item('20.00', T3),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].price).toBe(20)
  })

  it('filters out items with invalid crawled_at', () => {
    const result = aggregatePriceHistory([
      item('10.00', 'not-a-date'),
      item('20.00', T2),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].price).toBe(20)
  })

  it('sorts unsorted input by crawled_at ascending', () => {
    const result = aggregatePriceHistory([
      item('30.00', T3),
      item('10.00', T1),
      item('20.00', T2),
    ])
    expect(result.map(p => p.price)).toEqual([10, 20, 30])
  })

  it('keeps cheapest price per distinct timestamp (Multi-Shop)', () => {
    // Same timestamp, two shops with different prices
    const result = aggregatePriceHistory([
      item('25.00', T1, 1),
      item('18.00', T1, 2),  // cheaper — should win
      item('20.00', T2, 1),
    ])
    expect(result).toHaveLength(2)
    expect(result[0].price).toBe(18) // cheapest at T1
    expect(result[1].price).toBe(20)
  })

  it('handles identical timestamps from same shop (collapses to cheapest)', () => {
    const result = aggregatePriceHistory([
      item('25.00', T1, 1),
      item('22.00', T1, 1), // same shop, same time, cheaper
    ])
    expect(result).toHaveLength(1)
    expect(result[0].price).toBe(22)
  })

  it('preserves crawledAt as epoch ms', () => {
    const result = aggregatePriceHistory([item('10.00', T1)])
    expect(result[0].crawledAt).toBe(new Date(T1).getTime())
  })
})

// ─────────────────────────────────────────────
// computePriceStats
// ─────────────────────────────────────────────

describe('computePriceStats', () => {
  it('returns null for empty array', () => {
    expect(computePriceStats([])).toBeNull()
  })

  it('returns stats for a single point', () => {
    const points = aggregatePriceHistory([item('10.00', T1)])
    const stats = computePriceStats(points)
    expect(stats).not.toBeNull()
    expect(stats!.current).toBe(10)
    expect(stats!.lowest).toBe(10)
    expect(stats!.highest).toBe(10)
    expect(stats!.trendPct).toBe(0)
    expect(stats!.isCurrentLowest).toBe(true)
  })

  it('computes correct lowest/highest/average for 2 points', () => {
    const points = [
      { price: 10, crawledAt: new Date(T1).getTime() },
      { price: 20, crawledAt: new Date(T2).getTime() },
    ]
    const stats = computePriceStats(points)!
    expect(stats.lowest).toBe(10)
    expect(stats.highest).toBe(20)
    expect(stats.average).toBeCloseTo(15)
  })

  it('AC-5: trendPct negative when current < first (price dropped)', () => {
    const points = [
      { price: 20, crawledAt: new Date(T1).getTime() },
      { price: 18, crawledAt: new Date(T2).getTime() },
    ]
    const stats = computePriceStats(points)!
    // (18 - 20) / 20 * 100 = -10
    expect(stats.trendPct).toBeCloseTo(-10)
  })

  it('AC-5: trendPct positive when current > first (price rose)', () => {
    const points = [
      { price: 10, crawledAt: new Date(T1).getTime() },
      { price: 12, crawledAt: new Date(T2).getTime() },
    ]
    const stats = computePriceStats(points)!
    expect(stats.trendPct).toBeCloseTo(20)
  })

  it('AC-6: isCurrentLowest true when current = min', () => {
    const points = [
      { price: 25, crawledAt: new Date(T1).getTime() },
      { price: 18, crawledAt: new Date(T2).getTime() },
    ]
    const stats = computePriceStats(points)!
    expect(stats.isCurrentLowest).toBe(true)
    expect(stats.current).toBe(18)
  })

  it('AC-6: isCurrentLowest false when current > min', () => {
    const points = [
      { price: 18, crawledAt: new Date(T1).getTime() },
      { price: 25, crawledAt: new Date(T2).getTime() },
    ]
    const stats = computePriceStats(points)!
    expect(stats.isCurrentLowest).toBe(false)
  })

  it('handles identical prices (range = 0) without NaN', () => {
    const points = [
      { price: 15, crawledAt: new Date(T1).getTime() },
      { price: 15, crawledAt: new Date(T2).getTime() },
      { price: 15, crawledAt: new Date(T3).getTime() },
    ]
    const stats = computePriceStats(points)!
    expect(stats.lowest).toBe(15)
    expect(stats.highest).toBe(15)
    expect(stats.trendPct).toBe(0)
    expect(stats.isCurrentLowest).toBe(true)
  })

  it('firstSeenAt is ISO string of the earliest crawled_at', () => {
    const points = [
      { price: 10, crawledAt: new Date(T1).getTime() },
      { price: 20, crawledAt: new Date(T2).getTime() },
    ]
    const stats = computePriceStats(points)!
    expect(stats.firstSeenAt).toBe(new Date(T1).toISOString())
  })

  it('NaN-filtered input: after filtering only 1 point remains — stats still valid', () => {
    const raw = [
      item('bad', T1),
      item('20.00', T2),
    ]
    const points = aggregatePriceHistory(raw)
    expect(points).toHaveLength(1)
    const stats = computePriceStats(points)
    expect(stats).not.toBeNull()
    expect(stats!.current).toBe(20)
  })
})
