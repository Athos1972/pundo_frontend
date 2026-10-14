import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'

// ---- Mocks ----

const mockPush = vi.fn()
let mockPathname = '/de/shops'
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => mockPathname,
}))

// Browser languages per test
let mockLanguages: readonly string[] = ['de-DE']
Object.defineProperty(navigator, 'languages', { get: () => mockLanguages, configurable: true })

// Minimal cookie jar: setter merges name=value (attributes ignored), getter joins them.
let jar: Record<string, string> = {}
let lastRawCookie = ''
Object.defineProperty(document, 'cookie', {
  configurable: true,
  get: () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '),
  set: (raw: string) => {
    lastRawCookie = raw
    const [pair] = raw.split(';')
    const idx = pair.indexOf('=')
    jar[pair.slice(0, idx).trim()] = pair.slice(idx + 1)
  },
})

// ---- Imports after mocks ----

import { LanguageHint, buildLangHintTarget } from '@/components/ui/LanguageHint'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ConsentProvider } from '@/components/consent/ConsentContext'
import { markLangHintDismissed, isLangHintDismissed, LANG_HINT_COOKIE } from '@/lib/lang-hint'
import { detectSupportedBrowserLang, type Lang } from '@/lib/lang'

const RESOLVED = { v: 1, necessary: true, statistics: true, marketing: false } as const

function renderHint(lang: Lang = 'de', { consentResolved = true } = {}) {
  return render(
    <ConsentProvider initialConsent={consentResolved ? RESOLVED : null}>
      <LanguageHint lang={lang} />
    </ConsentProvider>,
  )
}

const hint = () => screen.queryByTestId('language-hint')

beforeEach(() => {
  jar = {}
  lastRawCookie = ''
  mockPush.mockReset()
  mockPathname = '/de/shops'
  mockLanguages = ['de-DE']
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---- Sichtbarkeit ----

describe('LanguageHint — Sichtbarkeit', () => {
  it('erscheint beim Erstbesuch (kein lang_hint_dismissed), auch wenn app_lang gesetzt ist', () => {
    jar.app_lang = 'de' // vom Proxy automatisch gesetzt — kein Signal für bewusste Wahl
    renderHint('de')
    const region = screen.getByRole('region', { name: 'Sprachauswahl' })
    expect(region).toHaveTextContent('Sprache: Deutsch')
    expect(screen.getByRole('button', { name: 'Ändern' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('erscheint nicht für Returning Visitors mit lang_hint_dismissed-Cookie', () => {
    jar[LANG_HINT_COOKIE] = '1'
    renderHint('de')
    expect(hint()).toBeNull()
  })

  it('wartet, solange der Cookie-Consent-Banner offen ist', () => {
    renderHint('de', { consentResolved: false })
    expect(hint()).toBeNull()
  })

  it('ist nicht im SSR-HTML (Server-Snapshot = ausgeblendet)', () => {
    const html = renderToString(
      <ConsentProvider initialConsent={RESOLVED}>
        <LanguageHint lang="de" />
      </ConsentProvider>,
    )
    expect(html).toBe('')
  })

  it('ist kein modaler Dialog und klaut keinen Fokus', () => {
    renderHint('de')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(document.body)
    expect(document.body.style.overflow).toBe('')
  })
})

describe('LanguageHint — verdeckt keinen Seiteninhalt', () => {
  it('hängt einen Spacer ans Ende von <body>, solange er sichtbar ist', () => {
    renderHint('de')
    const spacer = screen.getByTestId('language-hint-spacer')
    expect(spacer.parentElement).toBe(document.body)
    expect(document.body.lastElementChild).toBe(spacer)
    fireEvent.click(screen.getByRole('button', { name: 'Sprach-Hinweis schließen' }))
    expect(screen.queryByTestId('language-hint-spacer')).toBeNull()
  })
})

// ---- Cookie / Schließen ----

describe('LanguageHint — Schließen & Cookie', () => {
  it('X setzt lang_hint_dismissed (1 Jahr, Secure) und blendet den Hinweis aus', () => {
    renderHint('de')
    fireEvent.click(screen.getByRole('button', { name: 'Sprach-Hinweis schließen' }))
    expect(hint()).toBeNull()
    expect(isLangHintDismissed()).toBe(true)
    expect(lastRawCookie).toContain('lang_hint_dismissed=1')
    expect(lastRawCookie).toContain('max-age=31536000')
    expect(lastRawCookie.toLowerCase()).toContain('secure')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('verschwindet, wenn die Sprache anderswo bewusst gewählt wird (Event)', () => {
    renderHint('de')
    expect(hint()).not.toBeNull()
    act(() => markLangHintDismissed())
    expect(hint()).toBeNull()
  })

  it('Header-Sprachumschalter markiert die Wahl als bewusst', () => {
    mockPathname = '/en/shops'
    render(<LanguageSwitcher current="en" />)
    // Desktop-Chip "DE"
    fireEvent.click(screen.getAllByTitle('DE')[0])
    expect(jar[LANG_HINT_COOKIE]).toBe('1')
    expect(jar.app_lang).toBe('de')
  })
})

// ---- Sprachwahl ----

describe('LanguageHint — Sprachwahl', () => {
  it('"Ändern" klappt alle 6 Sprachen in Eigenbezeichnung auf', () => {
    renderHint('de')
    fireEvent.click(screen.getByRole('button', { name: 'Ändern' }))
    expect(screen.getByRole('button', { name: 'Ändern' })).toHaveAttribute('aria-expanded', 'true')
    const list = screen.getByRole('list', { name: 'Sprache wählen' })
    const names = Array.from(list.querySelectorAll('button')).map(b => b.textContent)
    expect(names).toEqual(['English', 'Deutsch', 'Русский', 'Ελληνικά', 'العربية', 'עברית'])
    expect(list.querySelector('button[lang="de"]')).toHaveAttribute('aria-current', 'true')
  })

  it('Klick auf eine Sprache navigiert auf /{lang}/… mit Query-String und setzt beide Cookies', () => {
    window.history.replaceState(null, '', '/de/shops?q=katzenfutter&page=2')
    renderHint('de')
    fireEvent.click(screen.getByRole('button', { name: 'Ändern' }))
    fireEvent.click(screen.getByRole('button', { name: 'Русский' }))
    expect(mockPush).toHaveBeenCalledWith('/ru/shops?q=katzenfutter&page=2')
    expect(jar.app_lang).toBe('ru')
    expect(jar[LANG_HINT_COOKIE]).toBe('1')
    expect(hint()).toBeNull()
  })

  it('Klick auf die aktuelle Sprache bestätigt nur (keine Navigation)', () => {
    renderHint('de')
    fireEvent.click(screen.getByRole('button', { name: 'Ändern' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deutsch' }))
    expect(mockPush).not.toHaveBeenCalled()
    expect(jar[LANG_HINT_COOKIE]).toBe('1')
    expect(hint()).toBeNull()
  })

  it('Escape klappt die Liste zu und gibt den Fokus an "Ändern" zurück', () => {
    renderHint('de')
    const toggle = screen.getByRole('button', { name: 'Ändern' })
    fireEvent.click(toggle)
    fireEvent.keyDown(screen.getByRole('button', { name: 'English' }), { key: 'Escape' })
    expect(screen.queryByRole('list')).toBeNull()
    expect(document.activeElement).toBe(toggle)
  })

  it('buildLangHintTarget: Root ohne Trailing Slash, Unterseiten mit localePath', () => {
    expect(buildLangHintTarget('de', '/en', '')).toBe('/de')
    expect(buildLangHintTarget('ar', '/en/', '?x=1')).toBe('/ar?x=1')
    expect(buildLangHintTarget('he', '/de/products/abc', '')).toBe('/he/products/abc')
  })
})

// ---- Browsersprachen-Vorschlag ----

describe('LanguageHint — Browsersprachen-Vorschlag', () => {
  it('schlägt eine abweichende, unterstützte Browsersprache vor ("Русский?")', () => {
    mockLanguages = ['ru-RU', 'en']
    renderHint('de')
    const btn = screen.getByTestId('language-hint-suggestion')
    expect(btn).toHaveTextContent('Русский?')
    expect(btn).toHaveAttribute('lang', 'ru')
    expect(btn).toHaveAccessibleName('Zu Русский wechseln')
    fireEvent.click(btn)
    expect(mockPush).toHaveBeenCalledWith('/ru/shops')
  })

  it('kein Vorschlag, wenn Browsersprache = Seitensprache', () => {
    mockLanguages = ['de-AT']
    renderHint('de')
    expect(screen.queryByTestId('language-hint-suggestion')).toBeNull()
  })

  it('kein Vorschlag bei nicht unterstützter Browsersprache (kein Fallback auf en)', () => {
    mockLanguages = ['fr-FR', 'it']
    renderHint('de')
    expect(screen.queryByTestId('language-hint-suggestion')).toBeNull()
    expect(detectSupportedBrowserLang()).toBeNull()
  })

  it('nimmt die erste unterstützte Sprache aus navigator.languages', () => {
    mockLanguages = ['fr-FR', 'he-IL', 'ru']
    expect(detectSupportedBrowserLang()).toBe('he')
  })
})

// ---- RTL ----

describe('LanguageHint — RTL', () => {
  it.each([
    ['ar', 'اختيار اللغة', 'اللغة: العربية', 'تغيير'],
    ['he', 'בחירת שפה', 'שפה: עברית', 'שינוי'],
  ] as const)('%s: Texte in Seitensprache, logische Positionierung statt left/right', (lang, region, label, change) => {
    mockPathname = `/${lang}/shops`
    mockLanguages = [lang]
    renderHint(lang)
    const el = screen.getByRole('region', { name: region })
    expect(el).toHaveTextContent(label)
    expect(screen.getByRole('button', { name: change })).toBeInTheDocument()
    // start-*/ms-*/ps-* spiegeln sich mit html[dir=rtl] automatisch
    expect(el.className).toMatch(/\bstart-3\b/)
    expect(el.className).not.toMatch(/\b(left|right)-\d/)
  })
})
