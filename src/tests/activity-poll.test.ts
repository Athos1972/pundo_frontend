// =============================================================================
// src/tests/activity-poll.test.ts
//
// Unit tests for useActivityPoll (F4700).
// Tests: initial state, polling, visibility pause/resume, backoff,
// deduplication, trim to 20 items.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/activity-api', () => ({
  getActivity: vi.fn(),
}))

vi.mock('@/lib/activity-events', () => ({
  assertNoPii: vi.fn((p: unknown) => p),
}))

import { getActivity } from '@/lib/activity-api'
const mockGetActivity = vi.mocked(getActivity)

import type { ActivityEvent } from '@/types/activity'

function makeEvent(id: string, createdAt = '2026-04-27T10:00:00Z'): ActivityEvent {
  return {
    id,
    event_type: 'search_performed',
    payload: { term: 'Pelmeni', city: 'Paphos' },
    created_at: createdAt,
  }
}

function makeResponse(events: ActivityEvent[], next_since: string | null = null) {
  return { events, next_since }
}

/** Flush microtasks and settled promises */
async function flushAsync() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useActivityPoll — initial state', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockGetActivity.mockResolvedValue(makeResponse([]))
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns initialEvents immediately without polling', async () => {
    const { useActivityPoll } = await import('@/lib/useActivityPoll')
    const initial = [makeEvent('e1')]
    const { result } = renderHook(() =>
      useActivityPoll({ brand: 'naidivse', lang: 'en', initialEvents: initial })
    )
    expect(result.current.events).toHaveLength(1)
    expect(result.current.events[0].id).toBe('e1')
  })
})

describe('useActivityPoll — deduplication', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('does not duplicate events already in the list', async () => {
    const e1 = makeEvent('e1')
    mockGetActivity.mockResolvedValue(makeResponse([e1]))

    const { useActivityPoll } = await import('@/lib/useActivityPoll')
    const { result } = renderHook(() =>
      useActivityPoll({
        brand: 'naidivse',
        lang: 'en',
        initialEvents: [e1],
        pollIntervalMs: 100,
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    await flushAsync()

    expect(result.current.events.filter((e) => e.id === 'e1').length).toBe(1)
  })
})

describe('useActivityPoll — trim to maxItems', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('trims event list to maxItems', async () => {
    const initial = Array.from({ length: 18 }, (_, i) => makeEvent(`old-${i}`))
    const fresh = [makeEvent('new-1'), makeEvent('new-2'), makeEvent('new-3')]
    mockGetActivity.mockResolvedValue(makeResponse(fresh))

    const { useActivityPoll } = await import('@/lib/useActivityPoll')
    const { result } = renderHook(() =>
      useActivityPoll({
        brand: 'naidivse',
        lang: 'en',
        initialEvents: initial,
        pollIntervalMs: 100,
        maxItems: 20,
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    await flushAsync()

    expect(result.current.events.length).toBeLessThanOrEqual(20)
  })
})

describe('useActivityPoll — backoff on error', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('does not crash on fetch error', async () => {
    mockGetActivity.mockRejectedValue(new Error('Network error'))

    const { useActivityPoll } = await import('@/lib/useActivityPoll')
    const { result } = renderHook(() =>
      useActivityPoll({ brand: 'naidivse', lang: 'en', pollIntervalMs: 500 })
    )

    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    await flushAsync()

    // Still alive, events unchanged
    expect(result.current.events).toEqual([])
  })

  it('retries after backoff delay', async () => {
    mockGetActivity
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue(makeResponse([makeEvent('ok')]))

    const { useActivityPoll } = await import('@/lib/useActivityPoll')
    renderHook(() =>
      useActivityPoll({ brand: 'naidivse', lang: 'en', pollIntervalMs: 1_000 })
    )

    // Trigger first (failing) poll
    await act(async () => { vi.advanceTimersByTime(1_000) })
    await flushAsync()

    const callsAfterFail = mockGetActivity.mock.calls.length

    // Advance past backoff (2000ms = 1000 * 2^1)
    await act(async () => { vi.advanceTimersByTime(2_000) })
    await flushAsync()

    expect(mockGetActivity.mock.calls.length).toBeGreaterThan(callsAfterFail)
  })
})

describe('useActivityPoll — visibility pause', () => {
  let visibilityState = 'visible'
  let visibilityListeners: Array<() => void> = []

  beforeEach(() => {
    vi.useFakeTimers()
    visibilityState = 'visible'
    visibilityListeners = []

    Object.defineProperty(document, 'visibilityState', {
      get: () => visibilityState,
      configurable: true,
    })

    vi.spyOn(document, 'addEventListener').mockImplementation(
      (event: string, handler: EventListenerOrEventListenerObject) => {
        if (event === 'visibilitychange') {
          visibilityListeners.push(handler as () => void)
        }
      }
    )

    vi.spyOn(document, 'removeEventListener').mockImplementation(() => {})
    mockGetActivity.mockResolvedValue(makeResponse([]))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('does not poll while page is hidden', async () => {
    visibilityState = 'hidden'

    const { useActivityPoll } = await import('@/lib/useActivityPoll')
    renderHook(() =>
      useActivityPoll({ brand: 'naidivse', lang: 'en', pollIntervalMs: 1_000 })
    )

    await act(async () => { vi.advanceTimersByTime(5_000) })
    await flushAsync()

    expect(mockGetActivity).not.toHaveBeenCalled()
  })

  it('polls immediately when page becomes visible', async () => {
    visibilityState = 'hidden'

    const { useActivityPoll } = await import('@/lib/useActivityPoll')
    renderHook(() =>
      useActivityPoll({ brand: 'naidivse', lang: 'en', pollIntervalMs: 30_000 })
    )

    // Verify nothing called while hidden
    await act(async () => { vi.advanceTimersByTime(5_000) })
    await flushAsync()
    expect(mockGetActivity).not.toHaveBeenCalled()

    // Page becomes visible
    visibilityState = 'visible'
    await act(async () => {
      visibilityListeners.forEach((fn) => fn())
    })
    await flushAsync()

    expect(mockGetActivity).toHaveBeenCalledTimes(1)
  })
})

describe('useActivityPoll — brand config flags', () => {
  it('pundo has activityFeed=compact, naidivse has activityFeed=livefeed', async () => {
    const { pundoConfig } = await import('@/config/brands/pundo')
    const { naidivseConfig } = await import('@/config/brands/naidivse')
    expect(pundoConfig.features.activityFeed).toBe('compact')
    expect(naidivseConfig.features.activityFeed).toBe('livefeed')
    expect(pundoConfig.features.recentlyViewed).toBe('drawer')
    expect(naidivseConfig.features.recentlyViewed).toBe('home')
  })
})
