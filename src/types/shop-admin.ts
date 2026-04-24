// ─── Shop-Owner Portal — TypeScript Interfaces ───────────────────────────────
// IMPORTANT: Keep this file separate from src/types/api.ts (Clean Boundary rule)
// These types must NEVER be imported from customer-facing code.

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

export interface AdminProductImage {
  id: number
  url: string          // primary display URL (card variant)
  sort_order: number
}

export interface AdminProduct {
  id: number
  name: string
  category_id: number
  available: boolean
  price_tiers: PriceTier[]
  images?: AdminProductImage[]  // product photos, ordered by sort_order (backend defaults to [])
}

export interface AdminProductList {
  items: AdminProduct[]
  total: number
}

export interface AdminOffer {
  id: number
  title: string
  description: string
  price: string
  valid_from: string
  valid_until: string
  product_id?: number
  archived: boolean
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

export interface ImportStatus {
  google_sheet_url?: string
  last_sync?: string
  last_sync_status?: 'ok' | 'error'
  last_sync_message?: string
}

export interface ImportUploadResult {
  imported: number
  errors: { row: number; message: string }[]
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
