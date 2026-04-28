'use client'

// =============================================================================
// src/components/activity-feed/RelativeTime.tsx
//
// Hydration-safe relative time display.
// SSR: renders ISO timestamp as fallback (no mismatch).
// Client: switches to human-readable relative time after mount, updates every 30s.
// =============================================================================

import { useState, useEffect } from 'react'
import { t } from '@/lib/translations'

interface RelativeTimeProps {
  createdAt: string  // ISO 8601 UTC
  lang: string
}

function toRelative(createdAt: string, tr: ReturnType<typeof t>): string {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return tr.time_just_now
  if (diffMin < 60) return tr.time_minutes_ago(diffMin)
  const diffH = Math.floor(diffMin / 60)
  return tr.time_hours_ago(diffH)
}

export function RelativeTime({ createdAt, lang }: RelativeTimeProps) {
  const [text, setText] = useState<string | null>(null)
  const tr = t(lang)

  useEffect(() => {
    setText(toRelative(createdAt, tr))
    const id = setInterval(() => {
      setText(toRelative(createdAt, tr))
    }, 30_000)
    return () => clearInterval(id)
  // tr is derived from lang — only re-run when lang changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdAt, lang])

  // SSR: show ISO string to avoid hydration mismatch; client replaces quickly
  if (text === null) {
    return (
      <time dateTime={createdAt} className="text-xs text-text-light">
        {new Date(createdAt).toISOString().slice(0, 16).replace('T', ' ')}
      </time>
    )
  }

  return (
    <time dateTime={createdAt} className="text-xs text-text-light">
      {text}
    </time>
  )
}
