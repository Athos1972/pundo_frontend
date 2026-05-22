// src/components/ui/PriceHistoryStats.tsx — T4
// Server Component. Renders the statistics row + trend badge + best-price notice.
// RTL-aware via Tailwind rtl: modifier.

import type { PriceStats } from '@/lib/price-history'
import { tShop } from '@/lib/i18n/shop'

interface Props {
  stats: PriceStats
  currencySymbol: string
  lang: string
}

function formatPrice(value: number, symbol: string): string {
  return `${symbol}${value.toFixed(2)}`
}

function formatDateLabel(isoString: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(
      new Date(isoString),
    )
  } catch {
    return isoString.slice(0, 10)
  }
}

function formatTrendPct(trendPct: number, lang: string): string {
  const abs = Math.abs(trendPct)
  const sign = trendPct < 0 ? '−' : '+'
  try {
    const formatted = new Intl.NumberFormat(lang, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(abs)
    return `${sign}${formatted} %`
  } catch {
    return `${sign}${abs.toFixed(1)} %`
  }
}

export function PriceHistoryStats({ stats, currencySymbol, lang }: Props) {
  const tr = tShop(lang)

  const {
    current,
    lowest,
    highest,
    average,
    trendPct,
    isCurrentLowest,
    firstSeenAt,
  } = stats

  const trendIsDown = trendPct <= 0
  const trendColorClass = trendIsDown ? 'text-success' : 'text-accent'
  const dateLabel = formatDateLabel(firstSeenAt, lang)
  const trendLabel = formatTrendPct(trendPct, lang)
  const sinceLabel = tr.price_trend_since(dateLabel)

  return (
    <div className="space-y-3">
      {/* Current price — prominent */}
      <div className="flex items-baseline gap-3 rtl:flex-row-reverse">
        <span className="text-2xl font-bold text-text">
          {formatPrice(current, currencySymbol)}
        </span>
        {/* Trend badge — only meaningful when there's a second point (trendPct could be 0 on 1 pt but we only render this for ≥2 pts) */}
        {trendPct !== 0 && (
          <span className={`text-sm font-semibold ${trendColorClass}`}>
            {trendLabel}
          </span>
        )}
        {trendPct !== 0 && (
          <span className="text-xs text-text-light">
            {sinceLabel}
          </span>
        )}
      </div>

      {/* Stats row: Lowest / Highest / Average */}
      <div className="flex gap-4 rtl:flex-row-reverse flex-wrap">
        <StatCell label={tr.price_lowest} value={formatPrice(lowest, currencySymbol)} />
        <StatCell label={tr.price_highest} value={formatPrice(highest, currencySymbol)} />
        <StatCell label={tr.price_average} value={formatPrice(average, currencySymbol)} />
      </div>

      {/* Scope label */}
      <p className="text-xs text-text-light rtl:text-right">
        {tr.price_history_scope_cheapest}
      </p>

      {/* Best-price notice (AC-6) */}
      {isCurrentLowest && (
        <p className="text-xs font-semibold text-success rtl:text-right">
          {tr.price_best_seen}
        </p>
      )}
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start rtl:items-end">
      <span className="text-xs text-text-light">{label}</span>
      <span className="text-sm font-semibold text-text">{value}</span>
    </div>
  )
}
