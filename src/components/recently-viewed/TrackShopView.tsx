'use client'

// =============================================================================
// src/components/recently-viewed/TrackShopView.tsx
//
// Side-effect-only component. On mount, records the shop in recently-viewed.
// Renders nothing. Must be 'use client' for useEffect access.
// =============================================================================

import { useEffect } from 'react'
import { addShop } from '@/lib/recently-viewed'

interface TrackShopViewProps {
  shop: {
    id: number
    slug: string
    name: string
    image_url: string | null
    city: string | null
  }
}

export function TrackShopView({ shop }: TrackShopViewProps) {
  useEffect(() => {
    addShop({
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      image_url: shop.image_url,
      city: shop.city,
      viewed_at: Date.now(),
    })
  // Only run once on mount — shop identity is stable for the page lifetime
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.id])

  return null
}
