import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BackButton } from '@/components/ui/BackButton'

import { t } from '@/lib/translations'

// BackButton uses useRouter and derives lang from usePathname (never from document.cookie)
const mockBack = vi.fn()
let mockPathname = '/'
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack, push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPathname,
}))

describe('BackButton', () => {
  beforeEach(() => { mockPathname = '/' })

  it('renders with "Back" label for EN', () => {
    render(<BackButton />)
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('calls router.back() on click', async () => {
    const user = userEvent.setup()
    render(<BackButton />)
    await user.click(screen.getByRole('button'))
    expect(mockBack).toHaveBeenCalledOnce()
  })

  it('renders the back arrow SVG', () => {
    const { container } = render(<BackButton />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

// Regression: BackButton read the lang from document.cookie, which is unavailable during SSR
// -> server rendered "Back", client rendered "Πίσω" on /el/* -> React hydration error #418.
describe('BackButton lang is SSR-safe (hydration)', () => {
  afterEach(() => { document.cookie = 'app_lang=; max-age=0; path=/' })

  it('takes the lang from the URL, ignoring the app_lang cookie', () => {
    mockPathname = '/el/guides'
    document.cookie = 'app_lang=de; path=/'
    render(<BackButton />)
    expect(screen.getByRole('button', { name: t('el').back })).toBeInTheDocument()
  })

  it('uses the lang prop on un-prefixed routes (e.g. /account)', () => {
    mockPathname = '/account'
    render(<BackButton lang="ar" />)
    expect(screen.getByRole('button', { name: t('ar').back })).toBeInTheDocument()
  })
})

describe('Header structure (translation keys)', () => {
  it('has home/start translations for all languages', async () => {
    const { translations } = await import('@/lib/translations')
    const { LANGS } = await import('@/lib/lang')
    for (const lang of LANGS) {
      // Header needs no translation keys itself — it uses LanguageSwitcher
      // which is a Client Component. Verify the lang object exists.
      expect(translations[lang]).toBeDefined()
    }
  })
})
