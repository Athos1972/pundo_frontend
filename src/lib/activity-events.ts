// =============================================================================
// src/lib/activity-events.ts
//
// Pure mapping functions: event_type → color token, URL, PII assertion.
// No React imports — safe to import anywhere.
// =============================================================================

import type { ActivityEvent, ActivityEventPayload, ActivityEventType } from '@/types/activity'

// ---------------------------------------------------------------------------
// Color tokens per event type
// ---------------------------------------------------------------------------

export type EventColorToken = 'blue' | 'green' | 'terracotta' | 'gray'

const COLOR_MAP: Record<ActivityEventType, EventColorToken> = {
  search_performed: 'blue',
  price_comparison_viewed: 'blue',
  product_spotted: 'green',
  homesick_activated: 'terracotta',
  category_browsed: 'blue',
  shop_language_noted: 'gray',
  price_alert_set: 'blue',
  shop_discovered: 'green',
}

export function eventToColorToken(event: ActivityEvent): EventColorToken {
  return COLOR_MAP[event.event_type] ?? 'gray'
}

// ---------------------------------------------------------------------------
// Tailwind CSS classes per color token
// ---------------------------------------------------------------------------

const COLOR_CLASSES: Record<EventColorToken, { border: string; icon: string; bg: string }> = {
  blue:       { border: 'border-blue-200',   icon: 'text-blue-500',   bg: 'bg-blue-50' },
  green:      { border: 'border-green-200',  icon: 'text-green-600',  bg: 'bg-green-50' },
  terracotta: { border: 'border-orange-200', icon: 'text-orange-600', bg: 'bg-orange-50' },
  gray:       { border: 'border-border',     icon: 'text-text-muted', bg: 'bg-surface-alt' },
}

export function eventToColorClasses(event: ActivityEvent) {
  return COLOR_CLASSES[eventToColorToken(event)]
}

// ---------------------------------------------------------------------------
// URL builder — maps event payload to in-app navigation target
// ---------------------------------------------------------------------------

export function eventToHref(event: ActivityEvent): string | null {
  const p = event.payload
  switch (event.event_type) {
    case 'search_performed':
      if (p.search_term) return `/search?q=${encodeURIComponent(p.search_term)}`
      return '/search'
    case 'price_comparison_viewed':
      if (p.product_slug) return `/products/${p.product_slug}`
      return null
    case 'product_spotted':
      if (p.product_slug) return `/products/${p.product_slug}`
      if (p.shop_slug) return `/shops/${p.shop_slug}`
      return null
    case 'homesick_activated':
      return '/nostalgia'
    case 'category_browsed':
      if (p.category_slug) return `/search?category_slug=${encodeURIComponent(p.category_slug)}`
      return '/search'
    case 'shop_language_noted':
      if (p.shop_slug) return `/shops/${p.shop_slug}`
      return null
    case 'price_alert_set':
      if (p.product_slug) return `/products/${p.product_slug}`
      return null
    case 'shop_discovered':
      if (p.shop_slug) return `/shops/${p.shop_slug}`
      return null
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// PII assertion — strips unknown fields and warns in dev
// ---------------------------------------------------------------------------

/** Allowed payload fields — anything else is stripped (privacy guard, AC-B7, AC-B12). */
const ALLOWED_PAYLOAD_FIELDS = new Set<string>([
  'product_id', 'product_slug', 'product_name',
  'shop_id', 'shop_slug', 'shop_name',
  'category_id', 'category_slug', 'category_name',
  'city', 'search_term', 'language_code',
])

export function assertNoPii(payload: ActivityEventPayload): ActivityEventPayload {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (ALLOWED_PAYLOAD_FIELDS.has(key)) {
      cleaned[key] = value
    } else if (process.env.NODE_ENV === 'development') {
      console.warn(`[activity-events] Unknown payload field stripped: "${key}"`)
    }
  }
  return cleaned as ActivityEventPayload
}

// ---------------------------------------------------------------------------
// Translation key resolver — maps event_type to the translation function key
// ---------------------------------------------------------------------------

export function eventToTranslationKey(event: ActivityEvent): string {
  return `activity_event_${event.event_type}`
}
