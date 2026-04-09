import type { PriceHistoryItem } from '@/types/api'

export function PriceHistory({ items }: { items: PriceHistoryItem[] }) {
  if (items.length < 2) return null

  const prices = items.map(i => parseFloat(i.price))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  const W = 280
  const H = 48
  const PAD = 4

  const points = items.map((item, i) => {
    const x = PAD + (i / (items.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (parseFloat(item.price) - min) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const latest = prices[prices.length - 1]
  const oldest = prices[0]
  const diff = latest - oldest
  const trendColor = diff <= 0 ? '#2A8C5A' : '#D4622A'

  const lastItem = items[items.length - 1]
  const lastX = W - PAD
  const lastY = PAD + (1 - (parseFloat(lastItem.price) - min) / range) * (H - PAD * 2)

  return (
    <div className="flex items-center gap-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="flex-1 h-12" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={trendColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r="3" fill={trendColor} />
      </svg>
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-sm text-text">{latest.toFixed(2)}</p>
        <p className={`text-xs ${diff <= 0 ? 'text-success' : 'text-accent'}`}>
          {diff > 0 ? '+' : ''}{diff.toFixed(2)}
        </p>
      </div>
    </div>
  )
}
