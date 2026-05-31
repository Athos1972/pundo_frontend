'use client'
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { type ConsentState, CONSENT_COOKIE, CONSENT_MAX_AGE, defaultConsentState, serializeConsentCookie } from '@/lib/consent'

interface ConsentContextValue {
  consent: ConsentState
  isResolved: boolean
  settingsOpen: boolean
  updateConsent: (partial: Partial<Omit<ConsentState, 'v' | 'necessary'>>) => void
  acceptAll: () => void
  acceptNecessaryOnly: () => void
  openSettings: () => void
  closeSettings: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

function writeConsentCookie(state: ConsentState) {
  document.cookie = `${CONSENT_COOKIE}=${serializeConsentCookie(state)}; max-age=${CONSENT_MAX_AGE}; path=/; samesite=lax`
}

function deletePixelCookies() {
  for (const name of ['_fbp', '_fbc']) {
    document.cookie = `${name}=; max-age=0; path=/`
    document.cookie = `${name}=; max-age=0; path=/; domain=${window.location.hostname}`
  }
}

interface ConsentProviderProps {
  children: ReactNode
  initialConsent: ConsentState | null
}

export function ConsentProvider({ children, initialConsent }: ConsentProviderProps) {
  const [consent, setConsent] = useState<ConsentState>(initialConsent ?? defaultConsentState())
  const [isResolved, setIsResolved] = useState(initialConsent !== null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const persist = useCallback((next: ConsentState) => {
    setConsent(next)
    setIsResolved(true)
    setSettingsOpen(false)
    writeConsentCookie(next)
    if (!next.marketing) {
      if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        window.fbq('consent', 'revoke')
      }
      deletePixelCookies()
    }
  }, [])

  const acceptAll = useCallback(() => {
    persist({ v: 1, necessary: true, statistics: true, marketing: true })
  }, [persist])

  const acceptNecessaryOnly = useCallback(() => {
    persist({ v: 1, necessary: true, statistics: true, marketing: false })
  }, [persist])

  const updateConsent = useCallback((partial: Partial<Omit<ConsentState, 'v' | 'necessary'>>) => {
    setConsent(prev => ({ ...prev, ...partial }))
  }, [])

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  return (
    <ConsentContext.Provider value={{ consent, isResolved, settingsOpen, updateConsent, acceptAll, acceptNecessaryOnly, openSettings, closeSettings }}>
      {children}
    </ConsentContext.Provider>
  )
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used inside ConsentProvider')
  return ctx
}
