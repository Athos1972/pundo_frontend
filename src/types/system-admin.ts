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

// Opening Hours
export interface DayHours {
  open: string
  close: string
  closed: boolean
  second_open?: string
  second_close?: string
}
/** Keys "0"–"6" = Mon–Sun */
export type OpeningHoursMap = Record<string, DayHours>

// Shops
export interface SysAdminShop {
  id: number
  name: string
  address_raw: string | null
  location: { lat: number; lng: number } | null
  opening_hours: OpeningHoursMap | null
  shop_type_id: number | null
  status: string
  phone: string | null
  website: string | null
  last_scraped: string | null
}

// Shop Types
export interface SysAdminShopType {
  id: number
  name: string
  description: string | null
}

// Shop Owners
export interface SysAdminShopOwner {
  id: number
  email: string
  name: string
  status: 'pending' | 'approved' | 'rejected'
  shop_id: number
}

// Products
export interface SysAdminProduct {
  id: number
  name: string
  slug: string
  brand_id: number | null
  category_id: number | null
}

export interface SysAdminProductAttribute {
  id: number
  product_id: number
  attribute_key: string
  attribute_value: string
  source: string
  confidence: number
  created_at: string
  updated_at: string
}

// Categories
export interface SysAdminCategory {
  id: number
  name: string
  parent_id: number | null
  level: number
  taxonomy_type: string
  child_count: number
}

export interface SysAdminCategoryAttributeDef {
  id: number
  category_id: number
  key: string
  label: string
  type: 'text' | 'number' | 'bool' | 'select'
  options: string[] | null
}

export interface SysAdminCategoryTranslation {
  id: number
  category_id: number
  language: string
  name: string
  rtl: boolean
}

// Brands
export interface SysAdminBrand {
  id: number
  name: string
  logo_url: string | null
  website: string | null
}

// Offers (scraped/admin-managed)
export interface SysAdminOffer {
  id: number
  shop_id: number
  product_id: number | null
  price: number
  currency: string
  price_type: 'fixed' | 'on_request' | 'free' | 'variable'
  is_available: boolean
  url: string | null
  sku: string | null
}

// Shop-Owner Offers (created by shop owners)
export interface SysAdminShopOwnerOffer {
  id: number
  shop_id: number
  title: string
  description: string | null
  price: string | null
  valid_from: string | null
  valid_until: string | null
  product_id: number | null
  archived: boolean
}

// API Keys
export interface SysAdminApiKey {
  id: number
  shop_owner_id: number
  name: string
  scope: 'read' | 'write' | 'read_write'
  created_at: string
  last_used_at: string | null
}
