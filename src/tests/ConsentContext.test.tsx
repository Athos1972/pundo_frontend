import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConsentProvider, useConsent } from '@/components/consent/ConsentContext'
import { CONSENT_COOKIE, CONSENT_MAX_AGE, defaultConsentState, parseConsentCookie } from '@/lib/consent'

/**
 * Verhalten von ConsentContext beim Speichern der Einwilligung.
 * F8950 T33: ersetzt den Quelltext-Regex-Test in consent.test.ts ("document.cookie = ... secure"). Statt den Code zu lesen,
 * wird `document.cookie` beim Klick auf die Buttons beobachtet.
 */

function Buttons() {
  const { acceptAll, acceptNecessaryOnly } = useConsent()
  return (
    <>
      <button onClick={acceptAll}>all</button>
      <button onClick={acceptNecessaryOnly}>necessary</button>
    </>
  )
}

/** Faengt jede Zuweisung an document.cookie ab (jsdom lehnt `secure` auf http ab, daher nicht ueber document.cookie lesen). */
function captureCookieWrites(): string[] {
  const writes: string[] = []
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => '',
    set: (v: string) => { writes.push(v) },
  })
  return writes
}

afterEach(() => {
  // eigene Property entfernen, damit der jsdom-Prototyp wieder greift
  delete (document as unknown as { cookie?: string }).cookie
  vi.restoreAllMocks()
})

describe('ConsentContext — Consent-Cookie schreiben', () => {
  it('schreibt das Cookie mit secure, samesite=lax, path=/ und Laufzeit (Observatory-Regression 2026-06-05)', () => {
    const writes = captureCookieWrites()
    render(<ConsentProvider initialConsent={null}><Buttons /></ConsentProvider>)
    fireEvent.click(screen.getByText('all'))

    const consentWrite = writes.find((w) => w.startsWith(`${CONSENT_COOKIE}=`))
    expect(consentWrite).toBeDefined()
    const attrs = consentWrite!.split(';').map((a) => a.trim().toLowerCase())
    expect(attrs).toContain('secure')
    expect(attrs).toContain('samesite=lax')
    expect(attrs).toContain('path=/')
    expect(attrs).toContain(`max-age=${CONSENT_MAX_AGE}`)
  })

  it('"Alle akzeptieren" speichert Marketing = true', () => {
    const writes = captureCookieWrites()
    render(<ConsentProvider initialConsent={null}><Buttons /></ConsentProvider>)
    fireEvent.click(screen.getByText('all'))
    const value = writes.find((w) => w.startsWith(`${CONSENT_COOKIE}=`))!.split(';')[0].slice(CONSENT_COOKIE.length + 1)
    expect(parseConsentCookie(value)?.marketing).toBe(true)
  })

  it('"Nur notwendige" speichert Marketing = false und räumt die Pixel-Cookies ab', () => {
    const writes = captureCookieWrites()
    render(<ConsentProvider initialConsent={defaultConsentState()}><Buttons /></ConsentProvider>)
    fireEvent.click(screen.getByText('necessary'))
    const value = writes.find((w) => w.startsWith(`${CONSENT_COOKIE}=`))!.split(';')[0].slice(CONSENT_COOKIE.length + 1)
    expect(parseConsentCookie(value)?.marketing).toBe(false)
    expect(writes.some((w) => w.startsWith('_fbp=;') && w.includes('max-age=0'))).toBe(true)
    expect(writes.some((w) => w.startsWith('_fbc=;') && w.includes('max-age=0'))).toBe(true)
  })
})
