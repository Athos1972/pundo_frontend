'use client'
import { useEffect, useRef, useState } from 'react'
import { useConsent } from './ConsentContext'
import { tConsent } from '@/lib/translations'
import type { Lang } from '@/lib/lang'

interface Props {
  lang: Lang
}

export function CookieConsentBanner({ lang }: Props) {
  const { consent, isResolved, settingsOpen, updateConsent, acceptAll, acceptNecessaryOnly, closeSettings } = useConsent()
  const tr = tConsent(lang)
  const [showDetails, setShowDetails] = useState(settingsOpen)
  const bannerRef = useRef<HTMLDivElement>(null)

  const visible = !isResolved || settingsOpen

  // ESC closes details / settings
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDetails) {
          setShowDetails(false)
          if (settingsOpen) closeSettings()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visible, showDetails, settingsOpen, closeSettings])

  // Focus first interactive element when banner appears
  useEffect(() => {
    if (visible && bannerRef.current) {
      const first = bannerRef.current.querySelector<HTMLElement>('button, [tabindex]')
      first?.focus()
    }
  }, [visible])

  if (!visible) return null

  const handleSave = () => {
    if (consent.marketing) {
      acceptAll()
    } else {
      acceptNecessaryOnly()
    }
    setShowDetails(false)
  }

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-modal="false"
      aria-label={tr.consent_banner_title}
      className="fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-border shadow-lg"
    >
      <div className="max-w-4xl mx-auto px-4 py-4 rtl:text-right">
        {!showDetails ? (
          // Compact banner
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rtl:sm:flex-row-reverse">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text">{tr.consent_banner_title}</p>
              <p className="text-xs text-text-muted mt-0.5">{tr.consent_banner_text}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 rtl:flex-row-reverse">
              <button
                onClick={() => setShowDetails(true)}
                className="px-3 py-1.5 text-xs border border-border rounded-md text-text-muted hover:text-text hover:border-text-muted transition-colors"
              >
                {tr.consent_settings}
              </button>
              <button
                onClick={acceptNecessaryOnly}
                className="px-3 py-1.5 text-xs border border-border rounded-md text-text-muted hover:text-text hover:border-text-muted transition-colors"
              >
                {tr.consent_necessary_only}
              </button>
              <button
                onClick={acceptAll}
                className="px-3 py-1.5 text-xs bg-accent text-white rounded-md hover:bg-accent-dark transition-colors font-medium"
              >
                {tr.consent_accept_all}
              </button>
            </div>
          </div>
        ) : (
          // Details / settings pane
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-text">{tr.consent_banner_title}</p>
            <div className="flex flex-col gap-3">
              {/* Necessary — always on */}
              <div className="flex items-start gap-3 rtl:flex-row-reverse">
                <div className="mt-0.5 w-9 h-5 rounded-full bg-accent shrink-0 flex items-center justify-end px-0.5 cursor-not-allowed opacity-60">
                  <span className="w-4 h-4 rounded-full bg-white block" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{tr.consent_necessary_title}</p>
                  <p className="text-xs text-text-muted">{tr.consent_necessary_desc}</p>
                </div>
              </div>
              {/* Marketing — toggleable */}
              <div className="flex items-start gap-3 rtl:flex-row-reverse">
                <button
                  role="switch"
                  aria-checked={consent.marketing}
                  onClick={() => updateConsent({ marketing: !consent.marketing })}
                  className={`mt-0.5 w-9 h-5 rounded-full shrink-0 flex items-center px-0.5 transition-colors ${consent.marketing ? 'bg-accent justify-end' : 'bg-border justify-start'}`}
                >
                  <span className="w-4 h-4 rounded-full bg-white block shadow-sm" />
                </button>
                <div>
                  <p className="text-sm font-medium text-text">{tr.consent_marketing_title}</p>
                  <p className="text-xs text-text-muted">{tr.consent_marketing_desc}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 rtl:flex-row-reverse">
              <button
                onClick={handleSave}
                className="px-4 py-1.5 text-xs bg-accent text-white rounded-md hover:bg-accent-dark transition-colors font-medium"
              >
                {tr.consent_save}
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-1.5 text-xs border border-border rounded-md text-text-muted hover:text-text transition-colors"
              >
                {tr.consent_accept_all}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
