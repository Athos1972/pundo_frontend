'use client'

// =============================================================================
// src/components/ui/LanguageHint.tsx — dezenter Sprach-Hinweis (F6310)
//
// Ersetzt das frühere LanguagePickerOverlay (Vollbild-Dialog). Nicht modal, kein
// Backdrop, kein Fokus-Klau, kein Scroll-Lock. Wird nur clientseitig gerendert
// (Server-Snapshot = "ausgeblendet") → nicht im SSR-HTML, kein CLS, Bots sehen ihn nicht.
//
// Sichtbar, solange kein Cookie `lang_hint_dismissed` existiert (siehe src/lib/lang-hint.ts)
// und der Cookie-Consent-Banner nicht offen ist (beide sitzen am unteren Rand).
// =============================================================================

import { useCallback, useId, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { LANGS, LANG_NATIVE_NAMES, type Lang, detectSupportedBrowserLang, setLangCookie } from '@/lib/lang'
import { localePath, stripLang } from '@/lib/routing'
import { useLang } from '@/lib/useLang'
import { tLanguageHint } from '@/lib/i18n/language-hint'
import { isLangHintDismissed, markLangHintDismissed, subscribeLangHint } from '@/lib/lang-hint'
import { useConsent } from '@/components/consent/ConsentContext'

const getServerSnapshot = () => true

function GlobeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-text-muted"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

/** Zielpfad für eine Sprachwahl: gleicher Pfad ohne Lang-Präfix, Query-String bleibt erhalten. */
export function buildLangHintTarget(target: Lang, pathname: string, search: string): string {
  const bare = stripLang(pathname)
  // localePath(l, '/') ergäbe '/de/' → 308 auf '/de'; Root daher ohne Trailing Slash.
  const path = bare === '/' ? `/${target}` : localePath(target, bare)
  return `${path}${search}`
}

export function LanguageHint({ lang }: { lang: Lang }) {
  const dismissed = useSyncExternalStore(subscribeLangHint, isLangHintDismissed, getServerSnapshot)
  const { isResolved, settingsOpen } = useConsent()
  const current = useLang(lang)
  const router = useRouter()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  const choose = useCallback(
    (target: Lang) => {
      markLangHintDismissed()
      setLangCookie(target)
      if (target === current) return
      router.push(buildLangHintTarget(target, pathname, window.location.search))
    },
    [current, pathname, router],
  )

  const consentBannerVisible = !isResolved || settingsOpen
  if (dismissed || consentBannerVisible) return null

  const tr = tLanguageHint(current)
  // Browsersprache nur lesen, wenn der Hinweis tatsächlich clientseitig gerendert wird.
  const browserLang = detectSupportedBrowserLang()
  const suggestion = browserLang && browserLang !== current ? browserLang : null

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && expanded) {
      e.stopPropagation()
      setExpanded(false)
      toggleRef.current?.focus()
    }
  }

  return (
    <>
      {/* Spacer ans Ende von <body> (nach dem Footer): so lässt sich der letzte Inhalt über den
          Hinweis scrollen und kein Footer-Link bleibt verdeckt. Liegt am Dokumentende → kein CLS. */}
      {createPortal(<div aria-hidden="true" data-testid="language-hint-spacer" className="h-20 md:h-16" />, document.body)}
      <div
        role="region"
        aria-label={tr.lang_hint_region_label}
        data-testid="language-hint"
        onKeyDown={onKeyDown}
        className="fixed z-[44] start-3 md:start-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-4 max-w-[calc(100vw-6rem)] md:max-w-sm flex flex-col-reverse rounded-2xl border border-border bg-surface text-sm text-text shadow-lg"
      >
        {/* Zeile: "Sprache: Deutsch · Ändern" [Vorschlag] [X] — DOM-Reihenfolge vor der Liste (Tab-Reihenfolge),
            optisch per flex-col-reverse unter der aufgeklappten Liste. Auf schmalen Screens bricht der
            Vorschlag in eine zweite Zeile um; X sitzt fest oben am End-Rand. */}
        <div className="relative flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ps-3 pe-9 py-1">
          <GlobeIcon />
          <span className="whitespace-nowrap">
            {tr.lang_hint_language}: <span className="font-medium">{LANG_NATIVE_NAMES[current]}</span>
          </span>
          <span aria-hidden="true" className="text-text-light">·</span>
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 rounded px-1.5 py-1 font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {tr.lang_hint_change}
          </button>
          {suggestion && (
            <button
              type="button"
              lang={suggestion}
              dir="auto"
              data-testid="language-hint-suggestion"
              aria-label={tr.lang_hint_suggest_aria.replace('{lang}', LANG_NATIVE_NAMES[suggestion])}
              onClick={() => choose(suggestion)}
              className="shrink-0 rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent-dark hover:bg-accent hover:text-white focus-visible:outline-2 focus-visible:outline-accent"
            >
              {LANG_NATIVE_NAMES[suggestion]}?
            </button>
          )}
          <button
            type="button"
            aria-label={tr.lang_hint_close}
            onClick={markLangHintDismissed}
            className="absolute top-1 end-1 rounded-full p-1.5 text-text-muted hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            <CloseIcon />
          </button>
        </div>

        {expanded && (
          <ul
            id={listId}
            aria-label={tr.lang_hint_list_label}
            className="grid grid-cols-2 gap-1 border-b border-border p-2"
          >
            {LANGS.map(l => {
              const isCurrent = l === current
              return (
                <li key={l}>
                  <button
                    type="button"
                    lang={l}
                    aria-current={isCurrent ? 'true' : undefined}
                    onClick={() => choose(l)}
                    className={`w-full min-h-[40px] rounded-lg px-3 py-2 text-start transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                      isCurrent ? 'bg-accent/10 font-medium text-accent' : 'text-text hover:bg-surface-alt'
                    }`}
                  >
                    {LANG_NATIVE_NAMES[l]}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
