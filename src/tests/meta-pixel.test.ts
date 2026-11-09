import { describe, it, expect, vi, afterEach } from 'vitest'
import { trackPixelEvent, PixelEvents, trackCompleteRegistrationOnce, buildMetaPixelInitScript, _resetRegistrationDedupeForTests } from '@/lib/meta-pixel'

afterEach(() => {
  _resetRegistrationDedupeForTests()
  try { window.sessionStorage.clear() } catch { /* node env */ }
  vi.unstubAllGlobals()
})

describe('trackPixelEvent', () => {
  it('is a no-op when window.fbq is not defined', () => {
    // fbq not set — should not throw
    expect(() => trackPixelEvent(PixelEvents.PageView)).not.toThrow()
  })

  it('calls window.fbq with event name when defined', () => {
    const fbq = vi.fn()
    vi.stubGlobal('fbq', fbq)
    trackPixelEvent(PixelEvents.PageView)
    expect(fbq).toHaveBeenCalledWith('track', 'PageView')
  })

  it('passes params when provided', () => {
    const fbq = vi.fn()
    vi.stubGlobal('fbq', fbq)
    trackPixelEvent(PixelEvents.Search, { search_string: 'coffee' })
    expect(fbq).toHaveBeenCalledWith('track', 'Search', { search_string: 'coffee' })
  })

  it('passes ViewContent params correctly', () => {
    const fbq = vi.fn()
    vi.stubGlobal('fbq', fbq)
    trackPixelEvent(PixelEvents.ViewContent, { content_name: 'Coffee', content_ids: ['slug-1'], content_type: 'product' })
    expect(fbq).toHaveBeenCalledWith('track', 'ViewContent', {
      content_name: 'Coffee',
      content_ids: ['slug-1'],
      content_type: 'product',
    })
  })
})

describe('PixelEvents constants', () => {
  it('has correct values', () => {
    expect(PixelEvents.PageView).toBe('PageView')
    expect(PixelEvents.Search).toBe('Search')
    expect(PixelEvents.ViewContent).toBe('ViewContent')
  })
})

describe('trackCompleteRegistrationOnce', () => {
  function stubBrowser() {
    const store = new Map<string, string>()
    const fbq = vi.fn()
    vi.stubGlobal('window', {
      fbq,
      sessionStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        clear: () => store.clear(),
      },
    })
    return { fbq, store }
  }

  it('has the standard event name', () => {
    expect(PixelEvents.CompleteRegistration).toBe('CompleteRegistration')
  })

  it('sends CompleteRegistration once per registration', () => {
    const { fbq } = stubBrowser()
    expect(trackCompleteRegistrationOnce(42)).toBe(true)
    expect(trackCompleteRegistrationOnce(42)).toBe(false)
    expect(fbq).toHaveBeenCalledTimes(1)
    expect(fbq).toHaveBeenCalledWith('track', 'CompleteRegistration')
  })

  it('dedupes across reloads via sessionStorage', () => {
    const { fbq, store } = stubBrowser()
    store.set('pundo_pixel_reg_7', '1')
    expect(trackCompleteRegistrationOnce(7)).toBe(false)
    expect(fbq).not.toHaveBeenCalled()
  })

  it('sends again for a different registration', () => {
    const { fbq } = stubBrowser()
    trackCompleteRegistrationOnce(1)
    trackCompleteRegistrationOnce(2)
    expect(fbq).toHaveBeenCalledTimes(2)
  })

  it('is a no-op without fbq (no marketing consent) and does not burn the dedupe slot', () => {
    vi.stubGlobal('window', { sessionStorage: { getItem: () => null, setItem: vi.fn() } })
    expect(trackCompleteRegistrationOnce(9)).toBe(false)
  })
})

describe('buildMetaPixelInitScript', () => {
  it('inits the given pixel id, grants consent and tracks PageView', () => {
    const s = buildMetaPixelInitScript('123')
    expect(s).toContain("fbq('init','123')")
    expect(s).toContain("fbq('consent','grant')")
    expect(s).toContain("fbq('track','PageView')")
  })
})
