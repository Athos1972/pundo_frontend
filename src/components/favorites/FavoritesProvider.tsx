'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession } from '@/components/auth/SessionProvider'
import type { FavoriteListItem } from '@/types/api'

interface FavoritesContextValue {
  favoriteIds: Set<number>
  isFavorite: (productId: number) => boolean
  toggleFavorite: (productId: number) => Promise<void>
  isLoading: boolean
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favoriteIds: new Set(),
  isFavorite: () => false,
  toggleFavorite: async () => {},
  isLoading: false,
})

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!session.is_authenticated) {
      queueMicrotask(() => setFavoriteIds(new Set()))
      return
    }
    async function load() {
      setIsLoading(true)
      try {
        const r = await fetch('/api/customer/favorites?limit=200&page=1')
        if (r.ok) {
          const data = await r.json()
          if (data?.items) {
            setFavoriteIds(new Set((data.items as FavoriteListItem[]).map((f: FavoriteListItem) => f.product_id)))
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [session.is_authenticated])

  const isFavorite = useCallback((productId: number) => favoriteIds.has(productId), [favoriteIds])

  const toggleFavorite = useCallback(
    async (productId: number) => {
      if (!session.is_authenticated) return
      const wasFavorite = favoriteIds.has(productId)
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (wasFavorite) next.delete(productId)
        else next.add(productId)
        return next
      })
      const res = await fetch(`/api/customer/favorites/${productId}`, {
        method: wasFavorite ? 'DELETE' : 'POST',
      })
      if (!res.ok) {
        // Rollback on failure
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          if (wasFavorite) next.add(productId)
          else next.delete(productId)
          return next
        })
      }
    },
    [favoriteIds, session.is_authenticated]
  )

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite, isLoading }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  return useContext(FavoritesContext)
}
