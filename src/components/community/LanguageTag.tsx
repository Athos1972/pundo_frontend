'use client'

import { Tooltip } from '@/components/ui/Tooltip'
import { t } from '@/lib/translations'

const LANG_NAME_KEYS: Record<string, keyof ReturnType<typeof t>> = {
  en: 'community_vote_language_en',
  de: 'community_vote_language_de',
  el: 'community_vote_language_el',
  ru: 'community_vote_language_ru',
  ar: 'community_vote_language_ar',
  he: 'community_vote_language_he',
}

interface Props {
  languageCode: string   // 'de', 'en', etc.
  avgScore: number       // weighted_avg from aggregates
  voteCount: number
  lang?: string
}

export function LanguageTag({ languageCode, avgScore, voteCount, lang = 'en' }: Props) {
  if (voteCount === 0) return null
  const tr = t(lang)
  const nameKey = LANG_NAME_KEYS[languageCode.toLowerCase()]
  const fullName = nameKey ? (tr[nameKey] as string) : undefined
  const tooltipText = fullName
    ? `${fullName} — ${voteCount} vote${voteCount === 1 ? '' : 's'}`
    : `${voteCount} vote${voteCount === 1 ? '' : 's'}`

  return (
    <Tooltip content={tooltipText}>
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 cursor-default"
      >
        {languageCode.toUpperCase()}
        <span className="text-amber-500">★</span>
        {avgScore.toFixed(1)}
      </span>
    </Tooltip>
  )
}
