'use client'
// T13 — Cloudflare Turnstile Widget (F6990 Phase 2)
//
// Loads the Turnstile script lazily and renders the challenge widget.
// Falls back to immediate dev-bypass when NEXT_PUBLIC_TURNSTILE_SITEKEY is
// absent (local development without Cloudflare).

import Script from 'next/script'
import { useEffect, useRef } from 'react'
import { t } from '@/lib/translations'
import { getLangFromCookie } from '@/lib/lang'

// Cloudflare Turnstile adds these to the global window object.
declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void
    onTurnstileError?: () => void
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void
  onError?: () => void
  className?: string
}

export function TurnstileWidget({ onToken, onError, className }: TurnstileWidgetProps) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY
  const lang = getLangFromCookie()
  const tr = t(lang)
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  // Dev-bypass: no sitekey configured → call onToken immediately.
  useEffect(() => {
    if (!sitekey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[TurnstileWidget] NEXT_PUBLIC_TURNSTILE_SITEKEY not set — using dev-bypass token.',
        )
        onToken('dev-bypass')
      }
    }
  // onToken is intentionally excluded from deps — we only want this to run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitekey])

  // Register global callbacks that Cloudflare Turnstile calls.
  useEffect(() => {
    if (!sitekey) return

    window.onTurnstileSuccess = (token: string) => {
      onToken(token)
    }

    window.onTurnstileError = () => {
      onError?.()
    }

    return () => {
      delete window.onTurnstileSuccess
      delete window.onTurnstileError
      // Remove the rendered widget if Turnstile API is available.
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // Ignore — widget may already be gone on hot reload.
        }
        widgetIdRef.current = null
      }
    }
  // Stable callback refs: onToken / onError change identity on every render in
  // most callers, but re-registering globals on each render is fine (cheap) and
  // ensures the latest callbacks are always used.
  }, [sitekey, onToken, onError])

  if (!sitekey) {
    // Nothing to render in dev-bypass mode.
    return null
  }

  return (
    <div className={className}>
      {/* Widget container — Cloudflare Turnstile renders an iframe into this div. */}
      <div
        ref={containerRef}
        className="cf-turnstile"
        data-sitekey={sitekey}
        data-callback="onTurnstileSuccess"
        data-error-callback="onTurnstileError"
        // RTL-compatible: no fixed text-align, let the parent decide layout.
      />

      {/* Accessible status message while the widget loads (hidden once the
          iframe appears, so we keep it as a visually-hidden hint only). */}
      <p className="sr-only" aria-live="polite">
        {tr.turnstile_loading}
      </p>

      {/* Script loaded lazily — only downloaded when the component mounts.
          Strategy lazyOnload defers until after the page is interactive.  */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
    </div>
  )
}
