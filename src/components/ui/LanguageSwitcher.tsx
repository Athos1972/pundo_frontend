'use client'
import { useRouter } from 'next/navigation'
import { LANGS, type Lang, setLangCookie } from '@/lib/lang'

const LANG_LABELS: Record<Lang, string> = {
  en: 'EN',
  de: 'DE',
  ru: 'RU',
  el: 'ΕΛ',
  ar: 'ع',
  he: 'עב',
}

export function LanguageSwitcher({ current }: { current: Lang }) {
  const router = useRouter()

  function handleChange(lang: Lang) {
    setLangCookie(lang)
    router.refresh()
  }

  return (
    <div className="flex gap-0.5 flex-wrap justify-end">
      {LANGS.map(l => (
        <button
          key={l}
          onClick={() => handleChange(l)}
          title={l.toUpperCase()}
          className={`px-2 py-1 text-xs rounded transition-colors min-w-[28px] text-center ${
            l === current
              ? 'bg-accent text-white font-medium'
              : 'text-text-muted hover:text-text hover:bg-surface-alt'
          }`}
        >
          {LANG_LABELS[l]}
        </button>
      ))}
    </div>
  )
}
