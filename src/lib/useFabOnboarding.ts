'use client'

import { useState, useEffect, useRef } from 'react'

export interface UseFabOnboardingOptions {
  storageKey: string
  delayMs: number
  autoDismissMs?: number
  enabled?: boolean
}

export interface UseFabOnboardingResult {
  visible: boolean
  dismiss: () => void
}

export function useFabOnboarding({
  storageKey,
  delayMs,
  autoDismissMs,
  enabled = true,
}: UseFabOnboardingOptions): UseFabOnboardingResult {
  const [visible, setVisible] = useState(false)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function markDismissed() {
    try {
      localStorage.setItem(storageKey, '1')
    } catch {
      // localStorage may be unavailable in private/iframe contexts
    }
    setVisible(false)
  }

  useEffect(() => {
    if (!enabled) return

    let alreadyShown = false
    try {
      alreadyShown = localStorage.getItem(storageKey) === '1'
    } catch {
      // ignore
    }

    if (alreadyShown) return

    showTimerRef.current = setTimeout(() => {
      setVisible(true)

      if (autoDismissMs !== undefined) {
        dismissTimerRef.current = setTimeout(() => {
          markDismissed()
        }, autoDismissMs)
      }
    }, delayMs)

    return () => {
      if (showTimerRef.current !== null) clearTimeout(showTimerRef.current)
      if (dismissTimerRef.current !== null) clearTimeout(dismissTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, delayMs, autoDismissMs, enabled])

  return { visible, dismiss: markDismissed }
}
