// =============================================================================
// src/lib/recently-viewed.ts
//
// SSR-safe localStorage wrapper for recently-viewed items (F4700).
// All functions are no-ops on the server (typeof window === 'undefined').
// Schema version guards against crashes on schema drift.
// =============================================================================

import type { RecentlyViewedEntry } from '@/types/activity'

const KEY_PRODUCTS = 'pundo.recently_viewed.products'
const KEY_SHOPS = 'pundo.recently_viewed.shops'
const KEY_VERSION = 'pundo.recently_viewed.version'
const CURRENT_VERSION = '1'
const MAX_ITEMS = 20

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readVersion(): string | null {
  try {
    return localStorage.getItem(KEY_VERSION)
  } catch {
    return null
  }
}

function ensureVersion(): boolean {
  try {
    const v = localStorage.getItem(KEY_VERSION)
    if (v !== CURRENT_VERSION) {
      // Schema mismatch — reset silently
      localStorage.removeItem(KEY_PRODUCTS)
      localStorage.removeItem(KEY_SHOPS)
      localStorage.setItem(KEY_VERSION, CURRENT_VERSION)
    }
    return true
  } catch {
    return false
  }
}

function readList(key: string): RecentlyViewedEntry[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return JSON.parse(raw) as RecentlyViewedEntry[]
  } catch {
    return []
  }
}

function writeList(key: string, list: RecentlyViewedEntry[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // Storage quota or private mode — silent degrade
  }
}

function dispatchUpdate(): void {
  try {
    window.dispatchEvent(new CustomEvent('pundo:recently-viewed'))
  } catch {
    // ignore
  }
}

/** migrate() stub — reserved for future schema upgrades. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function migrate(_fromVersion: string | null): void {
  // V1: nothing to migrate yet
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add or move-to-front a product entry. No-op on server. Silent on quota error.
 */
export function addProduct(entry: RecentlyViewedEntry): void {
  if (typeof window === 'undefined') return
  if (!ensureVersion()) return

  const list = readList(KEY_PRODUCTS)
  const existing = list.findIndex((p) => p.id === entry.id)
  if (existing !== -1) list.splice(existing, 1)

  const updated: RecentlyViewedEntry = { ...entry, viewed_at: Date.now() }
  list.unshift(updated)
  if (list.length > MAX_ITEMS) list.splice(MAX_ITEMS)

  writeList(KEY_PRODUCTS, list)
  dispatchUpdate()
}

/**
 * Add or move-to-front a shop entry. No-op on server. Silent on quota error.
 */
export function addShop(entry: RecentlyViewedEntry): void {
  if (typeof window === 'undefined') return
  if (!ensureVersion()) return

  const list = readList(KEY_SHOPS)
  const existing = list.findIndex((s) => s.id === entry.id)
  if (existing !== -1) list.splice(existing, 1)

  const updated: RecentlyViewedEntry = { ...entry, viewed_at: Date.now() }
  list.unshift(updated)
  if (list.length > MAX_ITEMS) list.splice(MAX_ITEMS)

  writeList(KEY_SHOPS, list)
  dispatchUpdate()
}

/**
 * Returns the list of recently-viewed products (newest first).
 * Returns [] on server or storage error.
 */
export function getProducts(): RecentlyViewedEntry[] {
  if (typeof window === 'undefined') return []
  const v = readVersion()
  if (v !== null && v !== CURRENT_VERSION) return []
  return readList(KEY_PRODUCTS)
}

/**
 * Returns the list of recently-viewed shops (newest first).
 * Returns [] on server or storage error.
 */
export function getShops(): RecentlyViewedEntry[] {
  if (typeof window === 'undefined') return []
  const v = readVersion()
  if (v !== null && v !== CURRENT_VERSION) return []
  return readList(KEY_SHOPS)
}

/**
 * Clears both product and shop lists. Preserves the version key.
 */
export function clear(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEY_PRODUCTS)
    localStorage.removeItem(KEY_SHOPS)
  } catch {
    // ignore
  }
  dispatchUpdate()
}
