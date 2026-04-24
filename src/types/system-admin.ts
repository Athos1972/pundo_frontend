// ─── System-Admin — TypeScript Interfaces ─────────────────────────────────────
// IMPORTANT: Keep this file separate from src/types/api.ts (Clean Boundary rule).
// These types must NEVER be imported from customer-facing or shop-admin code.

export interface SysAdminUser {
  id: number
  email: string
  role: 'superadmin' | 'editor'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// Opening Hours — list format: [{day: 0, ...}, ..., {day: 6, ...}], day 0=Mon..6=Sun
export interface DayHours {
  day: number
  open: string
  close: string
  closed: boolean
  second_open?: string
  second_close?: string
}

// ─── Helper ────────────────────────────────────────────────────────────────────
/** Extract a display name from a multilingual names dict (en → de → first → fallback). */
export function pickName(
  names: Record<string, string> | null | undefined,
  fallback = '—',
): string {
  if (!names) return fallback
  return names['en'] ?? names['de'] ?? Object.values(names)[0] ?? fallback
}

// ─── Shops ─────────────────────────────────────────────────────────────────────
export interface SysAdminShop {
  id: number
  slug: string
  status: string
  names: Record<string, string>
  descriptions?: Record<string, string> | null
  address_line1: string | null
  address_line2?: string | null
  city: string | null
  postal_code?: string | null
  country_code: string
  lat: number | null
  lng: number | null
  phone: string | null
  phone_alt?: string | null
  whatsapp_number: string | null
  email?: string | null
  website_url: string | null
  webshop_url?: string | null
  social_links?: Record<string, string> | null
  opening_hours: DayHours[] | null
  delivery_services?: unknown[] | null
  has_parking?: boolean | null
  has_own_delivery?: boolean | null
  is_online_only: boolean
  sells_live_animals?: boolean | null
  images?: unknown[] | null
  spoken_languages?: string[] | null
  shop_type_id: number | null
  source?: string | null
  created_at: string
  updated_at: string
}

// ─── Shop Types ────────────────────────────────────────────────────────────────
export interface SysAdminShopType {
  id: number
  canonical: string
  translations: Record<string, string>
  /** Populated by backend: translations["en"] or first available or canonical */
  name: string | null
  created_at: string
}

// ─── Shop Owners ───────────────────────────────────────────────────────────────
export interface SysAdminShopOwner {
  id: number
  email: string
  name: string
  status: 'pending' | 'approved' | 'rejected'
  shop_id: number
}

// ─── Items (was: Products) ─────────────────────────────────────────────────────
export interface SysAdminItem {
  id: number
  slug: string
  item_type: string
  status: string
  names: Record<string, string>
  descriptions?: Record<string, string> | null
  brand_id: number | null
  category_id: number | null
  ean?: string | null
}

/** @deprecated Use SysAdminItem instead */
export type SysAdminProduct = SysAdminItem

export interface SysAdminItemAttribute {
  id: number
  item_id: number
  attribute_key: string
  attribute_value: unknown
  source: string | null
  confidence: number | null
  created_at: string
  updated_at: string
}

/** @deprecated Use SysAdminItemAttribute instead */
export type SysAdminProductAttribute = SysAdminItemAttribute

// ─── Categories ────────────────────────────────────────────────────────────────
export interface SysAdminCategory {
  id: number
  parent_id: number | null
  taxonomy_type: string
  external_id: string
  level: string | null
  path: string | null
  /** Populated by backend: EN translation or first available */
  name: string | null
}

export interface SysAdminCategoryAttributeDef {
  id: number
  category_id: number
  attribute_key: string
  attribute_type: string
  allowed_values: unknown | null
  unit: string | null
  is_filterable: boolean
  display_order: number
  override_mode: string
  labels: Record<string, string>
  value_labels?: Record<string, string> | null
  created_at: string
  updated_at: string
}

export interface SysAdminCategoryTranslation {
  id: number
  category_id: number
  lang: string
  name: string
  rtl: boolean
}

// ─── Brands ────────────────────────────────────────────────────────────────────
export interface SysAdminBrand {
  id: number
  slug: string
  names: Record<string, string>
  descriptions?: Record<string, string> | null
  country_code: string | null
  homepages?: Record<string, string> | null
  logos?: Array<{ url?: string; [key: string]: unknown }> | null
  social_links?: Record<string, string> | null
  created_at: string
  updated_at: string
}

// ─── Offers (unified — covers both scraped and shop-owner offers) ─────────────
export interface SysAdminOffer {
  id: number
  shop_listing_id: number
  title: string | null
  description: string | null
  price_type: string
  price_tiers: unknown[]   // JSONB — same shape as AdminOffer.price_tiers in shop-admin.ts
  currency: string
  valid_from: string | null
  valid_until: string | null
  source: string
  offer_url: string | null
  archived: boolean
  crawled_at: string | null
  created_at: string
}

/** @deprecated SysAdminShopOwnerOffer is replaced by the unified SysAdminOffer */
export type SysAdminShopOwnerOffer = SysAdminOffer

// ─── Social-Link Rules ────────────────────────────────────────────────────────

export type SocialLinkRuleCategory =
  | 'adult' | 'gambling' | 'hate' | 'illegal' | 'malware' | 'custom'

export type SocialLinkRuleSource = 'external' | 'admin'

export interface SysAdminSocialLinkRule {
  id: number
  host: string
  category: SocialLinkRuleCategory
  source: SocialLinkRuleSource
  note: string | null
  external_batch_id: string | null
  created_at: string
}

export interface SysAdminSocialLinkRuleCreate {
  host: string
  category: SocialLinkRuleCategory
  note?: string | null
}

// ─── API Keys ─────────────────────────────────────────────────────────────────
export interface SysAdminApiKey {
  id: number
  shop_owner_id: number
  name: string
  scope: 'read' | 'write' | 'read_write'
  created_at: string
  last_used_at: string | null
}
