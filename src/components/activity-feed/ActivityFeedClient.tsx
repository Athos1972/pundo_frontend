'use client'

// =============================================================================
// src/components/activity-feed/ActivityFeedClient.tsx
//
// Client-side orchestration: drives polling, selects variant.
// Receives SSR initial snapshot from ActivityFeed server wrapper.
// =============================================================================

import { useActivityPoll } from '@/lib/useActivityPoll'
import { ActivityFeedLiveFeed } from './ActivityFeedLiveFeed'
import { ActivityFeedCompact } from './ActivityFeedCompact'
import type { ActivityEvent, BrandSlug } from '@/types/activity'

interface ActivityFeedClientProps {
  brand: BrandSlug
  variant: 'livefeed' | 'compact'
  initialEvents: ActivityEvent[]
  initialNextSince: string | null
  lang: string
}

export function ActivityFeedClient({
  brand,
  variant,
  initialEvents,
  initialNextSince,
  lang,
}: ActivityFeedClientProps) {
  const { events } = useActivityPoll({
    brand,
    lang,
    initialEvents,
    initialNextSince,
  })

  if (variant === 'livefeed') {
    return <ActivityFeedLiveFeed events={events} lang={lang} />
  }

  return <ActivityFeedCompact events={events} lang={lang} />
}
