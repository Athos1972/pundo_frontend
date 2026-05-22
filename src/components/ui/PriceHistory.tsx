// src/components/ui/PriceHistory.tsx — T6
// Orchestration wrapper. Decides which sub-component to render based on
// the number of aggregated price points:
//   0 points → null (caller must not render the card at all, enforced by page.tsx guard)
//   1 point  → <PriceHistoryEmpty> (AC-8)
//   ≥ 2 pts  → <PriceHistoryStats> + <PriceHistoryChart> (AC-4 / AC-5 / AC-6 / AC-7)

import type { PriceHistoryItem } from '@/types/api'
import type { Lang } from '@/lib/lang'
import { aggregatePriceHistory, computePriceStats } from '@/lib/price-history'
import { PriceHistoryEmpty } from './PriceHistoryEmpty'
import { PriceHistoryStats } from './PriceHistoryStats'
import { PriceHistoryChart } from './PriceHistoryChart'

interface Props {
  items: PriceHistoryItem[]
  lang: Lang
  currencySymbol?: string
}

export function PriceHistory({ items, lang, currencySymbol = '€' }: Props) {
  const points = aggregatePriceHistory(items)

  // AC-9: 0 points → render nothing (page.tsx guard keeps the card hidden)
  if (points.length === 0) return null

  // AC-8: exactly 1 point → informational empty state, no sparkline
  if (points.length === 1) {
    return (
      <PriceHistoryEmpty
        currentPrice={points[0].price}
        currencySymbol={currencySymbol}
        lang={lang}
      />
    )
  }

  // ≥ 2 points → full stats + chart
  const stats = computePriceStats(points)
  if (!stats) return null // shouldn't happen, defensive guard

  // Trend color: green for drop/flat, orange for rise (AC-5)
  const trendColor = stats.trendPct <= 0 ? '#2A8C5A' : '#D4622A'

  return (
    <div className="space-y-3">
      <PriceHistoryStats
        stats={stats}
        currencySymbol={currencySymbol}
        lang={lang}
      />
      <PriceHistoryChart
        points={points}
        trendColor={trendColor}
      />
    </div>
  )
}
