'use client'
import { t } from '@/lib/translations'

export function FilterChips({
  available,
  onAvailableChange,
  withPrice,
  onWithPriceChange,
  lang,
}: {
  available: boolean
  onAvailableChange: (v: boolean) => void
  withPrice: boolean
  onWithPriceChange: (v: boolean) => void
  lang: string
}) {
  const tr = t(lang)
  return (
    <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-none">
      <button
        onClick={() => onAvailableChange(!available)}
        className={`flex-shrink-0 px-3 py-1 rounded-full text-sm transition-colors ${
          available ? 'bg-success text-white' : 'bg-surface border border-border text-text-muted hover:border-accent'
        }`}
      >
        {tr.available}
      </button>
      <button
        onClick={() => onWithPriceChange(!withPrice)}
        className={`flex-shrink-0 px-3 py-1 rounded-full text-sm transition-colors ${
          withPrice ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:border-accent'
        }`}
      >
        {tr.filter_price_only}
      </button>
    </div>
  )
}
