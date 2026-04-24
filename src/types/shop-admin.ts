// ─── Shop-Owner Portal — TypeScript Interfaces ───────────────────────────────
// IMPORTANT: Keep this file separate from src/types/api.ts (Clean Boundary rule)
// These types must NEVER be imported from customer-facing code.

// ─── Shared Enums ────────────────────────────────────────────────────────────

export type ItemType   = 'product' | 'service'
export type ItemSource = 'scraper' | 'admin' | 'shop_manual' | 'shop_upload' | 'spotted'
export type ItemStatus = 'active' | 'inactive'

export interface ShopOwner {
  id: number
  email: string
  name: string
  status: 'pending' | 'approved' | 'rejected'
  shop_id: number
}

export interface AdminShop {
  id: number
  name: string
  description: string | null
  logo_url: string | null
  address: string | null
  location: { lat: number; lng: number } | null
  spoken_languages: string[]
  phone?: string | null
  whatsapp_number: string | null
  website_url: string | null
  webshop_url: string | null
  social_links: Record<string, string> | null
}

export interface OpeningHours {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  open: string
  close: string
  closed: boolean
  second_open?: string
  second_close?: string
}

export interface PriceUnitOption {
  code: string
  label: string
  sort_order: number
}

export interface PriceTierStep {
  id?: number
  min_quantity: number
  max_quantity?: number
  price: string
  currency: string
}

export interface PriceTier {
  id?: number
  unit: string
  unit_label_custom?: string
  steps: PriceTierStep[]
}

// ─── Item (global catalogue) ──────────────────────────────────────────────────

export interface AdminItemPhoto {
  id: number
  item_id: number
  contributed_by_shop_id: number | null
  url: string
  thumbnail_url: string | null
  sort_order: number
}

export interface AdminItem {
  id: number
  slug: string
  item_type: ItemType
  names: Record<string, string>
  descriptions: Record<string, string> | null
  category_id: number
  brand_id: number | null
  ean: string | null
  status: ItemStatus
  source: ItemSource
  photos: AdminItemPhoto[]
  created_at: string
}

// Lightweight variant for Item Picker search results
export interface ItemSearchResult {
  id: number
  slug: string
  item_type: ItemType
  name: string           // localised, single string
  category_id: number
  ean: string | null
  photo_url: string | null
}

// ─── ShopListing (junction) ───────────────────────────────────────────────────

export interface AdminShopListing {
  id: number
  item_id: number
  shop_id: number
  item: AdminItem          // embedded by backend in list responses
  available: boolean
  source: ItemSource
  sku: string | null
  shop_url: string | null
  created_at: string
}

export interface AdminShopListingList {
  items: AdminShopListing[]
  total: number
}

// ─── Offer (unified: price + optional promotional period) ────────────────────

export type PriceType = 'fixed' | 'on_request' | 'free' | 'variable'

export interface AdminOffer {
  id: number
  shop_listing_id: number
  title: string | null
  description: string | null
  price_type: PriceType
  price_tiers: PriceTier[]
  currency: string
  valid_from: string | null
  valid_until: string | null
  source: ItemSource
  offer_url: string | null
  archived: boolean
  crawled_at: string | null
  created_at: string
}

// Keep backward-compat alias so any remaining usage of `offer.title` (non-null) still works
// but the canonical type has title as string | null per the new unified model.

// ─── Deprecated types — kept for compilation of legacy components not yet removed ─
/** @deprecated Use AdminShopListing + AdminOffer instead */
export interface AdminProductImage {
  id: number
  url: string
  sort_order: number
}

/** @deprecated Use AdminShopListing + AdminOffer instead */
export interface AdminProduct {
  id: number
  name: string
  category_id: number
  available: boolean
  price_tiers: PriceTier[]
  images?: AdminProductImage[]
}

/** @deprecated Use AdminShopListingList instead */
export interface AdminProductList {
  items: AdminProduct[]
  total: number
}

export interface AdminOfferList {
  items: AdminOffer[]
  total: number
}

export interface ApiKey {
  id: number
  name: string
  scope: 'read' | 'write' | 'read_write'
  created_at: string
  last_used_at?: string
}

// Returned only on creation — key value shown once then discarded
export interface ApiKeyCreated extends ApiKey {
  key: string
}

export interface ImageDownloadError {
  product_name: string
  url: string
  reason: string
}

export interface ImportStatus {
  google_sheet_url?: string
  last_sync?: string
  last_sync_status?: 'ok' | 'error'
  last_sync_message?: string
  image_download_errors?: ImageDownloadError[]
  last_image_download_at?: string
}

export interface ImportUploadResult {
  imported: number
  errors: { row: number; message: string }[]
  image_download_pending?: number
}

// ─── Review Moderation (admin-only, never imported by customer code) ──────────

export interface AdminReviewPhoto {
  id: number
  url: string
  thumbnail_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  moderation_reason: string | null
  moderation_categories: string[] | null
}

export interface AdminReview {
  id: number
  user_id: number
  user_display_name: string
  entity_type: 'product' | 'shop'
  entity_id: number
  stars: number
  comment: string | null
  photos: AdminReviewPhoto[]
  is_visible: boolean
  created_at: string
  updated_at: string
  reporter_count: number
  last_reported_at: string | null
  invalidated_at: string | null
  invalidated_by: number | null
}

export interface AuditLogEntry {
  id: number
  review_id: number
  action: string
  actor_type: string
  actor_id: number | null
  actor_ip: string | null
  moderation_model: string | null
  moderation_confidence: number | null
  reason: string | null
  timestamp: string
}

// ─── Social-Link Moderation ───────────────────────────────────────────────────

export type SocialLinkBlockCategory =
  | 'adult'
  | 'gambling'
  | 'hate'
  | 'illegal'
  | 'malware'
  | 'shortener_unresolvable'
  | 'custom'

export interface SocialLinkBlockedError {
  error: 'social_link_blocked'
  key: string
  category: SocialLinkBlockCategory
  resolved_host?: string | null
  via_shortener?: boolean
}

export interface SocialLinkFieldError {
  category: SocialLinkBlockCategory
  resolved_host?: string | null
  via_shortener?: boolean
}
