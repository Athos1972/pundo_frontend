'use client'

// =============================================================================
// src/components/activity-feed/ActivityFeedLiveFeed.tsx
//
// Livefeed variant (naidivse): horizontal scrollable card row.
// 4 cards visible on desktop, ~1.5 on mobile (scroll hint).
// Animation: slide-in-from-leading is always applied; because React mounts
// each card fresh when its key (= event.id) first appears, the CSS animation
// runs once on entry. Retained cards are not re-animated.
// This avoids refs-during-render and setState-in-effect ESLint errors.
// =============================================================================

import { ActivityItem } from './ActivityItem'
import type { ActivityEvent } from '@/types/activity'

interface ActivityFeedLiveFeedProps {
  events: ActivityEvent[]
  lang: string
}

export function ActivityFeedLiveFeed({ events, lang }: ActivityFeedLiveFeedProps) {
  if (events.length === 0) return null

  return (
    <div
      className="flex gap-3 overflow-x-auto scroll-smooth scrollbar-none pb-1"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {events.map((event) => (
        <ActivityItem
          key={event.id}
          event={event}
          variant="card"
          lang={lang}
          className={[
            // Desktop: 4 visible; Mobile: ~1.5 visible (scroll hint)
            'w-[66vw] sm:w-[calc((100%-3*0.75rem)/4)]',
            'shrink-0',
            // animate-slide-in-from-leading runs once on mount (CSS animation)
            // React re-mounts element when key changes (new event.id)
            'animate-slide-in-from-leading',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
