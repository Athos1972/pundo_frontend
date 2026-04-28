'use client'

// =============================================================================
// src/components/activity-feed/ActivityFeedCompact.tsx
//
// Compact variant (pundo): 1-line cycler + expand drawer.
// Current item cycles every 6s with fade-in animation.
// Expand control reveals full list (max-h transition for smooth open/close).
// =============================================================================

import { useState, useEffect } from 'react'
import { t } from '@/lib/translations'
import { ActivityItem } from './ActivityItem'
import type { ActivityEvent } from '@/types/activity'

interface ActivityFeedCompactProps {
  events: ActivityEvent[]
  lang: string
}

export function ActivityFeedCompact({ events, lang }: ActivityFeedCompactProps) {
  const tr = t(lang)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (events.length <= 1 || expanded) return
    // Random delay between 5–11s per item so rotation feels organic, not robotic.
    // Lower bound 5200ms keeps the swap inside the visible fade-out window (starts at 5400ms).
    let id: ReturnType<typeof setTimeout>
    const schedule = () => {
      const delay = 5200 + Math.random() * 5800 // 5.2s – 11s
      id = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % events.length)
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(id)
  }, [events.length, expanded])

  if (events.length === 0) return null

  const current = events[Math.min(currentIndex, events.length - 1)]

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden">
      {/* Single-line cycler */}
      <div className="px-4 py-2 flex items-center gap-2">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div key={current.id} className="animate-fade-in">
            <ActivityItem event={current} variant="line" lang={lang} />
          </div>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? tr.activity_feed_collapse : tr.activity_feed_expand}
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-text-muted hover:text-text transition-colors p-1"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 rtl:rotate-180 ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Expandable full list */}
      <div
        className={`transition-[max-height] duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[600px]' : 'max-h-0'
        }`}
      >
        <div className="px-4 pb-3 space-y-0.5 divide-y divide-border">
          {events.map((event) => (
            <ActivityItem key={event.id} event={event} variant="line" lang={lang} />
          ))}
        </div>
      </div>
    </div>
  )
}
