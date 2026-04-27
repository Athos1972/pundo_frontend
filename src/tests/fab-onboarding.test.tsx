import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { t } from '@/lib/translations'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('@/components/auth/SessionProvider', () => ({
  useSession: () => ({ user: null, is_authenticated: false }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ─── FAB Translation Keys ─────────────────────────────────────────────────────

describe('FAB Onboarding translation keys (F4010)', () => {
  const LANGS = ['en', 'de', 'ru', 'el', 'ar', 'he']
  const FAB_KEYS = [
    'fab_homesick_label_pundo',
    'fab_homesick_label_naidivse',
    'fab_spotted_label',
    'fab_homesick_onboarding_text',
    'fab_spotted_onboarding_text',
    'fab_dismiss_label',
    'homesick_teaser_headline',
    'homesick_teaser_text',
    'homesick_teaser_cta',
    'nav_homesick',
  ] as const

  for (const lang of LANGS) {
    it(`${lang}: all FAB keys present and non-empty`, () => {
      const tr = t(lang)
      for (const key of FAB_KEYS) {
        expect(
          tr[key],
          `${lang}: missing key "${key}"`
        ).toBeTruthy()
      }
    })
  }

  it('naidivse label for ru is Ностальгия', () => {
    expect(t('ru').fab_homesick_label_naidivse).toBe('Ностальгия')
  })

  it('pundo label for en is AI Search', () => {
    expect(t('en').fab_homesick_label_pundo).toBe('AI Search')
  })

  it('pundo label for de is KI-Suche', () => {
    expect(t('de').fab_homesick_label_pundo).toBe('KI-Suche')
  })
})

// ─── BrandConfig homesickTeaser flag ─────────────────────────────────────────

describe('BrandConfig.features.homesickTeaser (F4010)', () => {
  it('pundo has homesickTeaser = false', async () => {
    const { pundoConfig } = await import('@/config/brands/pundo')
    expect(pundoConfig.features.homesickTeaser).toBe(false)
  })

  it('naidivse has homesickTeaser = true', async () => {
    const { naidivseConfig } = await import('@/config/brands/naidivse')
    expect(naidivseConfig.features.homesickTeaser).toBe(true)
  })

  it('naidivse nav includes nav_homesick entry pointing to /nostalgia', async () => {
    const { naidivseConfig } = await import('@/config/brands/naidivse')
    const entry = naidivseConfig.nav?.find((n) => n.key === 'nav_homesick')
    expect(entry).toBeDefined()
    expect(entry?.href).toBe('/nostalgia')
  })

  it('pundo nav does not include nav_homesick entry', async () => {
    const { pundoConfig } = await import('@/config/brands/pundo')
    const entry = pundoConfig.nav?.find((n) => n.key === 'nav_homesick')
    expect(entry).toBeUndefined()
  })
})

// ─── useFabOnboarding hook ────────────────────────────────────────────────────

// Mock localStorage for hook tests
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

describe('useFabOnboarding', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorageMock.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorageMock.clear()
  })

  it('starts with visible=false (SSR-safe initial state)', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useFabOnboarding } = await import('@/lib/useFabOnboarding')

    const { result } = renderHook(() =>
      useFabOnboarding({ storageKey: 'test_key', delayMs: 3000 })
    )

    expect(result.current.visible).toBe(false)
  })

  it('shows popout after delayMs', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useFabOnboarding } = await import('@/lib/useFabOnboarding')

    const { result } = renderHook(() =>
      useFabOnboarding({ storageKey: 'test_key_delay', delayMs: 3000 })
    )

    expect(result.current.visible).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.visible).toBe(true)
  })

  it('does not show if localStorage flag is set', async () => {
    localStorageMock.setItem('test_key_flag', '1')

    const { renderHook } = await import('@testing-library/react')
    const { useFabOnboarding } = await import('@/lib/useFabOnboarding')

    const { result } = renderHook(() =>
      useFabOnboarding({ storageKey: 'test_key_flag', delayMs: 100 })
    )

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.visible).toBe(false)
  })

  it('dismiss() sets localStorage flag and hides popout', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useFabOnboarding } = await import('@/lib/useFabOnboarding')

    const { result } = renderHook(() =>
      useFabOnboarding({ storageKey: 'test_key_dismiss', delayMs: 100 })
    )

    await act(async () => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.visible).toBe(true)

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.visible).toBe(false)
    expect(localStorageMock.getItem('test_key_dismiss')).toBe('1')
  })

  it('auto-dismisses after autoDismissMs and sets flag', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useFabOnboarding } = await import('@/lib/useFabOnboarding')

    const { result } = renderHook(() =>
      useFabOnboarding({
        storageKey: 'test_key_auto',
        delayMs: 1000,
        autoDismissMs: 2000,
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.visible).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.visible).toBe(false)
    expect(localStorageMock.getItem('test_key_auto')).toBe('1')
  })

  it('does not show when enabled=false', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useFabOnboarding } = await import('@/lib/useFabOnboarding')

    const { result } = renderHook(() =>
      useFabOnboarding({ storageKey: 'test_key_disabled', delayMs: 100, enabled: false })
    )

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.visible).toBe(false)
  })
})

// ─── FABOnboardingPopout component ───────────────────────────────────────────

describe('FABOnboardingPopout', () => {
  it('renders nothing when visible=false', async () => {
    const { FABOnboardingPopout } = await import('@/components/ui/FABOnboardingPopout')

    const { container } = render(
      <FABOnboardingPopout
        text="Test text"
        visible={false}
        onDismiss={vi.fn()}
        dismissLabel="Close"
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders text when visible=true', async () => {
    const { FABOnboardingPopout } = await import('@/components/ui/FABOnboardingPopout')

    render(
      <FABOnboardingPopout
        text="Missing something from home?"
        visible={true}
        onDismiss={vi.fn()}
        dismissLabel="Dismiss"
      />
    )

    expect(screen.getByText('Missing something from home?')).toBeTruthy()
  })

  it('calls onDismiss when X button is clicked', async () => {
    const { FABOnboardingPopout } = await import('@/components/ui/FABOnboardingPopout')
    const onDismiss = vi.fn()

    render(
      <FABOnboardingPopout
        text="Test"
        visible={true}
        onDismiss={onDismiss}
        dismissLabel="Close"
      />
    )

    const btn = screen.getByLabelText('Close')
    fireEvent.click(btn)
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})

// ─── HomesickTeaser component ─────────────────────────────────────────────────

describe('HomesickTeaser', () => {
  it('renders headline from translations', async () => {
    const { HomesickTeaser } = await import('@/components/home/HomesickTeaser')
    const { naidivseConfig } = await import('@/config/brands/naidivse')
    const tr = t('en')

    render(<HomesickTeaser brand={naidivseConfig} lang="en" />)

    expect(screen.getByText(tr.homesick_teaser_headline)).toBeTruthy()
    expect(screen.getByText(tr.homesick_teaser_cta)).toBeTruthy()
  })
})
