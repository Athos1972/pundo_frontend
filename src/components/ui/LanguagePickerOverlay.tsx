'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LANGS, LANG_NATIVE_NAMES, type Lang, DEFAULT_LANG, detectBrowserLang, setLangCookie } from '@/lib/lang'
import { stripLang } from '@/lib/routing'
import { t } from '@/lib/translations'
// ---- Hook ----

const PICKER_SETTLE_MS = 150

function hasCookie(): boolean {
  if (typeof document === 'undefined') return false
  return /app_lang=/.test(document.cookie)
}

export function useLanguagePickerTrigger(): { shouldShow: boolean; preselected: Lang; dismiss: () => void } {
  const [shouldShow, setShouldShow] = useState(false)
  const [preselected, setPreselected] = useState<Lang>(DEFAULT_LANG)
  const dismiss = useCallback(() => setShouldShow(false), [])

  useEffect(() => {
    if (hasCookie()) return

    const timer = setTimeout(() => {
      if (!hasCookie()) {
        setPreselected(detectBrowserLang())
        setShouldShow(true)
      }
    }, PICKER_SETTLE_MS)

    return () => clearTimeout(timer)
  }, [])

  return { shouldShow, preselected, dismiss }
}

// ---- Globe Icon ----

function GlobeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}

// ---- Lang code labels (2-letter display codes) ----

const LANG_DISPLAY_CODE: Record<Lang, string> = {
  en: 'EN',
  de: 'DE',
  ru: 'RU',
  el: 'ΕΛ',
  ar: 'ع',
  he: 'עב',
}

// ---- Component ----

type Props = {
  /** The language already rendered server-side; used to decide reload vs. refresh. */
  serverLang: Lang
}

export function LanguagePickerOverlay({ serverLang: _serverLang }: Props) {
  const { shouldShow, preselected, dismiss } = useLanguagePickerTrigger()
  const router = useRouter()
  const pathname = usePathname()
  const [selected, setSelected] = useState<Lang>(preselected)
  const dialogRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const titleId = 'lang-picker-title'

  // Sync selected when preselected is resolved in useEffect
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(preselected)
  }, [preselected])

  // Body scroll-lock
  useEffect(() => {
    if (!shouldShow) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [shouldShow])

  // Initial focus on preselected option
  useEffect(() => {
    if (!shouldShow) return
    const idx = LANGS.indexOf(selected)
    optionRefs.current[idx >= 0 ? idx : 0]?.focus()
  }, [shouldShow]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = useCallback(
    (chosen: Lang) => {
      setLangCookie(chosen)
      dismiss()
      const pathWithoutLang = stripLang(pathname)
      router.push(`/${chosen}${pathWithoutLang === '/' ? '' : pathWithoutLang}`)
    },
    [pathname, router, dismiss],
  )

  // Keyboard: arrows navigate, Tab trapped within 6 option buttons
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const focusable = optionRefs.current.filter((r): r is HTMLButtonElement => r !== null)

      const currentIdx = focusable.indexOf(document.activeElement as HTMLButtonElement)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = focusable[(currentIdx + 1) % focusable.length]
        next?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = focusable[(currentIdx - 1 + focusable.length) % focusable.length]
        prev?.focus()
      } else if (e.key === 'Tab') {
        // Tab-trap
        e.preventDefault()
        if (e.shiftKey) {
          const prev = focusable[(currentIdx - 1 + focusable.length) % focusable.length]
          prev?.focus()
        } else {
          const next = focusable[(currentIdx + 1) % focusable.length]
          next?.focus()
        }
      }
      // ESC intentionally ignored (not skippable, BB/4.5)
    },
    [],
  )

  if (!shouldShow) return null

  const tr = t(selected)

  return (
    // Backdrop — click intentionally does nothing (not skippable)
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4">
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6 flex flex-col gap-5"
      >
        {/* Title */}
        <div id={titleId} className="flex items-center justify-center gap-2 text-center font-semibold text-lg text-gray-900">
          <GlobeIcon />
          <span>{tr.language_picker_title}</span>
        </div>

        {/* Language options — one tap applies immediately */}
        <div role="radiogroup" aria-labelledby={titleId} className="flex flex-col gap-1">
          {LANGS.map((lang, idx) => {
            const isSelected = lang === selected
            return (
              <button
                key={lang}
                ref={el => { optionRefs.current[idx] = el }}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => handleApply(lang)}
                className={[
                  'flex items-center justify-between px-4 py-3 min-h-[44px] rounded-lg text-left',
                  'transition-colors cursor-pointer border-2',
                  isSelected
                    ? 'border-accent bg-accent/10 text-accent font-medium'
                    : 'border-transparent text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                <span className="text-base">{LANG_NATIVE_NAMES[lang]}</span>
                <span className="text-xs text-gray-400 ml-3 shrink-0">{LANG_DISPLAY_CODE[lang]}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
