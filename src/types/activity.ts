// =============================================================================
// src/types/activity.ts
//
// Types for F4700 — Recently Viewed & Activity Feed.
// ActivityEvent types live here (separate from src/types/api.ts per architecture).
// =============================================================================

export type ActivityEventType =
  | 'search_performed'
  | 'price_comparison_viewed'
  | 'product_spotted'
  | 'homesick_activated'
  | 'category_browsed'
  | 'shop_language_noted'
  | 'price_alert_set'
  | 'shop_discovered'

export type BrandSlug = 'pundo' | 'naidivse'

export interface ActivityEventPayload {
  product_id?: number | null
  product_slug?: string | null
  product_name?: string | null
  shop_id?: number | null
  shop_slug?: string | null
  shop_name?: string | null
  category_id?: number | null
  category_slug?: string | null
  category_name?: string | null
  city?: string | null
  term?: string | null
  language_code?: string | null
}

export interface ActivityEvent {
  id: string
  event_type: ActivityEventType
  payload: ActivityEventPayload
  created_at: string   // ISO 8601 UTC
  lang_hint?: string | null
}

export interface ActivityResponse {
  events: ActivityEvent[]
  next_since: string | null
}

export interface RecentlyViewedEntry {
  id: number
  slug: string
  name: string                        // Name in language at tracking time (snapshot)
  image_url: string | null
  price_display?: string | null       // Only for products (formatted: "12,50 €" or "on request")
  city?: string | null                // Only for shops
  viewed_at: number                   // epoch ms
}

export interface RecentlyViewedStore {
  products: RecentlyViewedEntry[]
  shops: RecentlyViewedEntry[]
}
