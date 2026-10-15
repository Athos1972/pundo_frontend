'use client'
// Only imports from React and shop-admin types (Clean Boundary)

import { useCallback, useEffect, useRef } from 'react'
import type { ImportStatus } from '@/types/shop-admin'

export interface StartStatusPollingOptions {
  fetchStatus: () => Promise<ImportStatus | null>
  isDone: (status: ImportStatus) => boolean
  onStatus: (status: ImportStatus) => void
  onTimeout: () => void
  delaysMs?: number[]
  maxTotalMs?: number
}

export const DEFAULT_POLL_DELAYS_MS = [2000, 3000, 5000, 8000, 10000]
export const DEFAULT_POLL_MAX_TOTAL_MS = 120000

/**
 * Polls the import status with growing delays until `isDone` is true or `maxTotalMs` has passed.
 * After the last delay the last value is repeated. Only one timer is active at a time.
 * `cancel()` clears the timer and blocks any `onStatus`/`onTimeout` call, even for a fetch that is
 * still in flight.
 */
export function startStatusPolling({
  fetchStatus,
  isDone,
  onStatus,
  onTimeout,
  delaysMs = DEFAULT_POLL_DELAYS_MS,
  maxTotalMs = DEFAULT_POLL_MAX_TOTAL_MS,
}: StartStatusPollingOptions): () => void {
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let elapsed = 0
  let attempt = 0

  function schedule() {
    const delay = delaysMs[Math.min(attempt, delaysMs.length - 1)]
    attempt += 1
    timer = setTimeout(tick, delay)
    elapsed += delay
  }

  async function tick() {
    timer = null
    let status: ImportStatus | null = null
    try {
      status = await fetchStatus()
    } catch {
      status = null
    }
    if (cancelled) return
    if (status) {
      onStatus(status)
      if (isDone(status)) return
    }
    if (elapsed >= maxTotalMs) {
      onTimeout()
      return
    }
    schedule()
  }

  schedule()

  return () => {
    cancelled = true
    if (timer !== null) clearTimeout(timer)
    timer = null
  }
}

/** Hook wrapper: restarts cleanly on every `start`, cancels on unmount. */
export function useImportStatusPolling() {
  const cancelRef = useRef<(() => void) | null>(null)

  const stop = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
  }, [])

  const start = useCallback(
    (options: StartStatusPollingOptions) => {
      stop()
      cancelRef.current = startStatusPolling(options)
    },
    [stop],
  )

  useEffect(() => stop, [stop])

  return { start, stop }
}
