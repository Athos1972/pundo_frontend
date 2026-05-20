import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ---- Mocks (must be declared before imports that use them) ----

const mockRefresh = vi.fn()
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('@/lib/lang', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/lang')>()
  return {
    ...actual,
    setLangCookie: vi.fn(),
  }
})

// ---- Imports after mocks ----

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import * as LangModule from '@/lib/lang'

// LANG_NATIVE_NAMES is not mocked — use vi.importActual to access the real constant
const { LANG_NATIVE_NAMES } = await vi.importActual<typeof import('@/lib/lang')>('@/lib/lang')

// ---- Helpers ----

/** Render LanguageSwitcher and return the mobile trigger button (aria-haspopup=listbox) */
function renderMobile(current: 'en' | 'de' | 'ru' | 'el' | 'ar' | 'he' = 'en', dark?: boolean) {
  const result = render(<LanguageSwitcher current={current} dark={dark} />)
  const trigger = result.container.querySelector(
    'button[aria-haspopup="listbox"]'
  ) as HTMLButtonElement | null
  return { ...result, trigger }
}

beforeEach(() => {
  mockRefresh.mockClear()
  mockPush.mockClear()
  vi.mocked(LangModule.setLangCookie).mockClear()
})

// ---- Tests ----

describe('LanguageSwitcher — Mobile Trigger', () => {
  it('renders a trigger button with aria-haspopup="listbox"', () => {
    const { trigger } = renderMobile('de')
    expect(trigger).not.toBeNull()
    expect(trigger!).toHaveAttribute('aria-haspopup', 'listbox')
  })

  it('trigger has aria-label from change_language translation (EN)', () => {
    const { trigger } = renderMobile('en')
    expect(trigger!).toHaveAttribute('aria-label', 'Change language')
  })

  it('trigger has aria-label from change_language translation (DE)', () => {
    const { trigger } = renderMobile('de')
    expect(trigger!).toHaveAttribute('aria-label', 'Sprache wechseln')
  })

  it('trigger has aria-label from change_language translation (AR)', () => {
    const { trigger } = renderMobile('ar')
    expect(trigger!).toHaveAttribute('aria-label', 'تغيير اللغة')
  })

  it('trigger has aria-label from change_language translation (HE)', () => {
    const { trigger } = renderMobile('he')
    expect(trigger!).toHaveAttribute('aria-label', 'שינוי שפה')
  })

  it('trigger is collapsed by default (aria-expanded=false)', () => {
    const { trigger } = renderMobile('en')
    expect(trigger!).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders globe SVG and chevron SVG inside trigger', () => {
    const { trigger } = renderMobile('en')
    const svgs = trigger!.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(2)
  })
})

describe('LanguageSwitcher — Popover open/close', () => {
  it('click on trigger opens the popover (listbox visible)', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('trigger shows aria-expanded=true when open', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)
    expect(trigger!).toHaveAttribute('aria-expanded', 'true')
  })

  it('popover contains exactly 6 options', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)
    expect(screen.getAllByRole('option')).toHaveLength(6)
  })

  it('popover displays native language names', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)
    for (const name of Object.values(LANG_NATIVE_NAMES)) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('active language option has aria-selected=true', () => {
    const { trigger } = renderMobile('de')
    fireEvent.click(trigger!)
    const options = screen.getAllByRole('option')
    const activeOption = options.find(o => o.getAttribute('aria-selected') === 'true')
    expect(activeOption).toBeDefined()
    expect(activeOption!.textContent).toContain('Deutsch')
  })

  it('exactly one option has aria-selected=true', () => {
    const { trigger } = renderMobile('ru')
    fireEvent.click(trigger!)
    const selected = screen.getAllByRole('option').filter(
      o => o.getAttribute('aria-selected') === 'true'
    )
    expect(selected).toHaveLength(1)
  })

  it('outside click closes the popover without language change', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(LangModule.setLangCookie).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('Escape key closes the popover', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('LanguageSwitcher — Language selection', () => {
  it('clicking an option calls setLangCookie with correct lang', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)

    const deOption = screen.getAllByRole('option').find(o => o.textContent?.includes('Deutsch'))
    expect(deOption).toBeDefined()
    fireEvent.click(deOption!)

    expect(LangModule.setLangCookie).toHaveBeenCalledWith('de')
  })

  it('clicking an option calls router.push() with lang-prefixed URL', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)

    const ruOption = screen.getAllByRole('option').find(o => o.textContent?.includes('Русский'))
    expect(ruOption).toBeDefined()
    fireEvent.click(ruOption!)

    // pathname is '/' → bare path after stripping lang is '/' → push to '/ru'
    expect(mockPush).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith('/ru')
  })

  it('clicking an option closes the popover', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)

    const elOption = screen.getAllByRole('option').find(o => o.textContent?.includes('Ελληνικά'))
    expect(elOption).toBeDefined()
    fireEvent.click(elOption!)

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('LanguageSwitcher — Keyboard navigation', () => {
  it('ArrowDown moves focus to next item', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)

    const listbox = screen.getByRole('listbox')
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })

    // focusIndex started at 0 (en), ArrowDown moves to 1 (de)
    const options = screen.getAllByRole('option')
    const focused = options.find(o => o.getAttribute('tabindex') === '0')
    expect(focused).toBeDefined()
    // The focused item is at index 1 (de), which is NOT the active option (en is active)
    expect(focused).toBe(options[1])
  })

  it('ArrowUp wraps around to last item from first', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)

    const listbox = screen.getByRole('listbox')
    fireEvent.keyDown(listbox, { key: 'ArrowUp' })

    const options = screen.getAllByRole('option')
    const focused = options.find(o => o.getAttribute('tabindex') === '0')
    // Wraps to last item (index 5)
    expect(focused).toBe(options[5])
  })

  it('Enter on a focused option selects and closes', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)

    const listbox = screen.getByRole('listbox')
    // ArrowDown to move focus to DE (index 1)
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })

    const options = screen.getAllByRole('option')
    const focused = options.find(o => o.getAttribute('tabindex') === '0')
    expect(focused).toBeDefined()
    fireEvent.keyDown(focused!, { key: 'Enter' })

    expect(LangModule.setLangCookie).toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('LanguageSwitcher — Tap target size', () => {
  it('list items have min-h-[44px] class for tap target compliance', () => {
    const { trigger } = renderMobile('en')
    fireEvent.click(trigger!)

    const options = screen.getAllByRole('option')
    for (const opt of options) {
      expect(opt.className).toContain('min-h-[44px]')
    }
  })
})

describe('LanguageSwitcher — Desktop variant present', () => {
  it('renders desktop chip buttons (6 lang chips with title attribute)', () => {
    render(<LanguageSwitcher current="en" />)
    const chipButtons = document.querySelectorAll('button[title]')
    // 6 desktop lang chip buttons
    expect(chipButtons.length).toBeGreaterThanOrEqual(6)
  })
})

describe('LANG_NATIVE_NAMES constant', () => {
  it('has entries for all 6 languages', () => {
    const langs = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const
    for (const l of langs) {
      expect(LANG_NATIVE_NAMES[l]).toBeTruthy()
    }
  })

  it('returns correct native names', () => {
    expect(LANG_NATIVE_NAMES.en).toBe('English')
    expect(LANG_NATIVE_NAMES.de).toBe('Deutsch')
    expect(LANG_NATIVE_NAMES.el).toBe('Ελληνικά')
    expect(LANG_NATIVE_NAMES.ru).toBe('Русский')
    expect(LANG_NATIVE_NAMES.ar).toBe('العربية')
    expect(LANG_NATIVE_NAMES.he).toBe('עברית')
  })
})
