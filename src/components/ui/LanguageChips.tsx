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

interface LanguageChipsProps {
  languages: string[]
  label: string
  lang?: string
}

export function LanguageChips({ languages, label, lang = 'en' }: LanguageChipsProps) {
  if (languages.length === 0) return null
  const tr = t(lang)

  return (
    <div>
      <p className="text-xs text-text-muted mb-1.5">{label}</p>
      <div
        className="flex flex-wrap gap-1.5"
        aria-label={label}
        role="list"
      >
        {languages.map((code) => {
          const nameKey = LANG_NAME_KEYS[code.toLowerCase()]
          const fullName = nameKey ? (tr[nameKey] as string) : undefined
          return (
            <Tooltip key={code} content={fullName ?? code}>
              <span
                role="listitem"
                className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-alt text-text-muted cursor-default select-none"
              >
                {code.toUpperCase()}
              </span>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
