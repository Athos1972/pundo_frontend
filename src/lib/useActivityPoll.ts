'use client'

// =============================================================================
// src/lib/useActivityPoll.ts
//
// Polling hook for activity feed (F4700).
// Features:
//   - 30s default interval
//   - Page Visibility API: pauses when hidden, single refresh on re-focus
//   - Exponential backoff on errors: min(30s * 2^errorCount, 5min)
//   - Single in-flight guard
//   - AbortController cleanup on unmount / visibility change
//   - Deduplication by id + trim to 20 items
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ActivityEvent, BrandSlug } from '@/types/activity'
import { getActivity } from '@/lib/activity-api'
import { assertNoPii } from '@/lib/activity-events'

export interface UseActivityPollOptions {
  brand: BrandSlug
  lang: string
  initialEvents?: ActivityEvent[]
  initialNextSince?: string | null
  pollIntervalMs?: number
  maxItems?: number
}

export interface UseActivityPollResult {
  events: ActivityEvent[]
  isPolling: boolean
}

const DEFAULT_INTERVAL_MS = 30_000
const MAX_BACKOFF_MS = 5 * 60 * 1000  // 5 minutes
const MAX_ITEMS = 20

function sanitizeEvent(event: ActivityEvent): ActivityEvent {
  return { ...event, payload: assertNoPii(event.payload) }
}

function mergeEvents(
  prev: ActivityEvent[],
  incoming: ActivityEvent[],
  maxItems: number
): ActivityEvent[] {
  const existingIds = new Set(prev.map((e) => e.id))
  const fresh = incoming.filter((e) => !existingIds.has(e.id)).map(sanitizeEvent)
  return [...fresh, ...prev].slice(0, maxItems)
}

export function useActivityPoll({
  brand,
  lang,
  initialEvents = [],
  initialNextSince = null,
  pollIntervalMs = DEFAULT_INTERVAL_MS,
  maxItems = MAX_ITEMS,
}: UseActivityPollOptions): UseActivityPollResult {
  const [events, setEvents] = useState<ActivityEvent[]>(() =>
    initialEvents.map(sanitizeEvent)
  )
  const [isPolling, setIsPolling] = useState(false)

  const nextSinceRef = useRef<string | null>(initialNextSince)
  const errorCountRef = useRef(0)
  const inFlightRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pausedRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const cancelInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const doPoll = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return
    if (pausedRef.current) return

    inFlightRef.current = true
    setIsPolling(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await getActivity(
        { brand, limit: 20, since: nextSinceRef.current },
        lang,
        controller.signal
      )

      if (result.next_since) {
        nextSinceRef.current = result.next_since
      } else if (result.events.length > 0) {
        const sorted = [...result.events].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        nextSinceRef.current = sorted[0].created_at
      }

      setEvents((prev) => mergeEvents(prev, result.events, maxItems))
      errorCountRef.current = 0
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        inFlightRef.current = false
        abortRef.current = null
        setIsPolling(false)
        return
      }
      errorCountRef.current += 1
    } finally {
      if (abortRef.current === controller) {
        inFlightRef.current = false
        abortRef.current = null
        setIsPolling(false)
      }
    }
  }, [brand, lang, maxItems])

  const scheduleNext = useCallback(() => {
    clearTimer()
    const backoff = Math.min(
      pollIntervalMs * Math.pow(2, Math.max(0, errorCountRef.current - 1)),
      MAX_BACKOFF_MS
    )
    const delay = errorCountRef.current > 0 ? backoff : pollIntervalMs

    timerRef.current = setTimeout(() => {
      // If page hidden at tick time, skip — visibility handler will re-trigger
      if (!pausedRef.current) {
        doPoll().finally(scheduleNext)
      }
      // When paused, we do NOT reschedule — the visibility handler does it
    }, delay)
  }, [clearTimer, doPoll, pollIntervalMs])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pausedRef.current = true
        clearTimer()
        cancelInFlight()
        inFlightRef.current = false
      } else {
        pausedRef.current = false
        // Immediate refresh on focus, then resume normal cadence
        doPoll().finally(scheduleNext)
      }
    }

    // Start polling
    pausedRef.current = document.visibilityState === 'hidden'
    if (!pausedRef.current) {
      scheduleNext()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearTimer()
      cancelInFlight()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  // We intentionally run this only once — all values accessed via refs or stable callbacks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { events, isPolling }
}
