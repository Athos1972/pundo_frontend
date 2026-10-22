'use client'

import { useEffect, useState } from 'react'
import { t } from '@/lib/translations'
import type { ProgressionFeedback } from '@/types/api'

interface Props {
  feedback: ProgressionFeedback | null | undefined
  lang: string
  brand: 'pundo' | 'naidivse'
}

export function ProgressionFeedbackNotice({ feedback, lang, brand }: Props) {
  const tr = t(lang)
  const [dismissedFeedback, setDismissedFeedback] = useState<ProgressionFeedback | null>(null)
  const open = feedback?.state === 'awarded' && dismissedFeedback !== feedback

  useEffect(() => {
    if (!feedback || feedback.state !== 'awarded' || brand !== 'pundo') return
    const timer = window.setTimeout(() => setDismissedFeedback(feedback), 5000)
    return () => window.clearTimeout(timer)
  }, [brand, feedback])

  if (!open || !feedback?.event) return null
  const celebratory = brand === 'naidivse'
  return (
    <aside
      role="status"
      aria-live="polite"
      className={[
        'relative rounded-xl border p-3 text-sm shadow-sm motion-reduce:transition-none',
        celebratory ? 'border-accent bg-accent p-5 text-white shadow-lg' : 'border-border bg-surface text-text',
      ].join(' ')}
    >
      <p className="font-semibold">{tr.progression_event_name(feedback.event.display_kind)}</p>
      <p className="mt-1" dir="ltr">{tr.progression_feedback_delta(feedback.event.xp_delta, feedback.event.credit_delta, tr.progression_brand_currency(brand, feedback.event.credit_delta))}</p>
      {feedback.achievements?.level_up && <p className="mt-1">{tr.progression_brand_standing(brand)}: {feedback.achievements.level_up.from_level} → {feedback.achievements.level_up.to_level}</p>}
      <button type="button" onClick={() => setDismissedFeedback(feedback)} aria-label={tr.close} className="absolute end-2 top-2 rounded p-1 hover:opacity-70">×</button>
    </aside>
  )
}
