'use client'
// T13 — Cloudflare Turnstile Widget (F6990 Phase 2)
//
// Loads the Turnstile script lazily and renders the challenge widget.
// Falls back to immediate dev-bypass when NEXT_PUBLIC_TURNSTILE_SITEKEY is
// absent (local development without Cloudflare).

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
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
  const [tokenReceived, setTokenReceived] = useState(false)

  // No sitekey: dev-bypass in development, signal error in production.
  useEffect(() => {
    if (!sitekey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[TurnstileWidget] NEXT_PUBLIC_TURNSTILE_SITEKEY not set — using dev-bypass token.',
        )
        onToken('dev-bypass')
      } else {
        console.error(
          '[TurnstileWidget] NEXT_PUBLIC_TURNSTILE_SITEKEY is not set in production — CAPTCHA cannot render, forms will be blocked.',
        )
        onError?.()
      }
    }
  // onToken/onError intentionally excluded — run once on mount only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitekey])

  // Register global callbacks that Cloudflare Turnstile calls.
  useEffect(() => {
    if (!sitekey) return

    window.onTurnstileSuccess = (token: string) => {
      setTokenReceived(true)
      onToken(token)
    }

    window.onTurnstileError = () => {
      onError?.()
    }

    return () => {
      delete window.onTurnstileSuccess
      delete window.onTurnstileError
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // Ignore — widget may already be gone on hot reload.
        }
        widgetIdRef.current = null
      }
    }
  // Stable callback refs: re-registering globals on each render is fine (cheap)
  // and ensures the latest callbacks are always used.
  }, [sitekey, onToken, onError])

  if (!sitekey) {
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
      />

      {/* Visible loading hint until the widget issues a token. Hidden once ready. */}
      {!tokenReceived && (
        <p className="text-xs text-text-muted mt-1" aria-live="polite">
          {tr.turnstile_loading}
        </p>
      )}

      {/* afterInteractive ensures the script loads as soon as the page hydrates,
          avoiding a race where a fast user submits before the widget is ready. */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
    </div>
  )
}
