import { describe, it, expect, vi, afterEach } from 'vitest'
import { trackPixelEvent, PixelEvents } from '@/lib/meta-pixel'

afterEach(() => {
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
