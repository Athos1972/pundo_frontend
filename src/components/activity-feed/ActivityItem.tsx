// =============================================================================
// src/components/activity-feed/ActivityItem.tsx
//
// Renders a single activity event. Supports 'card' (livefeed) and 'line' (compact).
// Text is built from translations — no PII, no free text from backend.
// =============================================================================

import Link from 'next/link'
import { t } from '@/lib/translations'
import { eventToColorClasses, eventToHref, eventVariant } from '@/lib/activity-events'
import { RelativeTime } from './RelativeTime'
import type { ActivityEvent } from '@/types/activity'

interface ActivityItemProps {
  event: ActivityEvent
  variant: 'card' | 'line'
  lang: string
  className?: string
}

// Map event_type to emoji icon (no external icon dependency)
const EVENT_ICONS: Record<string, string> = {
  search_performed: '🔍',
  price_comparison_viewed: '📊',
  product_spotted: '📍',
  homesick_activated: '🏠',
  category_browsed: '📂',
  shop_language_noted: '🗣',
  price_alert_set: '🔔',
  shop_discovered: '✨',
}

function getEventText(event: ActivityEvent, tr: ReturnType<typeof t>): string {
  const key = `activity_event_${event.event_type}` as keyof typeof tr
  const fn = tr[key]
  if (typeof fn === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (fn as (args: any) => string)({ ...event.payload, _v: eventVariant(event.id) })
  }
  return event.event_type
}

export function ActivityItem({ event, variant, lang, className = '' }: ActivityItemProps) {
  const tr = t(lang)
  const colors = eventToColorClasses(event)
  const href = eventToHref(event)
  const text = getEventText(event, tr)
  const icon = EVENT_ICONS[event.event_type] ?? '●'

  if (variant === 'card') {
    const inner = (
      <div
        className={`
          flex flex-col justify-between
          rounded-xl border p-3 h-[100px] shrink-0
          ${colors.bg} ${colors.border}
          ${href ? 'cursor-pointer hover:brightness-95 transition-[filter]' : ''}
          ${className}
        `}
      >
        <div className="flex items-start gap-2">
          <span className="text-base leading-none shrink-0" aria-hidden="true">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text leading-snug line-clamp-3">{text}</p>
          </div>
        </div>
        <RelativeTime createdAt={event.created_at} lang={lang} />
      </div>
    )

    if (href) {
      return <Link href={href} className="block">{inner}</Link>
    }
    return inner
  }

  // variant === 'line'
  const lineInner = (
    <div
      className={`
        flex items-center gap-2 py-1.5
        ${href ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      <span className={`text-sm ${colors.icon}`} aria-hidden="true">{icon}</span>
      <p className="text-sm text-text truncate flex-1">{text}</p>
      <RelativeTime createdAt={event.created_at} lang={lang} />
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{lineInner}</Link>
  }
  return lineInner
}
