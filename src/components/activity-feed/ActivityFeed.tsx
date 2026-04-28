// =============================================================================
// src/components/activity-feed/ActivityFeed.tsx
//
// Server-side wrapper (RSC). Reads brand feature flag, fetches initial SSR
// snapshot (2s timeout, fail = silent), then hands off to client component.
// Renders null if feature is disabled or if SSR fetch fails on cold start.
// =============================================================================

import { t } from '@/lib/translations'
import { getActivity } from '@/lib/activity-api'
import { ActivityFeedClient } from './ActivityFeedClient'
import { LiveDot } from './LiveDot'
import type { BrandConfig } from '@/config/brands/types'

interface ActivityFeedProps {
  brand: BrandConfig
  lang: string
}

export async function ActivityFeed({ brand, lang }: ActivityFeedProps) {
  const variant = brand.features.activityFeed
  if (!variant) return null

  const tr = t(lang)

  // SSR initial fetch — 2s timeout, never blocks page render
  const initial = await getActivity(
    { brand: brand.slug as 'pundo' | 'naidivse', limit: 20 },
    lang,
    AbortSignal.timeout(2000)
  ).catch(() => ({ events: [], next_since: null }))

  // If backend is down and no initial data, hide the feed entirely
  if (initial.events.length === 0 && variant === 'compact') return null

  if (variant === 'livefeed') {
    return (
      <section
        aria-label={tr.activity_feed_heading_naidivse}
        className="py-4 px-4 sm:px-6 bg-surface border-b border-border"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <LiveDot ariaLabel={tr.live_dot_aria} />
            <h2 className="font-display text-sm font-bold text-text">
              {tr.activity_feed_heading_naidivse}
            </h2>
          </div>
          <ActivityFeedClient
            brand={brand.slug as 'pundo' | 'naidivse'}
            variant="livefeed"
            initialEvents={initial.events}
            initialNextSince={initial.next_since}
            lang={lang}
          />
          {initial.events.length === 0 && (
            <p className="text-xs text-text-muted">{tr.activity_feed_empty_soon}</p>
          )}
        </div>
      </section>
    )
  }

  // compact
  return (
    <section
      aria-label={tr.activity_feed_heading_naidivse}
      className="px-4 sm:px-6 py-2"
    >
      <div className="max-w-6xl mx-auto">
        <ActivityFeedClient
          brand={brand.slug as 'pundo' | 'naidivse'}
          variant="compact"
          initialEvents={initial.events}
          initialNextSince={initial.next_since}
          lang={lang}
        />
      </div>
    </section>
  )
}
