'use client'
// src/components/ui/PriceHistoryChart.tsx — T5
// Client Component — marked 'use client' to enable future Phase-2 hover/touch
// interaction without re-wiring. Phase 1: no interactivity, pure SVG render.
//
// AC-7: X-position of each point is proportional to its crawled_at timestamp,
//       NOT to its array index. This ensures the chart is temporally honest.
//
// RTL note (per architecture §4): The sparkline curve is NOT mirrored in RTL.
// Time always runs left→right in a chart — mirroring would be misleading.
// Only the surrounding layout (stats row, labels) is RTL-aware via rtl: Tailwind.

import type { PricePoint } from '@/lib/price-history'

interface Props {
  points: PricePoint[]
  /** CSS color for the stroke and endpoint dot */
  trendColor: string
}

const W = 280
const H = 48
const PAD = 4

export function PriceHistoryChart({ points, trendColor }: Props) {
  if (points.length < 2) return null

  const prices = points.map(p => p.price)
  const timestamps = points.map(p => p.crawledAt)

  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1 // guard against flat line (all identical prices)

  const tMin = Math.min(...timestamps)
  const tMax = Math.max(...timestamps)
  const timeRange = tMax - tMin // may be 0 if all timestamps identical

  const svgPoints = points.map((p, i) => {
    // AC-7: X proportional to timestamp
    const x = timeRange > 0
      ? PAD + ((p.crawledAt - tMin) / timeRange) * (W - PAD * 2)
      : PAD + (i / (points.length - 1)) * (W - PAD * 2) // fallback: equal spacing

    const y = PAD + (1 - (p.price - minPrice) / priceRange) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const pointsStr = svgPoints.join(' ')

  // Mark the last (most recent) point
  const lastPoint = points[points.length - 1]
  const lastIndex = points.length - 1
  const lastX = timeRange > 0
    ? PAD + ((lastPoint.crawledAt - tMin) / timeRange) * (W - PAD * 2)
    : PAD + (lastIndex / (points.length - 1)) * (W - PAD * 2)
  const lastY = PAD + (1 - (lastPoint.price - minPrice) / priceRange) * (H - PAD * 2)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-12"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={pointsStr}
        fill="none"
        stroke={trendColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="3" fill={trendColor} />
    </svg>
  )
}
