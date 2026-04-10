import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef } from 'react'
import { useInfiniteScroll } from '@/lib/useInfiniteScroll'

// IntersectionObserver mock — must be a class so `new` works
let observerCallback: IntersectionObserverCallback | null = null
let disconnectMock: ReturnType<typeof vi.fn>
let observeMock: ReturnType<typeof vi.fn>

function createObserverClass() {
  disconnectMock = vi.fn()
  observeMock = vi.fn()
  return class MockIntersectionObserver {
    constructor(cb: IntersectionObserverCallback) {
      observerCallback = cb
    }
    observe = observeMock
    disconnect = disconnectMock
    unobserve = vi.fn()
    takeRecords = vi.fn(() => [])
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds = []
  }
}

function triggerIntersection(isIntersecting: boolean) {
  observerCallback?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', createObserverClass())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    observerCallback = null
  })

  it('ruft onLoadMore auf wenn Sentinel sichtbar wird', () => {
    const onLoadMore = vi.fn()
    const { result } = renderHook(() => {
      const rootRef = useRef<HTMLDivElement>(document.createElement('div'))
      const sentinelEl = document.createElement('div')
      const scroll = useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false, rootRef })
      // Manuell sentinel-ref setzen
      ;(scroll.sentinelRef as React.MutableRefObject<HTMLDivElement>).current = sentinelEl
      return scroll
    })

    expect(result.current.isSupported).toBe(true)
    act(() => triggerIntersection(true))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('ruft onLoadMore NICHT auf wenn isLoading=true', () => {
    const onLoadMore = vi.fn()
    renderHook(() => {
      const rootRef = useRef<HTMLDivElement>(document.createElement('div'))
      return useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: true, rootRef })
    })

    act(() => triggerIntersection(true))
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('ruft onLoadMore NICHT auf wenn hasMore=false', () => {
    const onLoadMore = vi.fn()
    renderHook(() => {
      const rootRef = useRef<HTMLDivElement>(document.createElement('div'))
      return useInfiniteScroll({ onLoadMore, hasMore: false, isLoading: false, rootRef })
    })

    act(() => triggerIntersection(true))
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('ruft onLoadMore NICHT auf wenn Sentinel nicht schneidet (isIntersecting=false)', () => {
    const onLoadMore = vi.fn()
    renderHook(() => {
      const rootRef = useRef<HTMLDivElement>(document.createElement('div'))
      const scroll = useInfiniteScroll({ onLoadMore, hasMore: true, isLoading: false, rootRef })
      ;(scroll.sentinelRef as React.MutableRefObject<HTMLDivElement>).current = document.createElement('div')
      return scroll
    })

    act(() => triggerIntersection(false))
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('disconnectet Observer bei Unmount', () => {
    const { unmount } = renderHook(() => {
      const rootRef = useRef<HTMLDivElement>(document.createElement('div'))
      const scroll = useInfiniteScroll({ onLoadMore: vi.fn(), hasMore: true, isLoading: false, rootRef })
      ;(scroll.sentinelRef as React.MutableRefObject<HTMLDivElement>).current = document.createElement('div')
      return scroll
    })

    unmount()
    expect(disconnectMock).toHaveBeenCalled()
  })

  it('disconnectet Observer wenn hasMore auf false wechselt', () => {
    const onLoadMore = vi.fn()
    const { rerender } = renderHook(
      ({ hasMore }: { hasMore: boolean }) => {
        const rootRef = useRef<HTMLDivElement>(document.createElement('div'))
        const scroll = useInfiniteScroll({ onLoadMore, hasMore, isLoading: false, rootRef })
        ;(scroll.sentinelRef as React.MutableRefObject<HTMLDivElement>).current = document.createElement('div')
        return scroll
      },
      { initialProps: { hasMore: true } }
    )

    rerender({ hasMore: false })
    // Observer wurde beim cleanup des vorigen Effects disconnected
    expect(disconnectMock).toHaveBeenCalled()
  })

  it('gibt isSupported=false zurück wenn IntersectionObserver nicht verfügbar', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { result } = renderHook(() => {
      const rootRef = useRef<HTMLDivElement>(document.createElement('div'))
      return useInfiniteScroll({ onLoadMore: vi.fn(), hasMore: true, isLoading: false, rootRef })
    })

    expect(result.current.isSupported).toBe(false)
  })
})
