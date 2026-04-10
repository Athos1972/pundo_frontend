'use client'
import { t } from '@/lib/translations'

const MIN = 10
const MAX = 100
const STEP = 5

export function DistanceSlider({
  value,
  onChange,
  lang,
}: {
  value: number
  onChange: (v: number) => void
  lang: string
}) {
  const tr = t(lang)
  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="text-xs text-text-muted flex-shrink-0">{tr.distance_label}</span>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={STEP}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        // range inputs must always be LTR — browsers render them inconsistently in RTL
        dir="ltr"
        style={{ direction: 'ltr' }}
        className="flex-1 accent-accent h-1.5"
        aria-label={tr.distance_label}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={value}
      />
      <span className="text-xs text-text font-medium w-12 text-right flex-shrink-0">
        {tr.distance_km(value)}
      </span>
    </div>
  )
}
