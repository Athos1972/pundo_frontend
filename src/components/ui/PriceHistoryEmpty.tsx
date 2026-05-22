// src/components/ui/PriceHistoryEmpty.tsx — T3
// Server Component. Shown when exactly 1 price data point exists (AC-8).
// No Sparkline, no Trend-Badge — just current price + informational notice.

import { tShop } from '@/lib/i18n/shop'

interface Props {
  currentPrice: number
  currencySymbol: string
  lang: string
}

export function PriceHistoryEmpty({ currentPrice, currencySymbol, lang }: Props) {
  const tr = tShop(lang)

  return (
    <div className="space-y-2">
      {/* Current price — displayed large as the one data point we have */}
      <p className="text-2xl font-bold text-text rtl:text-right">
        {currencySymbol}{currentPrice.toFixed(2)}
      </p>
      {/* Informational notice (AC-8) */}
      <p className="text-sm text-text-light rtl:text-right">
        {tr.price_no_change_yet}
      </p>
    </div>
  )
}
