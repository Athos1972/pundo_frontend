'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { LANGS, LANG_NATIVE_NAMES, type Lang, setLangCookie } from '@/lib/lang'
import { stripLang } from '@/lib/routing'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/translations'

const LANG_LABELS: Record<Lang, string> = {
  en: 'EN',
  de: 'DE',
  ru: 'RU',
  el: 'ΕΛ',
  ar: 'ع',
  he: 'עב',
}

// ---- Desktop: original chip row (unchanged behaviour) ----

function LanguageSwitcherDesktop({ current, dark }: { current: Lang; dark?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const activeLang = useLang(current)

  function handleChange(lang: Lang) {
    setLangCookie(lang)
    const bare = stripLang(pathname)
    router.push(`/${lang}${bare === '/' ? '' : bare}`)
  }

  return (
    <div className="flex gap-0.5 flex-wrap justify-end">
      {LANGS.map(l => (
        <button
          key={l}
          onClick={() => handleChange(l)}
          title={l.toUpperCase()}
          className={`px-2 py-1 text-xs rounded transition-colors min-w-[28px] text-center ${
            l === activeLang
              ? dark
                ? 'bg-white/20 text-white font-medium'
                : 'bg-accent text-white font-medium'
              : dark
                ? 'text-white/60 hover:text-white hover:bg-white/10'
                : 'text-text-muted hover:text-text hover:bg-surface-alt'
          }`}
        >
          {LANG_LABELS[l]}
        </button>
      ))}
    </div>
  )
}

// ---- Mobile: pill trigger + popover ----

function GlobeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
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

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function LanguageSwitcherMobile({
  current,
  dark,
  ariaLabel,
}: {
  current: Lang
  dark?: boolean
  ariaLabel: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const activeLang = useLang(current)
  const [open, setOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState<number>(() => LANGS.indexOf(activeLang))
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  // Outside-click + ESC handler
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Focus correct list item when focusIndex changes while open
  useEffect(() => {
    if (open) {
      itemRefs.current[focusIndex]?.focus()
    }
  }, [open, focusIndex])

  function handleOpen() {
    const idx = LANGS.indexOf(activeLang)
    setFocusIndex(idx >= 0 ? idx : 0)
    setOpen(true)
  }

  function handleSelect(lang: Lang) {
    setLangCookie(lang)
    const bare = stripLang(pathname)
    router.push(`/${lang}${bare === '/' ? '' : bare}`)
    setOpen(false)
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIndex(i => (i + 1) % LANGS.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIndex(i => (i - 1 + LANGS.length) % LANGS.length)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setFocusIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setFocusIndex(LANGS.length - 1)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const pillBase = 'inline-flex items-center gap-1 px-2 py-1.5 rounded transition-colors'
  const pillColor = dark
    ? 'text-white/80 hover:bg-white/10'
    : 'text-text hover:bg-surface-alt'

  const popoverBase =
    'absolute top-full mt-1 z-30 rounded shadow-lg border min-w-[180px] py-1 ' +
    'right-0 rtl:right-auto rtl:left-0 ' +
    (dark ? 'bg-gray-800 border-gray-700' : 'bg-surface border-border')

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`${pillBase} ${pillColor}`}
      >
        <GlobeIcon />
        <ChevronDownIcon />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={handleListKeyDown}
          className={popoverBase}
        >
          {LANGS.map((l, i) => {
            const isActive = l === activeLang
            const itemColor = isActive
              ? dark
                ? 'bg-white/10 text-white font-medium'
                : 'bg-accent/10 text-accent font-medium'
              : dark
                ? 'text-white/80 hover:bg-white/10'
                : 'text-text hover:bg-surface-alt'

            return (
              <li
                key={l}
                ref={el => { itemRefs.current[i] = el }}
                role="option"
                aria-selected={isActive}
                tabIndex={focusIndex === i ? 0 : -1}
                onClick={() => handleSelect(l)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelect(l)
                  }
                }}
                className={`flex justify-between items-center px-4 py-3 min-h-[44px] cursor-pointer rtl:flex-row-reverse ${itemColor}`}
              >
                <span>{LANG_NATIVE_NAMES[l]}</span>
                <span className="text-xs opacity-60 ml-2 rtl:ml-0 rtl:mr-2">{LANG_LABELS[l]}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---- Public export: responsive switch ----

export function LanguageSwitcher({ current, dark }: { current: Lang; dark?: boolean }) {
  const tr = t(current)
  return (
    <>
      <div className="hidden md:flex">
        <LanguageSwitcherDesktop current={current} dark={dark} />
      </div>
      <div className="md:hidden">
        <LanguageSwitcherMobile current={current} dark={dark} ariaLabel={tr.change_language} />
      </div>
    </>
  )
}
