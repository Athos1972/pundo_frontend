'use client'

// =============================================================================
// src/lib/useRecentlyViewed.ts
//
// React hook for reactive access to recently-viewed lists (F4700).
// Listens to both native `storage` events (cross-tab) and the custom
// `pundo:recently-viewed` event (same-tab updates).
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import type { RecentlyViewedEntry } from '@/types/activity'
import { getProducts, getShops, clear as clearStorage } from '@/lib/recently-viewed'

export interface UseRecentlyViewedResult {
  products: RecentlyViewedEntry[]
  shops: RecentlyViewedEntry[]
  clear: () => void
}

export function useRecentlyViewed(): UseRecentlyViewedResult {
  // Lazy initializer reads from localStorage on first render (client-only, safe)
  const [products, setProducts] = useState<RecentlyViewedEntry[]>(() => getProducts())
  const [shops, setShops] = useState<RecentlyViewedEntry[]>(() => getShops())

  const refresh = useCallback(() => {
    setProducts(getProducts())
    setShops(getShops())
  }, [])

  useEffect(() => {
    // Cross-tab sync via native storage event
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === null ||
        e.key.startsWith('pundo.recently_viewed')
      ) {
        refresh()
      }
    }

    // Same-tab sync via custom event
    const onCustom = () => refresh()

    window.addEventListener('storage', onStorage)
    window.addEventListener('pundo:recently-viewed', onCustom)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pundo:recently-viewed', onCustom)
    }
  }, [refresh])

  const clear = useCallback(() => {
    clearStorage()
    setProducts([])
    setShops([])
  }, [])

  return { products, shops, clear }
}
