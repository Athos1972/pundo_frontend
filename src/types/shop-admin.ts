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
}

export interface OpeningHours {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  open: string
  close: string
  closed: boolean
  second_open?: string
  second_close?: string
}

export interface AdminProduct {
  id: number
  name: string
  category_id: number
  price: string
  currency: string
  unit: string
  available: boolean
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
