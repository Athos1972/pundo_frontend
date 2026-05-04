import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// ---- Mocks ----

const mockRefresh = vi.fn()
const mockReload = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}))

// Mock setLangCookie so it doesn't try to write document.cookie in JSDOM
vi.mock('@/lib/lang', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/lang')>()
  return { ...actual, setLangCookie: vi.fn() }
})

// We will control navigator.languages per-test via Object.defineProperty
// Default: English
let mockLanguages: readonly string[] = ['en-US']
Object.defineProperty(navigator, 'languages', {
  get: () => mockLanguages,
  configurable: true,
})

// sessionStorage mock
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true })

// window.location.reload mock
Object.defineProperty(window, 'location', {
  value: { ...window.location, reload: mockReload },
  writable: true,
})

// ---- Helper: control document.cookie ----

let _cookieValue = ''

function setCookieLang(lang: string) {
  _cookieValue = `app_lang=${lang}`
  Object.defineProperty(document, 'cookie', {
    get: () => _cookieValue,
    configurable: true,
  })
}

function clearCookieLang() {
  _cookieValue = ''
  Object.defineProperty(document, 'cookie', {
    get: () => _cookieValue,
    configurable: true,
  })
}

// ---- Imports after mocks ----

import { LanguagePickerOverlay, useLanguagePickerTrigger } from '@/components/ui/LanguagePickerOverlay'
import { detectBrowserLang } from '@/lib/lang'
import * as LangModule from '@/lib/lang'
import { SPLASH_SESSION_KEY } from '@/lib/splash'
import { renderHook } from '@testing-library/react'

// ---- Setup / teardown ----

beforeEach(() => {
  mockRefresh.mockClear()
  mockReload.mockClear()
  vi.mocked(LangModule.setLangCookie).mockClear()
  sessionStorageMock.clear()
  clearCookieLang()
  mockLanguages = ['en-US']
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ============================================================
// T2 — detectBrowserLang unit tests
// ============================================================

describe('detectBrowserLang', () => {
  it("maps 'de-AT' to 'de'", () => {
    mockLanguages = ['de-AT']
    expect(detectBrowserLang()).toBe('de')
  })

  it("maps 'fr-FR' to 'en' (fallback)", () => {
    mockLanguages = ['fr-FR']
    expect(detectBrowserLang()).toBe('en')
  })

  it("maps 'ar' to 'ar'", () => {
    mockLanguages = ['ar']
    expect(detectBrowserLang()).toBe('ar')
  })

  it("maps 'ru-RU' to 'ru'", () => {
    mockLanguages = ['ru-RU']
    expect(detectBrowserLang()).toBe('ru')
  })

  it("maps 'el-GR' to 'el'", () => {
    mockLanguages = ['el-GR']
    expect(detectBrowserLang()).toBe('el')
  })

  it("maps 'he' to 'he'", () => {
    mockLanguages = ['he']
    expect(detectBrowserLang()).toBe('he')
  })

  it('uses first matching candidate in array', () => {
    mockLanguages = ['fr-FR', 'ru-RU', 'en']
    expect(detectBrowserLang()).toBe('ru')
  })

  it('falls back to en when no candidates match', () => {
    mockLanguages = ['fr', 'es', 'pt']
    expect(detectBrowserLang()).toBe('en')
  })
})

// ============================================================
// useLanguagePickerTrigger — hook tests
// ============================================================

describe('useLanguagePickerTrigger', () => {
  it('shouldShow=false when app_lang cookie is present', async () => {
    setCookieLang('de')
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1') // splash already ran

    const { result } = renderHook(() => useLanguagePickerTrigger())
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(result.current.shouldShow).toBe(false)
  })

  it('shouldShow=true after splash delay when no cookie and splash already ran', async () => {
    clearCookieLang()
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1')

    const { result } = renderHook(() => useLanguagePickerTrigger())
    expect(result.current.shouldShow).toBe(false) // before timer

    await act(async () => { vi.advanceTimersByTime(200) })
    expect(result.current.shouldShow).toBe(true)
  })

  it('shouldShow=true only after SPLASH_OUTRO_MS + buffer when splash has not yet run', async () => {
    clearCookieLang()
    // No sessionStorage entry — splash not yet run

    const { result } = renderHook(() => useLanguagePickerTrigger())
    await act(async () => { vi.advanceTimersByTime(2500) }) // just at boundary
    expect(result.current.shouldShow).toBe(false)

    await act(async () => { vi.advanceTimersByTime(200) }) // over the buffer
    expect(result.current.shouldShow).toBe(true)
  })

  it("preselected follows navigator.languages 'ru-RU'", async () => {
    mockLanguages = ['ru-RU']
    clearCookieLang()
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1')

    const { result } = renderHook(() => useLanguagePickerTrigger())
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(result.current.preselected).toBe('ru')
  })

  it("preselected falls back to 'en' for unsupported browser lang 'fr-FR'", async () => {
    mockLanguages = ['fr-FR']
    clearCookieLang()
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1')

    const { result } = renderHook(() => useLanguagePickerTrigger())
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(result.current.preselected).toBe('en')
  })
})

// ============================================================
// LanguagePickerOverlay — component tests
// ============================================================

describe('LanguagePickerOverlay — visibility', () => {
  it('renders null when app_lang cookie is set', async () => {
    setCookieLang('de')
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1')

    const { container } = render(<LanguagePickerOverlay serverLang="de" />)
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders dialog when no cookie and splash already ran', async () => {
    clearCookieLang()
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1')

    render(<LanguagePickerOverlay serverLang="en" />)
    await act(async () => { vi.advanceTimersByTime(200) })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has aria-modal=true on the dialog', async () => {
    clearCookieLang()
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1')

    render(<LanguagePickerOverlay serverLang="en" />)
    await act(async () => { vi.advanceTimersByTime(200) })

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })
})

describe('LanguagePickerOverlay — language options', () => {
  async function renderOpen(serverLang: 'en' | 'de' | 'ru' | 'el' | 'ar' | 'he' = 'en') {
    clearCookieLang()
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1')
    render(<LanguagePickerOverlay serverLang={serverLang} />)
    await act(async () => { vi.advanceTimersByTime(200) })
  }

  it('renders 6 radio options', async () => {
    await renderOpen()
    expect(screen.getAllByRole('radio')).toHaveLength(6)
  })

  it("shows 'Русский' with aria-checked=true when browser lang is ru-RU (AC3)", async () => {
    mockLanguages = ['ru-RU']
    await renderOpen()
    const ruOption = screen.getAllByRole('radio').find(el => el.textContent?.includes('Русский'))
    expect(ruOption).toBeDefined()
    expect(ruOption).toHaveAttribute('aria-checked', 'true')
  })

  it("shows 'English' with aria-checked=true when browser lang is fr-FR (AC4)", async () => {
    mockLanguages = ['fr-FR']
    await renderOpen()
    const enOption = screen.getAllByRole('radio').find(el => el.textContent?.includes('English'))
    expect(enOption).toBeDefined()
    expect(enOption).toHaveAttribute('aria-checked', 'true')
  })

  it('exactly one option is aria-checked=true', async () => {
    await renderOpen()
    const checked = screen.getAllByRole('radio').filter(el => el.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
  })

  it('clicking a language option updates selection', async () => {
    await renderOpen('en')
    const deOption = screen.getAllByRole('radio').find(el => el.textContent?.includes('Deutsch'))!
    fireEvent.click(deOption)
    expect(deOption).toHaveAttribute('aria-checked', 'true')
  })
})

describe('LanguagePickerOverlay — confirm behaviour', () => {
  async function renderOpen(serverLang: 'en' | 'de' | 'ru' | 'el' | 'ar' | 'he' = 'en') {
    clearCookieLang()
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1')
    render(<LanguagePickerOverlay serverLang={serverLang} />)
    await act(async () => { vi.advanceTimersByTime(200) })
  }

  it('Confirm with same lang as serverLang calls router.refresh, not reload (AC5)', async () => {
    mockLanguages = ['en-US']
    await renderOpen('en')

    const confirmBtn = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(confirmBtn)

    expect(mockRefresh).toHaveBeenCalledOnce()
    expect(mockReload).not.toHaveBeenCalled()
  })

  it('Confirm with different lang from serverLang calls window.location.reload (AC6)', async () => {
    mockLanguages = ['de-DE']
    await renderOpen('en')

    const confirmBtn = screen.getByRole('button', { name: /Weiter/i })
    fireEvent.click(confirmBtn)

    expect(mockReload).toHaveBeenCalledOnce()
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})

describe('LanguagePickerOverlay — keyboard non-dismiss', () => {
  async function renderOpen() {
    clearCookieLang()
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1')
    render(<LanguagePickerOverlay serverLang="en" />)
    await act(async () => { vi.advanceTimersByTime(200) })
  }

  it('ESC key does NOT close the overlay (not skippable)', async () => {
    await renderOpen()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('backdrop click does NOT close the overlay (not skippable)', async () => {
    await renderOpen()
    // click the outer backdrop (parent of dialog)
    const backdrop = screen.getByRole('dialog').parentElement!
    fireEvent.click(backdrop)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('LanguagePickerOverlay — tap targets', () => {
  it('all radio options have min-h-[44px]', async () => {
    clearCookieLang()
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1')
    render(<LanguagePickerOverlay serverLang="en" />)
    await act(async () => { vi.advanceTimersByTime(200) })

    for (const opt of screen.getAllByRole('radio')) {
      expect(opt.className).toContain('min-h-[44px]')
    }
  })
})

describe('LanguagePickerOverlay — translations', () => {
  it('title updates live when user selects another language', async () => {
    clearCookieLang()
    sessionStorageMock.setItem(SPLASH_SESSION_KEY, '1')
    mockLanguages = ['en-US']
    render(<LanguagePickerOverlay serverLang="en" />)
    await act(async () => { vi.advanceTimersByTime(200) })

    expect(screen.getByText('Choose your language')).toBeInTheDocument()

    // Select German
    const deOption = screen.getAllByRole('radio').find(el => el.textContent?.includes('Deutsch'))!
    fireEvent.click(deOption)

    expect(screen.getByText('Sprache wählen')).toBeInTheDocument()
    expect(screen.getByText('Weiter')).toBeInTheDocument()
  })
})
