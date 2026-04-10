'use client'

import { SUPPORTED_LANGUAGES } from '@/lib/lang'

interface LanguageSelectorProps {
  value: string[]
  onChange: (languages: string[]) => void
  label: string
}

export function LanguageSelector({ value, onChange, label }: LanguageSelectorProps) {
  function toggle(lang: string) {
    if (value.includes(lang)) {
      onChange(value.filter((l) => l !== lang))
    } else {
      onChange([...value, lang])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const active = value.includes(lang)
          return (
            <button
              key={lang}
              type="button"
              onClick={() => toggle(lang)}
              aria-pressed={active}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${active
                  ? 'bg-accent text-white hover:opacity-80'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              {lang}
            </button>
          )
        })}
      </div>
    </div>
  )
}
