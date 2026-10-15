'use client'
import { t } from '@/lib/translations'

export const DISTANCE_MIN_KM = 10
export const DISTANCE_MAX_KM = 100
export const DISTANCE_STEP_KM = 5

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
        min={DISTANCE_MIN_KM}
        max={DISTANCE_MAX_KM}
        step={DISTANCE_STEP_KM}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        // range inputs must always be LTR — browsers render them inconsistently in RTL
        dir="ltr"
        className="flex-1 accent-accent h-1.5"
        aria-label={tr.distance_label}
        aria-valuemin={DISTANCE_MIN_KM}
        aria-valuemax={DISTANCE_MAX_KM}
        aria-valuenow={value}
      />
      <span className="text-xs text-text font-medium w-12 text-right flex-shrink-0">
        {tr.distance_km(value)}
      </span>
    </div>
  )
}
