'use client'

interface OnboardingProgressProps {
  step: number   // 1-based
  total: number
  isRtl: boolean
}

export function OnboardingProgress({ step, total, isRtl }: OnboardingProgressProps) {
  const pct = Math.round((step / total) * 100)
  return (
    <div className="w-full" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={isRtl ? { marginInlineStart: 'auto', width: `${pct}%` } : { width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
