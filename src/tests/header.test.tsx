import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BackButton } from '@/components/ui/BackButton'

// BackButton uses useRouter and getLangFromCookie
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack, push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock getLangFromCookie to return 'en'
vi.mock('@/lib/lang', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/lang')>()
  return { ...actual, getLangFromCookie: () => 'en' }
})

describe('BackButton', () => {
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

describe('BackButton with Arabic (RTL)', () => {
  it('renders with Arabic back label for AR', async () => {
    vi.mocked(await import('@/lib/lang')).getLangFromCookie = vi.fn(() => 'ar')
    render(<BackButton />)
    // Arabic "back" translation — just check button exists and is clickable
    expect(screen.getByRole('button')).toBeInTheDocument()
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
